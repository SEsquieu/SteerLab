import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildValidationReport,
  ensureDirectory,
  extractJsonObject,
  fail,
  loadStructuredFile,
  pathExists,
  readYamlFile,
  validateDraftPackage,
  validateScenarioSkeleton,
  writeDraft,
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

  if (!options.skeletonDir && positional.length > 0) {
    options.skeletonDir = positional[0];
  }

  if (!options.pack && positional.length > 1) {
    options.pack = positional[1];
  }

  if (options.model === "qwen3.5:4b" && positional.length > 2) {
    options.model = positional[2];
  }

  if (!options.skeletonDir) {
    fail("Usage: node scripts/generation/ollama-draft-from-skeleton.mjs <generated-skeleton-dir> --pack <pack.yaml> [--model qwen3.5:4b]");
  }

  if (!options.pack) {
    fail("A specialty pack is required. Use --pack specialties/<name>/pack.yaml");
  }

  return options;
}

function loadInputs(skeletonDirArg, packPath) {
  const skeletonDir = path.resolve(rootDir, skeletonDirArg);

  if (!pathExists(skeletonDir)) {
    fail(`Skeleton directory does not exist: ${skeletonDirArg}`);
  }

  const skeleton = readYamlFile(path.join(skeletonDir, "skeleton.yaml"));
  const request = readYamlFile(path.join(skeletonDir, "request.yaml"));
  const metadata = readYamlFile(path.join(skeletonDir, "metadata.yaml"));
  const validationReport = readYamlFile(path.join(skeletonDir, "validation-report.yaml"));
  const pack = loadStructuredFile(rootDir, packPath);

  if (validationReport?.overall_recommendation === "reject") {
    fail("Scenario skeleton was rejected and cannot be used to generate a full draft.");
  }

  validateScenarioSkeleton(skeleton);

  return {
    skeletonDir,
    skeleton,
    request,
    metadata,
    pack,
  };
}

function buildPrompt(request, skeleton, pack, packPath) {
  const promptShape = {
    challenge_id: "string",
    request_ref: skeleton.request_ref,
    specialty_pack_ref: packPath.replace(/\\/g, "/"),
    generated_at: "ISO-8601 timestamp",
    challenge_definition: {
      id: "must match challenge_id",
      title: skeleton.challenge_outline.title,
      archetype: skeleton.challenge_outline.archetype,
      category: skeleton.challenge_outline.category,
      description: skeleton.challenge_outline.description,
      context: skeleton.challenge_outline.context,
      supplied_artifacts: skeleton.artifact_plan.map((artifact) => ({
        path: artifact.path,
        kind: artifact.kind,
        purpose: artifact.purpose,
      })),
      candidate_instructions: ["string"],
      evaluation_signals: ["string"],
      difficulty: skeleton.challenge_outline.difficulty,
      estimated_time_minutes: skeleton.challenge_outline.estimated_time_minutes,
      tags: skeleton.challenge_outline.tags ?? ["string"],
      training_support: request.intended_mode === "training"
        ? {
            reflection_prompts: ["string"],
            thinking_checklist: ["string"],
            checkpoints: [{ id: "string", title: "string", prompt: "string" }],
            hints: [{ title: "string", content: "string" }],
          }
        : undefined,
    },
    artifacts: skeleton.artifact_plan.map((artifact) => ({
      path: artifact.path,
      kind: artifact.kind,
      purpose: artifact.purpose,
      content: "string",
    })),
  };

  const packSubset = {
    id: pack.id,
    title: pack.title,
    summary: pack.summary,
    artifact_guidance: pack.artifact_guidance,
    common_failure_modes: pack.common_failure_modes ?? [],
    evaluation_heuristics: pack.evaluation_heuristics ?? [],
    training_heuristics: pack.training_heuristics ?? [],
    anti_patterns: pack.anti_patterns,
  };

  return `
You are expanding an approved SteerLab ScenarioSkeleton into a full DraftChallengePackage.

Return ONLY valid JSON.
Do not include markdown fences.
Do not include commentary.
Do not include a wrapper object.

Return a single JSON object matching this shape exactly:
${JSON.stringify(promptShape, null, 2)}

Hard requirements:
- preserve the scenario skeleton framing
- preserve the artifact plan paths, kinds, and purposes exactly
- challenge_id must equal challenge_definition.id
- challenge_definition.archetype must be "${request.archetype}"
- challenge_definition.difficulty must be "${request.difficulty}"
- challenge_definition.estimated_time_minutes must be ${request.estimated_time_minutes}
- specialty_pack_ref must be "${packPath.replace(/\\/g, "/")}"
- each artifact content must reinforce the scenario without fully solving it
- candidate instructions and evaluation signals must be anchored to the named artifacts
- keep the scenario realistic and serious
- avoid gimmicks and toy examples

Normalized request:
${JSON.stringify(request, null, 2)}

Approved scenario skeleton:
${JSON.stringify(skeleton, null, 2)}

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
  const archetype = String(request.archetype ?? "draft");
  const specialty = String(request.specialty ?? "generic");
  return `${archetype}-${specialty}-${stamp}`;
}

function writeRawOutput(runId, prompt, rawOutput) {
  const rawDir = path.join(rootDir, "generated", "raw", runId, "draft-from-skeleton");
  ensureDirectory(rawDir);
  fs.writeFileSync(path.join(rawDir, "draft-prompt.txt"), prompt, "utf8");
  fs.writeFileSync(path.join(rawDir, "draft-response.txt"), rawOutput, "utf8");
  return rawDir;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { skeletonDir, skeleton, request, pack } = loadInputs(options.skeletonDir, options.pack);
  const prompt = buildPrompt(request, skeleton, pack, options.pack);
  const rawOutput = runOllama(options.model, prompt);
  const runId = fallbackRunId(request);
  const rawDir = writeRawOutput(runId, prompt, rawOutput);
  const extraction = extractJsonObject(rawOutput);
  const draftPackage = extraction.parsed;

  draftPackage.run_id = runId;
  draftPackage.request_ref = skeleton.request_ref;
  draftPackage.specialty_pack_ref = options.pack.replace(/\\/g, "/");
  draftPackage.generator_metadata = {
    ...(draftPackage.generator_metadata ?? {}),
    provider: "ollama",
    model: options.model,
    run_id: runId,
    skeleton_source: path.relative(rootDir, skeletonDir).replace(/\\/g, "/"),
  };

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

  const outputDir = writeDraft(rootDir, envelope, path.join(path.relative(rootDir, skeletonDir), "skeleton.yaml"));

  console.log(`Wrote raw draft output to ${path.relative(rootDir, rawDir)}`);
  console.log(`Wrote generated draft to ${path.relative(rootDir, outputDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
