import fs from "node:fs";
import path from "node:path";
import {
  buildValidationReport,
  ensureDirectory,
  fail,
  loadStructuredFile,
  slugify,
  writeDraft,
  writeYamlFile,
} from "./lib.mjs";
import { createProvider } from "./provider.mjs";
import {
  buildArtifactPlanPrompt,
  buildArtifactPrompt,
  buildContextPrompt,
  buildEvaluationPrompt,
  buildSeedPrompt,
  defaultArtifactPurpose,
} from "./prompt-templates.mjs";
import { createTimingCollector } from "./timing.mjs";

const rootDir = process.cwd();

const stageNames = {
  seed: "01-seed",
  skeleton: "02-skeleton",
  context: "03-context",
  artifactPlan: "04-artifact-plan",
  artifacts: "05-artifacts",
  evaluation: "06-evaluation",
};

const artifactKindToName = {
  log: "event_log",
  config: "service_config",
  yaml: "service_config",
  json: "service_config",
  markdown: "field_summary",
  trace: "runtime_trace",
  text: "notes",
  code: "snippet",
};

function parseArgs(argv) {
  const options = {
    model: "qwen3.5:4b",
    provider: "ollama",
    mode: "full",
    autoRepair: false,
    think: null,
    hideThinking: false,
    host: null,
    temperature: null,
    topP: null,
    topK: null,
    minP: null,
    presencePenalty: null,
    repetitionPenalty: null,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token.startsWith("--hidethinking=") || token.startsWith("--hide-thinking=")) {
      const [, rawValue] = token.split("=", 2);
      options.hideThinking = ["true", "1", "yes", "on"].includes(String(rawValue).trim().toLowerCase());
      continue;
    }

    if (token === "--model") {
      options.model = argv[index + 1] ?? options.model;
      index += 1;
      continue;
    }

    if (token === "--provider") {
      options.provider = argv[index + 1] ?? options.provider;
      index += 1;
      continue;
    }

    if (token === "--host" || token === "--ollama-host") {
      options.host = argv[index + 1] ?? options.host;
      index += 1;
      continue;
    }

    if (token === "--pack") {
      options.packPath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (token === "--mode") {
      options.mode = argv[index + 1] ?? options.mode;
      index += 1;
      continue;
    }

    if (token === "--auto-repair") {
      options.autoRepair = true;
      continue;
    }

    if (token === "--think") {
      options.think = argv[index + 1] ?? options.think;
      index += 1;
      continue;
    }

    if (token === "--temperature") {
      options.temperature = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--top-p") {
      options.topP = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--top-k") {
      options.topK = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--min-p") {
      options.minP = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--presence-penalty") {
      options.presencePenalty = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--repetition-penalty") {
      options.repetitionPenalty = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--hidethinking" || token === "--hide-thinking") {
      const nextToken = String(argv[index + 1] ?? "").trim().toLowerCase();
      if (["true", "false", "1", "0", "yes", "no", "on", "off"].includes(nextToken)) {
        options.hideThinking = ["true", "1", "yes", "on"].includes(nextToken);
        index += 1;
      } else {
        options.hideThinking = true;
      }
      continue;
    }

    positional.push(token);
  }

  if (!options.requestPath && positional.length > 0) {
    options.requestPath = positional[0];
  }

  if (!options.packPath && positional.length > 1) {
    options.packPath = positional[1];
  }

  if (options.model === "qwen3.5:4b" && positional.length > 2) {
    options.model = positional[2];
  }

  if (options.mode === "full" && positional.length > 3) {
    options.mode = positional[3];
  }

  const trailingPositionals = positional.slice(4).map((token) => String(token).trim());

  if (options.think === null) {
    const thinkToken = trailingPositionals.find((token) =>
      ["true", "false", "low", "medium", "high"].includes(token.toLowerCase()));
    if (thinkToken) {
      options.think = thinkToken;
    }
  }

  if (!options.hideThinking) {
    options.hideThinking = trailingPositionals.some((token) =>
      ["hidethinking", "hide-thinking", "hide_thinking"].includes(token.toLowerCase()));
  }

  const numericPositionals = trailingPositionals.filter((token) => /^-?\d+(?:\.\d+)?$/.test(token));
  if (options.temperature === null && numericPositionals.length > 0) {
    options.temperature = Number(numericPositionals[0]);
  }
  if (options.topP === null && numericPositionals.length > 1) {
    options.topP = Number(numericPositionals[1]);
  }
  if (options.topK === null && numericPositionals.length > 2) {
    options.topK = Number(numericPositionals[2]);
  }
  if (options.minP === null && numericPositionals.length > 3) {
    options.minP = Number(numericPositionals[3]);
  }
  if (options.presencePenalty === null && numericPositionals.length > 4) {
    options.presencePenalty = Number(numericPositionals[4]);
  }
  if (options.repetitionPenalty === null && numericPositionals.length > 5) {
    options.repetitionPenalty = Number(numericPositionals[5]);
  }

  if (!options.requestPath) {
    fail("Usage: node scripts/generation/generate-challenge.mjs <request.yaml> --pack <pack.yaml> [--provider ollama] [--model qwen3.5:4b] [--mode fast|full] [--think false|low|medium|high] [--hide-thinking true|false] [--temperature N] [--top-p N] [--top-k N] [--min-p N] [--presence-penalty N] [--repetition-penalty N] [--auto-repair]");
  }

  if (!options.packPath) {
    fail("A specialty pack is required. Use --pack specialties/<name>/pack.yaml");
  }

  if (!["fast", "full"].includes(options.mode)) {
    fail("Mode must be one of: fast, full");
  }

  return options;
}

function fallbackRunId(request) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${request.archetype}-${request.specialty}-${stamp}`;
}

function buildPipelineDir(runId) {
  return path.join(rootDir, "generated", "pipeline", runId);
}

function createSessionLogger(pipelineDir) {
  const sessionLogPath = path.join(pipelineDir, "session.log");

  function formatTimestamp() {
    return new Date().toISOString();
  }

  function append(line) {
    fs.appendFileSync(sessionLogPath, `${line}\n`, "utf8");
  }

  return {
    sessionLogPath,
    line(message) {
      append(`[${formatTimestamp()}] ${message}`);
    },
    stageStart(name, detail = "") {
      append(`[${formatTimestamp()}] START ${name}${detail ? ` | ${detail}` : ""}`);
    },
    stageComplete(name, durationMs, detail = "") {
      append(
        `[${formatTimestamp()}] DONE  ${name} | ${Math.round(durationMs)}ms${detail ? ` | ${detail}` : ""}`,
      );
    },
    stageFail(name, error) {
      append(`[${formatTimestamp()}] FAIL  ${name} | ${error.message ?? error}`);
    },
  };
}

function writeStageYaml(pipelineDir, stageName, fileName, value) {
  const stageDir = path.join(pipelineDir, "stages", stageName);
  ensureDirectory(stageDir);
  writeYamlFile(path.join(stageDir, fileName), value);
}

function writeStageStatus(pipelineDir, stageName, status) {
  const stageDir = path.join(pipelineDir, "stages", stageName);
  ensureDirectory(stageDir);
  writeYamlFile(path.join(stageDir, "stage-status.yaml"), status);
}

function normalizeArtifactKinds(seedArtifactPlan, request) {
  const ordered = [
    ...(seedArtifactPlan ?? []),
    ...(request.artifact_profile.required_kinds ?? []),
    ...(request.artifact_profile.preferred_kinds ?? []),
  ]
    .map((kind) => String(kind).trim().toLowerCase())
    .filter(Boolean);

  const deduped = ordered.filter((kind, index) => ordered.indexOf(kind) === index);
  return deduped.slice(0, request.artifact_profile.max_artifacts);
}

function artifactPathForKind(kind, issueClass, index) {
  const base = artifactKindToName[kind] ?? `artifact_${index + 1}`;
  const ext = kind === "markdown" ? "md" : kind === "yaml" ? "yaml" : kind === "json" ? "json" : kind === "code" ? "txt" : kind === "trace" ? "txt" : kind === "config" ? "yaml" : kind === "log" ? "txt" : "txt";
  return `artifacts/${base}.${ext}`;
}

function buildScaffoldPlan(request, mode) {
  const depth = request.training_support_depth ?? "standard";

  if (mode === "fast") {
    return {
      reflection_prompt_count: 2,
      checklist_count: 3,
      checkpoint_count: 2,
      hint_count: 1,
    };
  }

  if (depth === "deep") {
    return {
      reflection_prompt_count: 3,
      checklist_count: 4,
      checkpoint_count: 3,
      hint_count: 2,
    };
  }

  return {
    reflection_prompt_count: 2,
    checklist_count: 3,
    checkpoint_count: 2,
    hint_count: 2,
  };
}

function buildSkeletonFromSeed({ seed, request, packPath, runId, mode }) {
  const issueClass = slugify(seed.issue_class || request.specialty || "issue");
  const title = String(seed.title ?? "").trim();
  const premise = String(seed.premise ?? "").trim();
  const artifactKinds = normalizeArtifactKinds(seed.artifact_plan, request);

  if (!title || !premise || artifactKinds.length === 0) {
    fail("Seed output is missing required title, premise, or artifact_plan.");
  }

  const artifactSlots = artifactKinds.map((kind, index) => ({
    slot_id: `slot-${index + 1}`,
    path: artifactPathForKind(kind, issueClass, index),
    kind,
    purpose: defaultArtifactPurpose(kind, issueClass),
  }));

  return {
    scenario_skeleton: {
      skeleton_id: `${slugify(request.archetype)}-${issueClass}-001`,
      request_ref: `request/${runId}`,
      specialty_pack_ref: packPath.replace(/\\/g, "/"),
      generated_at: new Date().toISOString(),
      issue_class: issueClass,
      challenge_outline: {
        title,
        archetype: request.archetype,
        category: issueClass,
        description: premise,
        context: premise,
        difficulty: request.difficulty,
        estimated_time_minutes: request.estimated_time_minutes,
        tags: request.topic_tags ?? [],
      },
      artifact_slots: artifactSlots,
      scaffold_plan: buildScaffoldPlan(request, mode),
      generator_metadata: {
        run_id: runId,
      },
    },
  };
}

function buildProceduralArtifactBlueprints(skeleton) {
  return skeleton.artifact_slots.map((artifact, index) => ({
    slot_id: artifact.slot_id,
    path: artifact.path,
    kind: artifact.kind,
    purpose: artifact.purpose,
    evidentiary_role: `Expose clue ${index + 1} for the investigation through a ${artifact.kind} artifact.`,
    clue: `Highlight one concrete signal tied to ${skeleton.issue_class}.`,
  }));
}

function validateArtifactBlueprints(artifactBlueprints, skeleton) {
  const expectedPaths = new Set(skeleton.artifact_slots.map((artifact) => artifact.path));
  const actualPaths = new Set();

  for (const artifact of artifactBlueprints) {
    if (!expectedPaths.has(artifact.path)) {
      fail(`Artifact blueprint contains unexpected path: ${artifact.path}`);
    }

    if (actualPaths.has(artifact.path)) {
      fail(`Artifact blueprint contains duplicate path: ${artifact.path}`);
    }

    actualPaths.add(artifact.path);

    for (const key of ["purpose", "evidentiary_role", "clue"]) {
      if (typeof artifact[key] !== "string" || artifact[key].trim().length === 0) {
        fail(`Artifact blueprint is missing ${key} for ${artifact.path}`);
      }
    }
  }
}

function validateContextBlock(contextBlock) {
  if (!contextBlock || typeof contextBlock !== "object" || Array.isArray(contextBlock)) {
    fail("Context block must be an object.");
  }

  if (typeof contextBlock.description !== "string" || contextBlock.description.trim().length === 0) {
    fail("Context block is missing description.");
  }

  if (typeof contextBlock.context !== "string" || contextBlock.context.trim().length === 0) {
    fail("Context block is missing context.");
  }

  if (!Array.isArray(contextBlock.candidate_instructions) || contextBlock.candidate_instructions.length === 0) {
    fail("Context block must include candidate_instructions.");
  }

  if (contextBlock.candidate_instructions.length > 3) {
    fail("Context block must include at most 3 candidate instructions.");
  }
}

function validateEvaluationBundle(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    fail("Evaluation bundle must be an object.");
  }

  if (!Array.isArray(bundle.evaluation_signals) || bundle.evaluation_signals.length === 0) {
    fail("Evaluation bundle must include evaluation_signals.");
  }
}

function validateArtifactContentResult(result, expectedPath) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    fail(`Artifact content result must be an object for ${expectedPath}`);
  }

  if (result.path !== expectedPath) {
    fail(`Artifact content result returned unexpected path ${result.path}; expected ${expectedPath}`);
  }

  if (typeof result.content !== "string" || result.content.trim().length === 0) {
    fail(`Artifact content result is missing content for ${expectedPath}`);
  }
}

function normalizeArtifactPath(candidatePath, expectedPath) {
  if (typeof candidatePath !== "string" || candidatePath.trim().length === 0) {
    return null;
  }

  const normalizedCandidate = candidatePath.trim().replace(/\\/g, "/");
  const normalizedExpected = expectedPath.replace(/\\/g, "/");

  if (normalizedCandidate === normalizedExpected) {
    return normalizedExpected;
  }

  if (path.basename(normalizedCandidate) === path.basename(normalizedExpected)) {
    return normalizedExpected;
  }

  return null;
}

function unwrapArtifactCandidate(candidate, expectedPath) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  if (typeof candidate.content !== "string" || candidate.content.trim().length === 0) {
    return null;
  }

  const normalizedPath = normalizeArtifactPath(candidate.path, expectedPath);
  if (!normalizedPath) {
    return null;
  }

  return {
    path: normalizedPath,
    content: candidate.content,
  };
}

function normalizeArtifactContentResult(result, expectedPath) {
  const direct = unwrapArtifactCandidate(result, expectedPath);
  if (direct) {
    return direct;
  }

  const wrappedArtifact = unwrapArtifactCandidate(result?.artifact, expectedPath);
  if (wrappedArtifact) {
    return wrappedArtifact;
  }

  if (Array.isArray(result?.artifacts) && result.artifacts.length === 1) {
    const singleArtifact = unwrapArtifactCandidate(result.artifacts[0], expectedPath);
    if (singleArtifact) {
      return singleArtifact;
    }
  }

  if (result?.artifacts && typeof result.artifacts === "object" && !Array.isArray(result.artifacts)) {
    const normalizedExpected = expectedPath.replace(/\\/g, "/");
    const expectedBasename = path.basename(normalizedExpected);

    for (const [artifactKey, artifactValue] of Object.entries(result.artifacts)) {
      if (typeof artifactValue !== "string" || artifactValue.trim().length === 0) {
        continue;
      }

      const normalizedKey = normalizeArtifactPath(artifactKey, expectedPath);
      if (!normalizedKey && artifactKey !== expectedBasename) {
        continue;
      }

      return {
        path: normalizedExpected,
        content: artifactValue,
      };
    }
  }

  return result;
}

function assembleDraftPackage({
  runId,
  request,
  packPath,
  skeleton,
  contextBlock,
  artifactBlueprints,
  artifactContents,
  evaluationBundle,
  provider,
  sourceInput,
  mode,
}) {
  const blueprintMap = new Map(artifactBlueprints.map((artifact) => [artifact.path, artifact]));
  const contentMap = new Map(artifactContents.map((artifact) => [artifact.path, artifact.content]));

  const suppliedArtifacts = skeleton.artifact_slots.map((artifact) => ({
    path: artifact.path,
    kind: artifact.kind,
    purpose: blueprintMap.get(artifact.path)?.purpose ?? artifact.purpose,
  }));

  const artifacts = suppliedArtifacts.map((artifact) => ({
    ...artifact,
    content: contentMap.get(artifact.path) ?? "",
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
      description: contextBlock.description,
      context: contextBlock.context,
      supplied_artifacts: suppliedArtifacts,
      candidate_instructions: contextBlock.candidate_instructions,
      evaluation_signals: evaluationBundle.evaluation_signals,
      difficulty: skeleton.challenge_outline.difficulty,
      estimated_time_minutes: skeleton.challenge_outline.estimated_time_minutes,
      tags: skeleton.challenge_outline.tags ?? [],
      training_support: request.intended_mode === "training"
        ? {
            reflection_prompts: evaluationBundle.reflection_prompts ?? [],
            thinking_checklist: evaluationBundle.thinking_checklist ?? [],
            checkpoints: evaluationBundle.checkpoints ?? [],
            hints: evaluationBundle.hints ?? [],
          }
        : undefined,
    },
    artifacts,
    generator_metadata: {
      provider: provider.provider,
      model: provider.model,
      run_id: runId,
      pipeline: "staged-modular",
      generation_mode: mode,
      source_input: sourceInput.replace(/\\/g, "/"),
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const request = loadStructuredFile(rootDir, options.requestPath);
  const pack = loadStructuredFile(rootDir, options.packPath);
  const runId = fallbackRunId(request);
  const pipelineDir = buildPipelineDir(runId);
  ensureDirectory(pipelineDir);
  const session = createSessionLogger(pipelineDir);
  const provider = createProvider({
    provider: options.provider,
    model: options.model,
    think: options.think,
    hideThinking: options.hideThinking,
    host: options.host,
    temperature: options.temperature,
    topP: options.topP,
    topK: options.topK,
    minP: options.minP,
    presencePenalty: options.presencePenalty,
    repetitionPenalty: options.repetitionPenalty,
  });
  const timing = createTimingCollector();

  writeYamlFile(path.join(pipelineDir, "request.yaml"), request);
  writeYamlFile(path.join(pipelineDir, "pipeline-metadata.yaml"), {
    run_id: runId,
    provider: options.provider,
    model: options.model,
    mode: options.mode,
    think: options.think,
    hide_thinking: options.hideThinking,
    host: options.host ?? "default",
    temperature: options.temperature,
    top_p: options.topP,
    top_k: options.topK,
    min_p: options.minP,
    presence_penalty: options.presencePenalty,
    repetition_penalty: options.repetitionPenalty,
    created_at: new Date().toISOString(),
    pack_path: options.packPath.replace(/\\/g, "/"),
    request_path: options.requestPath.replace(/\\/g, "/"),
    session_log: path.relative(rootDir, session.sessionLogPath).replace(/\\/g, "/"),
  });
  session.line(`Pipeline created for run ${runId}`);
  session.line(`Provider=${options.provider} model=${options.model} mode=${options.mode} think=${options.think ?? "default"} hideThinking=${options.hideThinking}`);
  session.line(`Sampling temperature=${options.temperature ?? "default"} top_p=${options.topP ?? "default"} top_k=${options.topK ?? "default"} min_p=${options.minP ?? "default"} presence_penalty=${options.presencePenalty ?? "default"} repetition_penalty=${options.repetitionPenalty ?? "default"}`);
  session.line(`Request=${options.requestPath.replace(/\\/g, "/")} pack=${options.packPath.replace(/\\/g, "/")}`);

  async function runStage(stageName, detail, handler) {
    const startedAt = new Date().toISOString();
    writeStageStatus(pipelineDir, stageName, {
      status: "running",
      started_at: startedAt,
      detail,
    });
    session.stageStart(stageName, detail);
    console.log(`Starting ${stageName}${detail ? ` | ${detail}` : ""}`);

    try {
      const result = await timing.measure(stageName, handler);
      const stageTiming = timing.latest(stageName);
      writeStageStatus(pipelineDir, stageName, {
        status: "completed",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        duration_ms: stageTiming?.duration_ms ?? null,
        detail,
      });
      session.stageComplete(stageName, stageTiming?.duration_ms ?? 0, detail);
      return result;
    } catch (error) {
      writeStageStatus(pipelineDir, stageName, {
        status: "failed",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        detail,
        error: error.message ?? String(error),
      });
      session.stageFail(stageName, error);
      throw error;
    }
  }

  const seed = await runStage(stageNames.seed, "Generate seed", async () => {
    const prompt = buildSeedPrompt({ request, pack, mode: options.mode });
    const result = await provider.generateObject({
      runId,
      stageName: stageNames.seed,
      prompt,
    });
    return result.parsed;
  });
  writeStageYaml(pipelineDir, stageNames.seed, "seed.yaml", seed);

  const skeletonEnvelope = await runStage(stageNames.skeleton, "Build procedural skeleton", async () =>
    buildSkeletonFromSeed({
      seed,
      request,
      packPath: options.packPath,
      runId,
      mode: options.mode,
    }));
  writeStageYaml(pipelineDir, stageNames.skeleton, "skeleton.yaml", skeletonEnvelope.scenario_skeleton);

  const contextBlock = await runStage(stageNames.context, "Generate description, context, instructions", async () => {
    const prompt = buildContextPrompt({
      request,
      skeleton: skeletonEnvelope.scenario_skeleton,
      pack,
    });
    const result = await provider.generateObject({
      runId,
      stageName: stageNames.context,
      prompt,
    });
    validateContextBlock(result.parsed);
    return result.parsed;
  });
  writeStageYaml(pipelineDir, stageNames.context, "context.yaml", contextBlock);

  const artifactBlueprints = await runStage(stageNames.artifactPlan, options.mode === "fast" ? "Build procedural artifact plan" : "Generate artifact plan", async () => {
    if (options.mode === "fast") {
      const blueprints = buildProceduralArtifactBlueprints(skeletonEnvelope.scenario_skeleton);
      validateArtifactBlueprints(blueprints, skeletonEnvelope.scenario_skeleton);
      return blueprints;
    }

    const prompt = buildArtifactPlanPrompt({
      request,
      skeleton: skeletonEnvelope.scenario_skeleton,
      pack,
    });
    const result = await provider.generateObject({
      runId,
      stageName: stageNames.artifactPlan,
      prompt,
    });
    const blueprints = result.parsed.artifacts ?? [];
    validateArtifactBlueprints(blueprints, skeletonEnvelope.scenario_skeleton);
    return blueprints;
  });
  writeStageYaml(pipelineDir, stageNames.artifactPlan, "artifact-plan.yaml", { artifacts: artifactBlueprints });

  const artifactContents = await runStage(stageNames.artifacts, `Generate ${skeletonEnvelope.scenario_skeleton.artifact_slots.length} artifact(s)`, async () => {
    const contents = [];

    for (const artifact of skeletonEnvelope.scenario_skeleton.artifact_slots) {
      session.line(`  artifact ${artifact.path} | kind=${artifact.kind}`);
      const blueprint = artifactBlueprints.find((entry) => entry.path === artifact.path);
      const prompt = buildArtifactPrompt({
        request,
        skeleton: skeletonEnvelope.scenario_skeleton,
        blueprint,
        artifact,
        pack,
      });
      const result = await provider.generateObject({
        runId,
        stageName: `${stageNames.artifacts}-${slugify(artifact.path)}`,
        prompt,
      });
      const normalizedArtifact = normalizeArtifactContentResult(result.parsed, artifact.path);
      validateArtifactContentResult(normalizedArtifact, artifact.path);
      contents.push(normalizedArtifact);
    }

    return contents;
  });
  writeStageYaml(pipelineDir, stageNames.artifacts, "artifact-contents.yaml", { artifacts: artifactContents });

  const evaluationBundle = await runStage(stageNames.evaluation, "Generate evaluation and training bundle", async () => {
    const prompt = buildEvaluationPrompt({
      request,
      skeleton: skeletonEnvelope.scenario_skeleton,
      artifactBlueprints,
      pack,
      mode: options.mode,
    });
    const result = await provider.generateObject({
      runId,
      stageName: stageNames.evaluation,
      prompt,
    });
    validateEvaluationBundle(result.parsed);
    return result.parsed;
  });
  writeStageYaml(pipelineDir, stageNames.evaluation, "evaluation.yaml", evaluationBundle);

  const draftPackage = assembleDraftPackage({
    runId,
    request,
    packPath: options.packPath,
    skeleton: skeletonEnvelope.scenario_skeleton,
    contextBlock,
    artifactBlueprints,
    artifactContents,
    evaluationBundle,
    provider,
    sourceInput: options.requestPath,
    mode: options.mode,
  });

  const validationReport = buildValidationReport({
    draftPackage,
    request,
    pack,
  });

  const envelope = {
    request,
    draft_package: draftPackage,
    validation_report: validationReport,
  };
  const draftDir = writeDraft(rootDir, envelope, options.requestPath);

  const timings = timing.finish();
  writeYamlFile(path.join(pipelineDir, "timings.yaml"), timings);
  writeYamlFile(path.join(pipelineDir, "final-validation.yaml"), validationReport);
  session.line(`Validation result | structural=${validationReport.structural_status} semantic=${validationReport.semantic_status} recommendation=${validationReport.overall_recommendation}`);
  session.line(`Total duration | ${Math.round(timings.total_duration_ms)}ms`);

  console.log(`Generated staged pipeline artifacts under ${path.relative(rootDir, pipelineDir)}`);
  console.log(`Wrote validated draft to ${path.relative(rootDir, draftDir)}`);
  console.log(
    `Validation result: structural=${validationReport.structural_status}, semantic=${validationReport.semantic_status}, recommendation=${validationReport.overall_recommendation}`,
  );
  console.log(
    `Stage timing summary: ${timings.stages.map((stage) => `${stage.name}=${Math.round(stage.duration_ms)}ms`).join(", ")}`,
  );

  if (options.autoRepair && validationReport.overall_recommendation === "repair") {
    console.log(
      `Auto-repair is not inlined in generate:challenge. Run generate:repair-draft against ${path.relative(rootDir, draftDir)} if you want a single repair pass.`,
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
