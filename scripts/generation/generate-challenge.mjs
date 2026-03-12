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
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

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

    positional.push(token);
  }

  if (!options.requestPath && positional.length > 0) {
    options.requestPath = positional[0];
  }

  if (!options.packPath && positional.length > 1) {
    options.packPath = positional[1];
  }

  if (!options.requestPath) {
    fail("Usage: node scripts/generation/generate-challenge.mjs <request.yaml> --pack <pack.yaml> [--provider ollama] [--model qwen3.5:4b] [--mode fast|full] [--auto-repair]");
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

function writeStageYaml(pipelineDir, stageName, fileName, value) {
  const stageDir = path.join(pipelineDir, "stages", stageName);
  ensureDirectory(stageDir);
  writeYamlFile(path.join(stageDir, fileName), value);
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
  const provider = createProvider({
    provider: options.provider,
    model: options.model,
  });
  const timing = createTimingCollector();

  writeYamlFile(path.join(pipelineDir, "request.yaml"), request);
  writeYamlFile(path.join(pipelineDir, "pipeline-metadata.yaml"), {
    run_id: runId,
    provider: options.provider,
    model: options.model,
    mode: options.mode,
    created_at: new Date().toISOString(),
    pack_path: options.packPath.replace(/\\/g, "/"),
    request_path: options.requestPath.replace(/\\/g, "/"),
  });

  const seed = await timing.measure(stageNames.seed, async () => {
    const prompt = buildSeedPrompt({ request, pack, mode: options.mode });
    const result = provider.generateObject({
      runId,
      stageName: stageNames.seed,
      prompt,
    });
    return result.parsed;
  });
  writeStageYaml(pipelineDir, stageNames.seed, "seed.yaml", seed);

  const skeletonEnvelope = await timing.measure(stageNames.skeleton, async () =>
    buildSkeletonFromSeed({
      seed,
      request,
      packPath: options.packPath,
      runId,
      mode: options.mode,
    }));
  writeStageYaml(pipelineDir, stageNames.skeleton, "skeleton.yaml", skeletonEnvelope.scenario_skeleton);

  const contextBlock = await timing.measure(stageNames.context, async () => {
    const prompt = buildContextPrompt({
      request,
      skeleton: skeletonEnvelope.scenario_skeleton,
      pack,
    });
    const result = provider.generateObject({
      runId,
      stageName: stageNames.context,
      prompt,
    });
    validateContextBlock(result.parsed);
    return result.parsed;
  });
  writeStageYaml(pipelineDir, stageNames.context, "context.yaml", contextBlock);

  const artifactBlueprints = await timing.measure(stageNames.artifactPlan, async () => {
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
    const result = provider.generateObject({
      runId,
      stageName: stageNames.artifactPlan,
      prompt,
    });
    const blueprints = result.parsed.artifacts ?? [];
    validateArtifactBlueprints(blueprints, skeletonEnvelope.scenario_skeleton);
    return blueprints;
  });
  writeStageYaml(pipelineDir, stageNames.artifactPlan, "artifact-plan.yaml", { artifacts: artifactBlueprints });

  const artifactContents = await timing.measure(stageNames.artifacts, async () => {
    const contents = [];

    for (const artifact of skeletonEnvelope.scenario_skeleton.artifact_slots) {
      const blueprint = artifactBlueprints.find((entry) => entry.path === artifact.path);
      const prompt = buildArtifactPrompt({
        request,
        skeleton: skeletonEnvelope.scenario_skeleton,
        blueprint,
        artifact,
        pack,
      });
      const result = provider.generateObject({
        runId,
        stageName: `${stageNames.artifacts}-${slugify(artifact.path)}`,
        prompt,
      });
      validateArtifactContentResult(result.parsed, artifact.path);
      contents.push(result.parsed);
    }

    return contents;
  });
  writeStageYaml(pipelineDir, stageNames.artifacts, "artifact-contents.yaml", { artifacts: artifactContents });

  const evaluationBundle = await timing.measure(stageNames.evaluation, async () => {
    const prompt = buildEvaluationPrompt({
      request,
      skeleton: skeletonEnvelope.scenario_skeleton,
      artifactBlueprints,
      pack,
      mode: options.mode,
    });
    const result = provider.generateObject({
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
