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
  writeDraft,
  writeYamlFile,
} from "./lib.mjs";

const rootDir = process.cwd();
const repairableFields = new Set([
  "challenge_definition.category",
  "challenge_definition.description",
  "challenge_definition.context",
  "challenge_definition.candidate_instructions",
  "challenge_definition.evaluation_signals",
  "challenge_definition.tags",
  "challenge_definition.training_support.reflection_prompts",
  "challenge_definition.training_support.thinking_checklist",
  "challenge_definition.training_support.checkpoints",
  "challenge_definition.training_support.hints",
]);

function parseArgs(argv) {
  const options = {
    model: "qwen3.5:4b",
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--model") {
      options.model = argv[index + 1] ?? options.model;
      index += 1;
      continue;
    }

    if (token === "--pack") {
      options.packPath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    positional.push(token);
  }

  if (!options.draftDir && positional.length > 0) {
    options.draftDir = positional[0];
  }

  if (!options.packPath && positional.length > 1) {
    options.packPath = positional[1];
  }

  if (options.model === "qwen3.5:4b" && positional.length > 2) {
    options.model = positional[2];
  }

  if (!options.draftDir) {
    fail("Usage: node scripts/generation/repair-draft.mjs <generated-draft-dir> --pack <pack.yaml> [--model qwen3.5:4b]");
  }

  if (!options.packPath) {
    fail("A specialty pack is required. Use --pack specialties/<name>/pack.yaml");
  }

  return options;
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

function getByPath(object, dottedPath) {
  return dottedPath.split(".").reduce((current, segment) => current?.[segment], object);
}

function setByPath(object, dottedPath, value) {
  const segments = dottedPath.split(".");
  let current = object;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!current[segment] || typeof current[segment] !== "object" || Array.isArray(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function loadDraftPackageFromDirectory(draftDir) {
  const challengeDefinition = readYamlFile(path.join(draftDir, "challenge.yaml"));
  const metadata = readYamlFile(path.join(draftDir, "metadata.yaml"));
  const request = readYamlFile(path.join(draftDir, "request.yaml"));
  const validationReport = pathExists(path.join(draftDir, "validation-report.yaml"))
    ? readYamlFile(path.join(draftDir, "validation-report.yaml"))
    : null;

  const artifacts = (challengeDefinition.supplied_artifacts ?? []).map((artifact) => {
    const artifactPath = path.join(draftDir, artifact.path);
    return {
      ...artifact,
      content: pathExists(artifactPath) ? fs.readFileSync(artifactPath, "utf8") : "",
    };
  });

  const draftPackage = {
    run_id: metadata.run_id ?? undefined,
    challenge_id: challengeDefinition.id,
    request_ref: metadata.request_ref,
    specialty_pack_ref: metadata.specialty_pack_ref,
    generated_at: metadata.generated_at,
    challenge_definition: challengeDefinition,
    artifacts,
    generator_metadata: metadata.generator_metadata ?? {},
    generation_notes: metadata.generation_notes ?? [],
    repair_history: metadata.repair_history ?? [],
  };

  validateDraftPackage(draftPackage);

  return {
    draftPackage,
    metadata,
    request,
    validationReport,
  };
}

function summarizeArtifacts(draftPackage) {
  return draftPackage.artifacts.map((artifact) => ({
    path: artifact.path,
    kind: artifact.kind,
    purpose: artifact.purpose,
    preview: String(artifact.content ?? "").slice(0, 280),
  }));
}

function selectRepairTargets(validationReport) {
  const fieldMap = new Map();

  for (const issue of validationReport?.issues ?? []) {
    if (issue.severity === "info" || !issue.field) {
      continue;
    }

    const normalizedField = issue.field.replace(/\[\d+\](\.[^.]+)?$/, (match) => {
      if (match.startsWith("[")) {
        const suffix = match.replace(/^\[\d+\]/, "");
        return suffix;
      }
      return match;
    });

    for (const candidate of repairableFields) {
      if (normalizedField === candidate || normalizedField.startsWith(`${candidate}[`) || normalizedField.startsWith(`${candidate}.`)) {
        if (!fieldMap.has(candidate)) {
          fieldMap.set(candidate, []);
        }
        fieldMap.get(candidate).push(issue);
      }
    }
  }

  return Array.from(fieldMap.entries()).map(([field, issues]) => ({ field, issues }));
}

function buildRepairPrompt({ draftPackage, request, pack, repairTargets }) {
  const fieldContext = Object.fromEntries(
    repairTargets.map(({ field }) => [field, getByPath(draftPackage, field)]),
  );

  const issueContext = repairTargets.map(({ field, issues }) => ({
    field,
    issues: issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      suggested_action: issue.suggested_action,
    })),
  }));

  const minimalPack = {
    id: pack.id,
    supported_archetypes: pack.supported_archetypes,
    common_failure_modes: pack.common_failure_modes,
    anti_patterns: pack.anti_patterns,
    evaluation_heuristics: pack.evaluation_heuristics,
    training_heuristics: pack.training_heuristics,
    tag_catalog: pack.tag_catalog,
  };

  return `
You are repairing specific fields in a SteerLab DraftChallengePackage.

Return ONLY valid JSON.
Do not include commentary.
Do not include markdown fences.
Do not include explanations.

Return a single JSON object with this exact shape:
{
  "patch": {
    "<field-path>": <replacement-value>
  }
}

Rules:
- include ONLY the fields listed in "Fields to repair"
- do not return any other fields
- preserve the scenario, artifact bundle, and difficulty
- keep replacements realistic and specific
- prefer minimal edits that directly address the warnings
- arrays must be returned as full replacement arrays

Hard constraints:
- archetype must remain "${request.archetype}"
- difficulty must remain "${request.difficulty}"
- estimated_time_minutes must remain ${request.estimated_time_minutes}
- intended mode is "${request.intended_mode}"
- do not change artifact paths or artifact contents

Fields to repair:
${JSON.stringify(issueContext, null, 2)}

Current values for those fields:
${JSON.stringify(fieldContext, null, 2)}

Minimal request context:
${JSON.stringify(
    {
      specialty: request.specialty,
      topic_tags: request.topic_tags,
      intended_mode: request.intended_mode,
      training_support_depth: request.training_support_depth,
      realism_constraints: request.realism_constraints,
    },
    null,
    2,
  )}

Minimal specialty-pack context:
${JSON.stringify(minimalPack, null, 2)}

Artifact summaries:
${JSON.stringify(summarizeArtifacts(draftPackage), null, 2)}
`.trim();
}

function writeRepairArtifacts(rawDir, prompt, response) {
  ensureDirectory(rawDir);
  fs.writeFileSync(path.join(rawDir, "repair-prompt.txt"), prompt, "utf8");
  fs.writeFileSync(path.join(rawDir, "repair-response.txt"), response, "utf8");
}

function applyPatch(draftPackage, patch) {
  const nextDraftPackage = JSON.parse(JSON.stringify(draftPackage));

  for (const [field, value] of Object.entries(patch)) {
    if (!repairableFields.has(field)) {
      fail(`Repair patch attempted to change a non-repairable field: ${field}`);
    }

    setByPath(nextDraftPackage, field, value);
  }

  return nextDraftPackage;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const draftDir = path.resolve(rootDir, options.draftDir);

  if (!pathExists(draftDir)) {
    fail(`Draft directory does not exist: ${options.draftDir}`);
  }

  const pack = loadStructuredFile(rootDir, options.packPath);
  const { draftPackage, metadata, request, validationReport } = loadDraftPackageFromDirectory(draftDir);

  if (Array.isArray(draftPackage.repair_history) && draftPackage.repair_history.length > 0) {
    fail("Automatic repair is limited to one pass. This draft already has repair_history.");
  }

  if (validationReport?.overall_recommendation === "promote") {
    console.log("Draft already validates cleanly. No repair needed.");
    return;
  }

  const repairTargets = selectRepairTargets(validationReport);
  if (repairTargets.length === 0) {
    fail("Validation report does not contain any repairable warning fields.");
  }

  const prompt = buildRepairPrompt({
    draftPackage,
    request,
    pack,
    repairTargets,
  });

  const rawDir = path.join(
    rootDir,
    "generated",
    "raw",
    draftPackage.run_id ?? draftPackage.challenge_id,
    "semantic-repair",
  );

  console.log(`Writing repair artifacts under ${path.relative(rootDir, rawDir)}`);
  console.log(`Requesting field-level repair for ${repairTargets.map((target) => target.field).join(", ")}`);

  const rawResponse = runOllama(options.model, prompt);
  writeRepairArtifacts(rawDir, prompt, rawResponse);

  const extraction = extractJsonObject(rawResponse);
  const repairEnvelope = extraction.parsed;

  if (!repairEnvelope || typeof repairEnvelope !== "object" || Array.isArray(repairEnvelope)) {
    fail("Repair response must be an object.");
  }

  if (!repairEnvelope.patch || typeof repairEnvelope.patch !== "object" || Array.isArray(repairEnvelope.patch)) {
    fail("Repair response must contain a `patch` object.");
  }

  const repairedDraftPackage = applyPatch(draftPackage, repairEnvelope.patch);
  repairedDraftPackage.run_id = draftPackage.run_id;
  repairedDraftPackage.repair_history = [
    ...(draftPackage.repair_history ?? []),
    `semantic-repair:${new Date().toISOString()}:${options.model}`,
  ];
  repairedDraftPackage.generator_metadata = {
    ...(draftPackage.generator_metadata ?? {}),
    repaired_by_model: options.model,
  };

  validateDraftPackage(repairedDraftPackage);

  const nextValidationReport = buildValidationReport({
    draftPackage: repairedDraftPackage,
    request,
    pack,
  });

  const envelope = {
    request,
    draft_package: repairedDraftPackage,
    validation_report: nextValidationReport,
  };

  writeDraft(rootDir, envelope, metadata.source_input ?? options.draftDir);
  writeYamlFile(path.join(draftDir, "metadata.yaml"), {
    ...metadata,
    generator_metadata: repairedDraftPackage.generator_metadata ?? {},
    repair_history: repairedDraftPackage.repair_history ?? [],
  });

  console.log(`Wrote repair artifacts to ${path.relative(rootDir, rawDir)}`);
  console.log(
    `Updated draft validation: structural=${nextValidationReport.structural_status}, semantic=${nextValidationReport.semantic_status}, recommendation=${nextValidationReport.overall_recommendation}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
