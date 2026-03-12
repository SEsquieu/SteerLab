import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildSkeletonValidationReport,
  ensureDirectory,
  extractJsonObject,
  fail,
  loadStructuredFile,
  validateScenarioSkeleton,
  writeSkeleton,
} from "./lib.mjs";

const rootDir = process.cwd();

function parseArgs(argv) {
  const options = {
    model: "qwen3.5:4b",
    pack: "",
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
    fail("Usage: node scripts/generation/ollama-skeleton.mjs <request.yaml> --pack <pack.yaml> [--model qwen3.5:4b]");
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
    skeleton_id: "string",
    request_ref: "string",
    specialty_pack_ref: packPath.replace(/\\/g, "/"),
    generated_at: "ISO-8601 timestamp",
    challenge_outline: {
      title: "string",
      archetype: request.archetype,
      category: "string",
      description: "string",
      context: "string",
      difficulty: request.difficulty,
      estimated_time_minutes: request.estimated_time_minutes,
      tags: ["string"],
    },
    artifact_plan: [
      {
        path: "artifacts/example.log",
        kind: "log",
        purpose: "string",
        evidentiary_role: "string",
      },
    ],
    generator_metadata: {
      provider: "ollama",
      model: "string",
      run_id: "string",
    },
  };

  const packSubset = {
    id: pack.id,
    title: pack.title,
    summary: pack.summary,
    supported_archetypes: pack.supported_archetypes,
    system_patterns: pack.system_patterns,
    artifact_guidance: pack.artifact_guidance,
    realism_rules: pack.realism_rules,
    anti_patterns: pack.anti_patterns,
    common_failure_modes: pack.common_failure_modes ?? [],
    tag_catalog: pack.tag_catalog ?? [],
  };

  return `
You are generating a SteerLab ScenarioSkeleton.

Return ONLY valid JSON.
Do not include markdown fences.
Do not include commentary.
Do not include a wrapper object.

Return a single JSON object matching this shape exactly:
${JSON.stringify(promptShape, null, 2)}

Hard requirements:
- challenge_outline.archetype must be "${request.archetype}"
- challenge_outline.difficulty must be "${request.difficulty}"
- challenge_outline.estimated_time_minutes must be ${request.estimated_time_minutes}
- specialty_pack_ref must be "${packPath.replace(/\\/g, "/")}"
- artifact_plan must respect the request artifact budget
- each artifact path must start with "artifacts/"
- each artifact must have a distinct evidentiary role
- keep the scenario realistic and serious
- avoid giving away the root cause in the context
- make the artifact plan strong enough to support later full challenge generation

Normalized request:
${JSON.stringify(request, null, 2)}

Specialty pack guidance:
${JSON.stringify(packSubset, null, 2)}
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
  const archetype = String(request.archetype ?? "skeleton");
  const specialty = String(request.specialty ?? "generic");
  return `${archetype}-${specialty}-${stamp}`;
}

function writeRawOutput(runId, prompt, rawOutput) {
  const rawDir = path.join(rootDir, "generated", "raw", runId, "skeleton");
  ensureDirectory(rawDir);
  fs.writeFileSync(path.join(rawDir, "skeleton-prompt.txt"), prompt, "utf8");
  fs.writeFileSync(path.join(rawDir, "skeleton-response.txt"), rawOutput, "utf8");
  return rawDir;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { request, pack } = loadInputs(options.requestPath, options.pack);
  const prompt = buildPrompt(request, pack, options.pack);
  const rawOutput = runOllama(options.model, prompt);
  const runId = fallbackRunId(request);
  const rawDir = writeRawOutput(runId, prompt, rawOutput);
  const extraction = extractJsonObject(rawOutput);
  const skeleton = extraction.parsed;

  skeleton.generator_metadata = {
    ...(skeleton.generator_metadata ?? {}),
    provider: "ollama",
    model: options.model,
    run_id: runId,
  };

  validateScenarioSkeleton(skeleton);

  const envelope = {
    request,
    scenario_skeleton: skeleton,
    validation_report: buildSkeletonValidationReport({
      skeleton,
      request,
      pack,
    }),
  };

  const outputDir = writeSkeleton(rootDir, envelope, options.requestPath);

  console.log(`Wrote raw skeleton output to ${path.relative(rootDir, rawDir)}`);
  console.log(`Wrote generated skeleton to ${path.relative(rootDir, outputDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
