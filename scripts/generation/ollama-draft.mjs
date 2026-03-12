import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "../../apps/runner/node_modules/js-yaml/dist/js-yaml.mjs";
import {
  buildValidationReport,
  ensureDirectory,
  extractJsonObject,
  fail,
  loadStructuredFile,
  validateDraftPackage,
  writeDraft,
} from "./lib.mjs";

const rootDir = process.cwd();

function parseArgs(argv) {
  const options = {
    model: "qwen3.5:4b",
    pack: "",
    repairWithModel: false,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--model") {
      options.model = argv[index + 1] ?? options.model;
      index += 1;
      continue;
    }

    if (value === "--pack") {
      options.pack = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (value === "--repair-with-model") {
      options.repairWithModel = true;
      continue;
    }

    positional.push(value);
  }

  if (!options.requestPath && positional.length > 0) {
    options.requestPath = positional[0];
  }

  if (!options.pack && positional.length > 1) {
    options.pack = positional[1];
  }

  if (options.model === "qwen3.5:4b" && positional.length > 2) {
    options.model = positional[2];
  }

  if (!options.requestPath) {
    fail("Usage: node scripts/generation/ollama-draft.mjs <request.yaml> --pack <pack.yaml> [--model qwen3.5:4b]");
  }

  if (!options.pack) {
    fail("A specialty pack is required. Use --pack specialties/<name>/pack.yaml");
  }

  return options;
}

function loadInputs(requestPath, packPath) {
  const request = loadStructuredFile(rootDir, requestPath);
  const pack = loadStructuredFile(rootDir, packPath);

  if (!request || typeof request !== "object" || Array.isArray(request)) {
    fail("Request file must contain a structured object.");
  }

  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    fail("Pack file must contain a structured object.");
  }

  return { request, pack };
}

function buildPrompt(request, pack, packPath) {
  const promptShape = {
    challenge_id: "string",
    request_ref: "string",
    specialty_pack_ref: packPath,
    generated_at: "ISO-8601 timestamp",
    challenge_definition: {
      id: "must match challenge_id",
      title: "string",
      archetype: request.archetype,
      category: "string",
      description: "string",
      context: "string",
      supplied_artifacts: [
        { path: "artifacts/example.log", kind: "log", purpose: "string" },
      ],
      candidate_instructions: ["string"],
      evaluation_signals: ["string"],
      difficulty: request.difficulty,
      estimated_time_minutes: request.estimated_time_minutes,
      tags: ["string"],
      training_support: request.intended_mode === "training"
        ? {
            reflection_prompts: ["string"],
            thinking_checklist: ["string"],
            checkpoints: [{ id: "string", title: "string", prompt: "string" }],
            hints: [{ title: "string", content: "string" }],
          }
        : undefined,
    },
    artifacts: [
      {
        path: "artifacts/example.log",
        kind: "log",
        purpose: "string",
        content: "string",
      },
    ],
  };

  return `
You are drafting a SteerLab challenge package.

Return ONLY valid JSON.
Do not include markdown fences.
Do not include commentary.
Do not include a wrapper object.

You must return a single JSON object matching this DraftChallengePackage shape:
${JSON.stringify(promptShape, null, 2)}

Hard requirements:
- challenge_id must equal challenge_definition.id
- challenge_definition.archetype must be "${request.archetype}"
- challenge_definition.difficulty must be "${request.difficulty}"
- challenge_definition.estimated_time_minutes must be ${request.estimated_time_minutes}
- specialty_pack_ref must be "${packPath.replace(/\\/g, "/")}"
- supplied_artifacts must correspond exactly to artifacts entries by path/kind/purpose
- all artifact paths must live under "artifacts/"
- keep the scenario realistic and serious
- avoid gimmicks and toy examples
- use the specialty pack guidance
- if intended_mode is "training", include useful training_support scaffolds without giving away the answer

Normalized request:
${JSON.stringify(request, null, 2)}

Specialty pack:
${JSON.stringify(pack, null, 2)}
`.trim();
}

function buildRepairPrompt(candidate) {
  return `
You are repairing malformed JSON.

Return ONLY valid JSON.
Do not include commentary.
Do not include markdown fences.
Do not include explanations.

Preserve the existing content and structure as much as possible.
Fix only the JSON syntax and minimal structural issues required for parsing.

Malformed JSON candidate:
${candidate}
`.trim();
}

function runOllama(model, prompt) {
  const result = spawnSync("ollama", ["run", model], {
    cwd: rootDir,
    encoding: "utf8",
    input: `${prompt}\n`,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    fail(`Failed to execute ollama: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(result.stderr?.trim() || `ollama run exited with status ${result.status}`);
  }

  return result.stdout ?? "";
}

function fallbackRunId(request) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archetype = String(request.archetype ?? "draft");
  const specialty = String(request.specialty ?? "generic");
  return `${archetype}-${specialty}-${stamp}`;
}

function writeRawOutput(runId, prompt, rawOutput) {
  const rawDir = path.join(rootDir, "generated", "raw", runId);
  ensureDirectory(rawDir);
  fs.writeFileSync(path.join(rawDir, "prompt.txt"), prompt, "utf8");
  fs.writeFileSync(path.join(rawDir, "response.txt"), rawOutput, "utf8");
  return rawDir;
}

function writeTextFile(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

function attemptParse(rawOutput, rawDir) {
  try {
    return extractJsonObject(rawOutput);
  } catch (error) {
    writeTextFile(path.join(rawDir, "parse-error.txt"), String(error.message ?? error));
    throw error;
  }
}

function repairJsonWithModel(model, candidate, rawDir) {
  const repairPrompt = buildRepairPrompt(candidate);
  writeTextFile(path.join(rawDir, "repair-prompt.txt"), repairPrompt);
  const repairOutput = runOllama(model, repairPrompt);
  writeTextFile(path.join(rawDir, "repair-response.txt"), repairOutput);
  return extractJsonObject(repairOutput);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { request, pack } = loadInputs(options.requestPath, options.pack);
  const prompt = buildPrompt(request, pack, options.pack);
  const rawOutput = runOllama(options.model, prompt);
  const rawRunId = fallbackRunId(request);
  const rawDir = writeRawOutput(rawRunId, prompt, rawOutput);
  let extraction;

  try {
    extraction = attemptParse(rawOutput, rawDir);
  } catch (error) {
    if (!options.repairWithModel) {
      throw error;
    }

    const rawCandidate = rawOutput
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    extraction = repairJsonWithModel(options.model, rawCandidate, rawDir);
  }

  const draftPackage = extraction.parsed;
  draftPackage.run_id = rawRunId;

  validateDraftPackage(draftPackage);

  const envelope = {
    request,
    draft_package: draftPackage,
    validation_report: buildValidationReport({
      draftPackage,
      request,
      pack,
    }),
  };

  const outputDir = writeDraft(rootDir, envelope, options.requestPath);

  console.log(`Wrote raw model output to ${path.relative(rootDir, rawDir)}`);
  console.log(`Wrote generated draft to ${path.relative(rootDir, outputDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
