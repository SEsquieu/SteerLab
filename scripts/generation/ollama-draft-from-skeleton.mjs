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
    artifacts: skeleton.artifact_plan.map((artifact) => ({
      path: artifact.path,
      content: "string",
    })),
    candidate_instructions: ["string"],
    evaluation_signals: ["string"],
    training_support: request.intended_mode === "training"
      ? {
          reflection_prompts: ["string"],
          thinking_checklist: ["string"],
          checkpoints: [{ id: "string", title: "string", prompt: "string" }],
          hints: [{ title: "string", content: "string" }],
        }
      : undefined,
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
You are expanding an approved SteerLab ScenarioSkeleton into the creative content for a DraftChallengePackage.

Return ONLY valid JSON.
Do not include markdown fences.
Do not include commentary.
Do not include a wrapper object.

Return a single JSON object matching this shape exactly:
${JSON.stringify(promptShape, null, 2)}

Hard requirements:
- preserve the scenario skeleton framing
- preserve the artifact plan paths exactly
- each artifact content must reinforce the scenario without fully solving it
- candidate instructions and evaluation signals must be anchored to the named artifacts
- keep the scenario realistic and serious
- avoid gimmicks and toy examples
- do not return fields that are already fixed by the scenario skeleton
- keep artifact contents concise but evidence-rich

Normalized request:
${JSON.stringify(request, null, 2)}

Approved scenario skeleton:
${JSON.stringify(skeleton, null, 2)}

Specialty pack guidance:
${JSON.stringify(packSubset, null, 2)}
`.trim();
}

function assembleDraftPackage(payload, skeleton, request, packPath, options, skeletonDir, runId) {
  const artifactPlan = skeleton.artifact_plan ?? [];
  const artifactMap = new Map((payload.artifacts ?? []).map((artifact) => [artifact.path, artifact]));

  const artifacts = artifactPlan.map((artifact) => ({
    path: artifact.path,
    kind: artifact.kind,
    purpose: artifact.purpose,
    content: String(artifactMap.get(artifact.path)?.content ?? ""),
  }));

  return {
    run_id: runId,
    challenge_id: skeleton.skeleton_id,
    request_ref: skeleton.request_ref,
    specialty_pack_ref: packPath.replace(/\\/g, "/"),
    generated_at: new Date().toISOString(),
    challenge_definition: {
      id: skeleton.skeleton_id,
      title: skeleton.challenge_outline.title,
      archetype: skeleton.challenge_outline.archetype,
      category: skeleton.challenge_outline.category,
      description: skeleton.challenge_outline.description,
      context: skeleton.challenge_outline.context,
      supplied_artifacts: artifactPlan.map((artifact) => ({
        path: artifact.path,
        kind: artifact.kind,
        purpose: artifact.purpose,
      })),
      candidate_instructions: payload.candidate_instructions ?? [],
      evaluation_signals: payload.evaluation_signals ?? [],
      difficulty: skeleton.challenge_outline.difficulty,
      estimated_time_minutes: skeleton.challenge_outline.estimated_time_minutes,
      tags: skeleton.challenge_outline.tags ?? [],
      training_support: request.intended_mode === "training" ? payload.training_support ?? {} : undefined,
    },
    artifacts,
    generator_metadata: {
      provider: "ollama",
      model: options.model,
      run_id: runId,
      skeleton_source: path.relative(rootDir, skeletonDir).replace(/\\/g, "/"),
    },
  };
}

function validateCreativePayload(payload, skeleton, request) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail("Model output must be an object.");
  }

  if (!Array.isArray(payload.artifacts)) {
    fail("Model output must include an `artifacts` array.");
  }

  const expectedPaths = new Set((skeleton.artifact_plan ?? []).map((artifact) => artifact.path));
  for (const artifact of payload.artifacts) {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      fail("Each generated artifact payload entry must be an object.");
    }

    if (!expectedPaths.has(artifact.path)) {
      fail(`Generated artifact payload contains unexpected path: ${artifact.path}`);
    }

    if (typeof artifact.content !== "string") {
      fail(`Generated artifact payload is missing string content for ${artifact.path}`);
    }
  }

  if (!Array.isArray(payload.candidate_instructions) || payload.candidate_instructions.length === 0) {
    fail("Model output must include non-empty `candidate_instructions`.");
  }

  if (!Array.isArray(payload.evaluation_signals) || payload.evaluation_signals.length === 0) {
    fail("Model output must include non-empty `evaluation_signals`.");
  }

  if (request.intended_mode === "training" && payload.training_support !== undefined
    && (typeof payload.training_support !== "object" || Array.isArray(payload.training_support))) {
    fail("`training_support` must be an object when provided.");
  }
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
  const payload = extraction.parsed;
  validateCreativePayload(payload, skeleton, request);
  const draftPackage = assembleDraftPackage(payload, skeleton, request, options.pack, options, skeletonDir, runId);

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
