import fs from "node:fs";
import path from "node:path";
import yaml from "../../apps/runner/node_modules/js-yaml/dist/js-yaml.mjs";

export function fail(message) {
  throw new Error(message);
}

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

export function writeYamlFile(filePath, value) {
  fs.writeFileSync(filePath, yaml.dump(value, { noRefs: true, lineWidth: 100 }), "utf8");
}

export function readYamlFile(filePath) {
  return yaml.load(fs.readFileSync(filePath, "utf8"));
}

export function loadStructuredFile(rootDir, inputPath) {
  const resolved = path.resolve(rootDir, inputPath);
  if (!fs.existsSync(resolved)) {
    fail(`Input file does not exist: ${inputPath}`);
  }

  const source = fs.readFileSync(resolved, "utf8");
  const extension = path.extname(resolved).toLowerCase();

  try {
    if (extension === ".json") {
      return JSON.parse(source);
    }

    return yaml.load(source);
  } catch (error) {
    fail(`Could not parse input file: ${error.message}`);
  }
}

export function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    fail("Input must be an object with `request` and `draft_package`.");
  }

  if (!envelope.request || typeof envelope.request !== "object" || Array.isArray(envelope.request)) {
    fail("Input is missing a valid `request` object.");
  }

  validateDraftPackage(envelope.draft_package);
}

export function validateDraftPackage(draftPackage) {
  if (!draftPackage || typeof draftPackage !== "object" || Array.isArray(draftPackage)) {
    fail("Input is missing a valid `draft_package` object.");
  }

  const challengeId = draftPackage.challenge_id;
  if (!isNonEmptyString(challengeId)) {
    fail("`draft_package.challenge_id` must be a non-empty string.");
  }

  if (!draftPackage.challenge_definition || typeof draftPackage.challenge_definition !== "object") {
    fail("`draft_package.challenge_definition` must be an object.");
  }

  if (draftPackage.challenge_definition.id !== challengeId) {
    fail("`draft_package.challenge_definition.id` must match `draft_package.challenge_id`.");
  }

  if (!Array.isArray(draftPackage.artifacts)) {
    fail("`draft_package.artifacts` must be an array.");
  }
}

export function validateScenarioSkeleton(skeleton) {
  if (!skeleton || typeof skeleton !== "object" || Array.isArray(skeleton)) {
    fail("Input is missing a valid `scenario_skeleton` object.");
  }

  for (const field of ["skeleton_id", "request_ref", "specialty_pack_ref", "generated_at"]) {
    if (!isNonEmptyString(skeleton[field])) {
      fail(`\`scenario_skeleton.${field}\` must be a non-empty string.`);
    }
  }

  if (!skeleton.challenge_outline || typeof skeleton.challenge_outline !== "object" || Array.isArray(skeleton.challenge_outline)) {
    fail("`scenario_skeleton.challenge_outline` must be an object.");
  }

  const outline = skeleton.challenge_outline;
  for (const field of ["title", "archetype", "category", "description", "context", "difficulty"]) {
    if (!isNonEmptyString(outline[field])) {
      fail(`\`scenario_skeleton.challenge_outline.${field}\` must be a non-empty string.`);
    }
  }

  if (!Number.isInteger(outline.estimated_time_minutes) || outline.estimated_time_minutes <= 0) {
    fail("`scenario_skeleton.challenge_outline.estimated_time_minutes` must be a positive integer.");
  }

  if (!Array.isArray(skeleton.artifact_plan) || skeleton.artifact_plan.length === 0) {
    fail("`scenario_skeleton.artifact_plan` must be a non-empty array.");
  }

  skeleton.artifact_plan.forEach((artifact, index) => {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      fail(`\`scenario_skeleton.artifact_plan[${index}]\` must be an object.`);
    }

    for (const key of ["path", "kind", "purpose", "evidentiary_role"]) {
      if (!isNonEmptyString(artifact[key])) {
        fail(`\`scenario_skeleton.artifact_plan[${index}].${key}\` must be a non-empty string.`);
      }
    }
  });
}

export function buildSkeletonValidationReport({ skeleton, request, pack }) {
  validateScenarioSkeleton(skeleton);

  const issues = [];
  const outline = skeleton.challenge_outline;
  const plan = skeleton.artifact_plan;
  const allowedArchetypes = [
    "broken-system-investigation",
    "architecture-thought-experiment",
    "tool-steering-challenge",
  ];
  const allowedDifficulties = ["intro", "intermediate", "advanced"];

  if (!isAllowedEnum(outline.archetype, allowedArchetypes)) {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "invalid-archetype",
      message: "`challenge_outline.archetype` must be a valid archetype.",
      field: "challenge_outline.archetype",
    });
  }

  if (!isAllowedEnum(outline.difficulty, allowedDifficulties)) {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "invalid-difficulty",
      message: "`challenge_outline.difficulty` must be a valid difficulty.",
      field: "challenge_outline.difficulty",
    });
  }

  if (request) {
    if (outline.archetype !== request.archetype) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "request-archetype-mismatch",
        message: "Scenario skeleton archetype does not match the normalized request.",
        field: "challenge_outline.archetype",
      });
    }

    if (outline.difficulty !== request.difficulty) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "request-difficulty-mismatch",
        message: "Scenario skeleton difficulty does not match the normalized request.",
        field: "challenge_outline.difficulty",
      });
    }

    if (outline.estimated_time_minutes !== request.estimated_time_minutes) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "request-time-mismatch",
        message: "Scenario skeleton estimated time does not match the normalized request.",
        field: "challenge_outline.estimated_time_minutes",
      });
    }

    if (plan.length > request.artifact_profile.max_artifacts) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "artifact-budget-exceeded",
        message: "Artifact plan exceeds the requested artifact budget.",
        field: "artifact_plan",
      });
    }

    for (const requiredKind of request.artifact_profile.required_kinds ?? []) {
      if (!plan.some((artifact) => artifact.kind === requiredKind)) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "required-artifact-kind-missing",
          message: `Required artifact kind is missing from the artifact plan: ${requiredKind}`,
          field: "artifact_plan",
        });
      }
    }
  }

  if (pack) {
    if (Array.isArray(pack.supported_archetypes) && !pack.supported_archetypes.includes(outline.archetype)) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "error",
        code: "unsupported-pack-archetype",
        message: "Selected specialty pack does not support the skeleton archetype.",
        field: "challenge_outline.archetype",
      });
    }

    if (isNonEmptyString(pack.id) && outline.category === pack.id) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "generic-category",
        message: "Scenario skeleton category matches the specialty pack id exactly and may be too broad.",
        field: "challenge_outline.category",
      });
    }
  }

  const duplicateArtifactPaths = new Set();
  const seenArtifactPaths = new Set();
  plan.forEach((artifact, index) => {
    if (!artifact.path.startsWith("artifacts/")) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "artifact-path-outside-bundle",
        message: `Artifact plan path must live under artifacts/: ${artifact.path}`,
        field: `artifact_plan[${index}].path`,
      });
    }

    if (seenArtifactPaths.has(artifact.path)) {
      duplicateArtifactPaths.add(artifact.path);
    }
    seenArtifactPaths.add(artifact.path);
  });

  duplicateArtifactPaths.forEach((artifactPath) => {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "duplicate-artifact-path",
      message: `Artifact plan contains duplicate path: ${artifactPath}`,
      field: "artifact_plan",
    });
  });

  if (outline.context.trim().split(/\s+/).length < 20) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "thin-context",
      message: "Scenario skeleton context is brief and may be too thin to support a full challenge.",
      field: "challenge_outline.context",
    });
  }

  if (outline.description.trim().split(/\s+/).length < 10) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "thin-description",
      message: "Scenario skeleton description is brief and may be too generic.",
      field: "challenge_outline.description",
    });
  }

  if (/\b(root cause|because|caused by|triggered by)\b/i.test(outline.context)) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "context-too-leading",
      message: "Scenario skeleton context may be naming the causal chain too directly.",
      field: "challenge_outline.context",
    });
  }

  const artifactKinds = new Set(plan.map((artifact) => artifact.kind));
  if (artifactKinds.size === 1 && plan.length > 1) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "low-artifact-diversity",
      message: "Artifact plan may be too narrow to support a strong investigation.",
      field: "artifact_plan",
    });
  }

  if (plan.some((artifact) => artifact.purpose.trim().toLowerCase() === artifact.evidentiary_role.trim().toLowerCase())) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "weak-evidentiary-role",
      message: "One or more artifact evidentiary roles repeat the artifact purpose instead of clarifying what the artifact proves.",
      field: "artifact_plan",
    });
  }

  const structuralStatus = hasIssueSeverity(issues.filter((issue) => issue.stage === "structural"), "error")
    ? "fail"
    : "pass";
  const semanticIssues = issues.filter((issue) => issue.stage === "semantic");
  const semanticStatus = semanticIssues.some((issue) => issue.severity === "error")
    ? "fail"
    : semanticIssues.some((issue) => issue.severity === "warning")
      ? "warn"
      : "pass";

  let overallRecommendation = "promote";
  if (structuralStatus === "fail" || semanticStatus === "fail") {
    overallRecommendation = "reject";
  } else if (semanticStatus === "warn") {
    overallRecommendation = "repair";
  }

  return {
    challenge_id: skeleton.skeleton_id,
    structural_status: structuralStatus,
    semantic_status: semanticStatus,
    issues,
    overall_recommendation: overallRecommendation,
    generated_at: new Date().toISOString(),
  };
}

function looksLikeDraftChallengePackage(candidate) {
  return Boolean(
    candidate
      && typeof candidate === "object"
      && !Array.isArray(candidate)
      && isNonEmptyString(candidate.challenge_id)
      && isNonEmptyString(candidate.request_ref)
      && isNonEmptyString(candidate.specialty_pack_ref)
      && candidate.challenge_definition
      && typeof candidate.challenge_definition === "object"
      && !Array.isArray(candidate.challenge_definition)
      && Array.isArray(candidate.artifacts),
  );
}

function extractAnchoredDraftPackageCandidate(text) {
  const anchorPattern = /{\s*"challenge_id"\s*:/g;
  const anchors = Array.from(text.matchAll(anchorPattern));

  for (let index = anchors.length - 1; index >= 0; index -= 1) {
    const startIndex = anchors[index].index;
    const candidate = extractFirstBalancedObjectFrom(text, startIndex);

    if (!candidate) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);
      if (looksLikeDraftChallengePackage(parsed)) {
        return {
          parsed,
          candidate,
        };
      }
    } catch {
      // Try the next anchored candidate.
    }
  }

  return null;
}

function extractFirstBalancedObjectFrom(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function collectIssue(issues, issue) {
  issues.push(issue);
}

function hasIssueSeverity(issues, severity) {
  return issues.some((issue) => issue.severity === severity);
}

function isAllowedEnum(value, allowed) {
  return typeof value === "string" && allowed.includes(value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateStringListField(value, field, issues, { minItems = 1, stage = "structural" } = {}) {
  if (!Array.isArray(value) || value.length < minItems) {
    collectIssue(issues, {
      stage,
      severity: "error",
      code: "invalid-string-list",
      message: `\`${field}\` must be an array with at least ${minItems} item(s).`,
      field,
    });
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      collectIssue(issues, {
        stage,
        severity: "error",
        code: "invalid-string-list-item",
        message: `\`${field}[${index}]\` must be a non-empty string.`,
        field: `${field}[${index}]`,
      });
    }
  });
}

function validateTrainingSupportShape(trainingSupport, issues) {
  if (trainingSupport === undefined) {
    return;
  }

  if (!isPlainObject(trainingSupport)) {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "invalid-training-support",
      message: "`training_support` must be an object.",
      field: "challenge_definition.training_support",
    });
    return;
  }

  for (const fieldName of ["reflection_prompts", "thinking_checklist"]) {
    if (trainingSupport[fieldName] !== undefined) {
      validateStringListField(
        trainingSupport[fieldName],
        `challenge_definition.training_support.${fieldName}`,
        issues,
      );
    }
  }

  if (trainingSupport.checkpoints !== undefined) {
    if (!Array.isArray(trainingSupport.checkpoints)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-checkpoints",
        message: "`training_support.checkpoints` must be an array.",
        field: "challenge_definition.training_support.checkpoints",
      });
    } else {
      trainingSupport.checkpoints.forEach((checkpoint, index) => {
        if (!isPlainObject(checkpoint)) {
          collectIssue(issues, {
            stage: "structural",
            severity: "error",
            code: "invalid-checkpoint",
            message: `Checkpoint ${index} must be an object.`,
            field: `challenge_definition.training_support.checkpoints[${index}]`,
          });
          return;
        }

        for (const key of ["id", "title", "prompt"]) {
          if (!isNonEmptyString(checkpoint[key])) {
            collectIssue(issues, {
              stage: "structural",
              severity: "error",
              code: "invalid-checkpoint-field",
              message: `Checkpoint ${index} is missing a valid \`${key}\`.`,
              field: `challenge_definition.training_support.checkpoints[${index}].${key}`,
            });
          }
        }
      });
    }
  }

  if (trainingSupport.hints !== undefined) {
    if (!Array.isArray(trainingSupport.hints)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-hints",
        message: "`training_support.hints` must be an array.",
        field: "challenge_definition.training_support.hints",
      });
    } else {
      trainingSupport.hints.forEach((hint, index) => {
        if (!isPlainObject(hint)) {
          collectIssue(issues, {
            stage: "structural",
            severity: "error",
            code: "invalid-hint",
            message: `Hint ${index} must be an object.`,
            field: `challenge_definition.training_support.hints[${index}]`,
          });
          return;
        }

        for (const key of ["title", "content"]) {
          if (!isNonEmptyString(hint[key])) {
            collectIssue(issues, {
              stage: "structural",
              severity: "error",
              code: "invalid-hint-field",
              message: `Hint ${index} is missing a valid \`${key}\`.`,
              field: `challenge_definition.training_support.hints[${index}].${key}`,
            });
          }
        }
      });
    }
  }
}

function genericSignalPattern(value) {
  return /\b(good|strong|clear|appropriate|effective|reasonable)\b/i.test(value);
}

function genericInstructionPattern(value) {
  return /\b(review|examine|analyze|identify|determine|consider|assess)\b/i.test(value);
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function tokenizeSemanticTerms(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function textContainsAny(text, terms) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function countFailureModeMatches(text, failureMode) {
  const normalizedText = normalizeText(text);
  const tokens = tokenizeSemanticTerms(failureMode);

  if (tokens.length === 0) {
    return 0;
  }

  return tokens.filter((token) => normalizedText.includes(token)).length;
}

function reflectsFailureMode(text, failureMode) {
  const normalizedText = normalizeText(text);
  const normalizedFailureMode = normalizeText(failureMode);

  if (normalizedText.includes(normalizedFailureMode)) {
    return true;
  }

  const tokens = tokenizeSemanticTerms(failureMode);
  if (tokens.length === 0) {
    return false;
  }

  const matchedTokenCount = countFailureModeMatches(text, failureMode);
  const requiredTokenCount = tokens.length >= 3 ? 2 : tokens.length;

  return matchedTokenCount >= requiredTokenCount;
}

function artifactKeywordPattern(artifacts) {
  const keywords = new Set();

  for (const artifact of artifacts) {
    if (isNonEmptyString(artifact.kind)) {
      keywords.add(artifact.kind.toLowerCase());
    }

    if (isNonEmptyString(artifact.path)) {
      for (const token of artifact.path.toLowerCase().split(/[^a-z0-9]+/)) {
        if (token.length >= 4) {
          keywords.add(token);
        }
      }
    }
  }

  return new RegExp(`\\b(${Array.from(keywords).join("|")})\\b`, "i");
}

function countArtifactAnchoredItems(items, artifactPattern) {
  return items.filter((item) => artifactPattern.test(item)).length;
}

function isLeadingHint(content) {
  return /\b(root cause|the issue is|the problem is|because|causing|missing|should have triggered|failed to|not executed successfully)\b/i.test(
    content,
  );
}

export function buildValidationReport({ draftPackage, request, pack }) {
  validateDraftPackage(draftPackage);

  const issues = [];
  const challenge = draftPackage.challenge_definition;
  const allowedArchetypes = [
    "broken-system-investigation",
    "architecture-thought-experiment",
    "tool-steering-challenge",
  ];
  const allowedDifficulties = ["intro", "intermediate", "advanced"];
  const suppliedArtifacts = Array.isArray(challenge.supplied_artifacts) ? challenge.supplied_artifacts : [];
  const runtimeArtifacts = Array.isArray(draftPackage.artifacts) ? draftPackage.artifacts : [];

  for (const field of ["challenge_id", "request_ref", "specialty_pack_ref", "generated_at"]) {
    if (!isNonEmptyString(draftPackage[field])) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "missing-required-string",
        message: `\`${field}\` must be a non-empty string.`,
        field,
      });
    }
  }

  if (!isPlainObject(challenge)) {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "missing-challenge-definition",
      message: "`challenge_definition` must be an object.",
      field: "challenge_definition",
    });
  } else {
    for (const field of ["id", "title", "category", "description", "context"]) {
      if (!isNonEmptyString(challenge[field])) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "missing-required-string",
          message: `\`challenge_definition.${field}\` must be a non-empty string.`,
          field: `challenge_definition.${field}`,
        });
      }
    }

    if (!isAllowedEnum(challenge.archetype, allowedArchetypes)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-archetype",
        message: "`challenge_definition.archetype` must be a valid archetype.",
        field: "challenge_definition.archetype",
      });
    }

    if (!isAllowedEnum(challenge.difficulty, allowedDifficulties)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-difficulty",
        message: "`challenge_definition.difficulty` must be a valid difficulty.",
        field: "challenge_definition.difficulty",
      });
    }

    if (!Number.isInteger(challenge.estimated_time_minutes) || challenge.estimated_time_minutes <= 0) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-estimated-time",
        message: "`challenge_definition.estimated_time_minutes` must be a positive integer.",
        field: "challenge_definition.estimated_time_minutes",
      });
    }

    validateStringListField(challenge.candidate_instructions, "challenge_definition.candidate_instructions", issues);
    validateStringListField(challenge.evaluation_signals, "challenge_definition.evaluation_signals", issues);
    validateTrainingSupportShape(challenge.training_support, issues);
  }

  if (!Array.isArray(suppliedArtifacts) || suppliedArtifacts.length === 0) {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "missing-supplied-artifacts",
      message: "`challenge_definition.supplied_artifacts` must be a non-empty array.",
      field: "challenge_definition.supplied_artifacts",
    });
  }

  if (!Array.isArray(runtimeArtifacts) || runtimeArtifacts.length === 0) {
    collectIssue(issues, {
      stage: "structural",
      severity: "error",
      code: "missing-artifacts",
      message: "`artifacts` must be a non-empty array.",
      field: "artifacts",
    });
  }

  const suppliedMap = new Map();
  const runtimeMap = new Map();

  suppliedArtifacts.forEach((artifact, index) => {
    if (!isPlainObject(artifact)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-supplied-artifact",
        message: `Supplied artifact ${index} must be an object.`,
        field: `challenge_definition.supplied_artifacts[${index}]`,
      });
      return;
    }

    for (const key of ["path", "kind", "purpose"]) {
      if (!isNonEmptyString(artifact[key])) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "invalid-supplied-artifact-field",
          message: `Supplied artifact ${index} is missing a valid \`${key}\`.`,
          field: `challenge_definition.supplied_artifacts[${index}].${key}`,
        });
      }
    }

    if (isNonEmptyString(artifact.path)) {
      if (!artifact.path.startsWith("artifacts/")) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "artifact-path-outside-bundle",
          message: `Supplied artifact path must live under artifacts/: ${artifact.path}`,
          field: `challenge_definition.supplied_artifacts[${index}].path`,
        });
      }
      suppliedMap.set(artifact.path, artifact);
    }
  });

  runtimeArtifacts.forEach((artifact, index) => {
    if (!isPlainObject(artifact)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "invalid-artifact",
        message: `Artifact ${index} must be an object.`,
        field: `artifacts[${index}]`,
      });
      return;
    }

    for (const key of ["path", "kind", "purpose", "content"]) {
      if (!isNonEmptyString(artifact[key])) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "invalid-artifact-field",
          message: `Artifact ${index} is missing a valid \`${key}\`.`,
          field: `artifacts[${index}].${key}`,
        });
      }
    }

    if (isNonEmptyString(artifact.path)) {
      if (!artifact.path.startsWith("artifacts/")) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "artifact-path-outside-bundle",
          message: `Artifact path must live under artifacts/: ${artifact.path}`,
          field: `artifacts[${index}].path`,
        });
      }
      runtimeMap.set(artifact.path, artifact);
    }
  });

  for (const [artifactPath, suppliedArtifact] of suppliedMap.entries()) {
    const runtimeArtifact = runtimeMap.get(artifactPath);
    if (!runtimeArtifact) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "artifact-missing-content",
        message: `Supplied artifact ${artifactPath} does not have a matching artifact entry.`,
        field: "artifacts",
      });
      continue;
    }

    for (const key of ["kind", "purpose"]) {
      if (runtimeArtifact[key] !== suppliedArtifact[key]) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "artifact-metadata-mismatch",
          message: `Artifact ${artifactPath} has mismatched ${key} between supplied_artifacts and artifacts.`,
          field: `artifacts.${artifactPath}.${key}`,
        });
      }
    }
  }

  for (const artifactPath of runtimeMap.keys()) {
    if (!suppliedMap.has(artifactPath)) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "artifact-without-ref",
        message: `Artifact ${artifactPath} is present without a matching supplied_artifacts entry.`,
        field: "artifacts",
      });
    }
  }

  if (request) {
    if (challenge.archetype !== request.archetype) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "request-archetype-mismatch",
        message: "Generated archetype does not match the normalized request.",
        field: "challenge_definition.archetype",
      });
    }

    if (challenge.difficulty !== request.difficulty) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "request-difficulty-mismatch",
        message: "Generated difficulty does not match the normalized request.",
        field: "challenge_definition.difficulty",
      });
    }

    if (challenge.estimated_time_minutes !== request.estimated_time_minutes) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "request-time-mismatch",
        message: "Generated estimated time does not match the normalized request.",
        field: "challenge_definition.estimated_time_minutes",
      });
    }

    if (runtimeArtifacts.length > request.artifact_profile.max_artifacts) {
      collectIssue(issues, {
        stage: "structural",
        severity: "error",
        code: "artifact-budget-exceeded",
        message: "Generated artifact count exceeds the requested artifact budget.",
        field: "artifacts",
        suggested_action: "Reduce artifact count or adjust the artifact profile.",
      });
    }

    for (const requiredKind of request.artifact_profile.required_kinds ?? []) {
      if (!runtimeArtifacts.some((artifact) => artifact.kind === requiredKind)) {
        collectIssue(issues, {
          stage: "structural",
          severity: "error",
          code: "required-artifact-kind-missing",
          message: `Required artifact kind is missing: ${requiredKind}`,
          field: "artifacts",
        });
      }
    }

    if (request.intended_mode === "training" && !challenge.training_support) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "training-support-missing",
        message: "Training-mode generation should usually include training_support scaffolds.",
        field: "challenge_definition.training_support",
        suggested_action: "Add reflection prompts, checkpoints, or hints appropriate for the time budget.",
      });
    }

    if (request.intended_mode === "evaluation" && challenge.training_support) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "training-support-present-in-evaluation",
        message: "Evaluation-mode drafts should not usually include training_support.",
        field: "challenge_definition.training_support",
        suggested_action: "Remove training scaffolds from evaluation-mode output.",
      });
    }

    if (Array.isArray(request.topic_tags) && request.topic_tags.length > 0) {
      const combinedText = [
        challenge.title,
        challenge.description,
        challenge.context,
        ...(challenge.tags ?? []),
      ].join(" ");
      const matchedTopicTags = request.topic_tags.filter((tag) => textContainsAny(combinedText, [tag]));

      if (matchedTopicTags.length === 0) {
        collectIssue(issues, {
          stage: "semantic",
          severity: "warning",
          code: "topic-tag-drift",
          message: "Generated challenge does not reflect the requested topic tags clearly.",
          field: "challenge_definition.tags",
          suggested_action: "Align title, description, or tags more clearly with the requested topics.",
        });
      }
    }
  }

  if (pack) {
    if (isNonEmptyString(pack.id) && isNonEmptyString(challenge.category) && challenge.category === pack.id) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "generic-category",
        message: "Category matches the specialty pack id exactly and may be too broad.",
        field: "challenge_definition.category",
        suggested_action: "Use a narrower category like deployment, rollback, or incident-response.",
      });
    }

    if (Array.isArray(pack.supported_archetypes) && !pack.supported_archetypes.includes(challenge.archetype)) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "error",
        code: "unsupported-pack-archetype",
        message: "Selected specialty pack does not support the generated archetype.",
        field: "challenge_definition.archetype",
      });
    }

    if (Array.isArray(pack.common_failure_modes) && challenge.archetype === "broken-system-investigation") {
      const combinedText = [
        challenge.title,
        challenge.description,
        challenge.context,
        ...runtimeArtifacts.map((artifact) => artifact.content),
      ].join(" ");

      const matchedFailureModes = pack.common_failure_modes.filter((failureMode) =>
        reflectsFailureMode(combinedText, failureMode),
      );

      if (matchedFailureModes.length === 0) {
        collectIssue(issues, {
          stage: "semantic",
          severity: "warning",
          code: "pack-failure-mode-drift",
          message: "Draft does not clearly reflect common failure modes from the selected specialty pack.",
          field: "challenge_definition.context",
          suggested_action: "Ground the scenario in a concrete specialty-appropriate failure mode.",
        });
      }
    }
  }

  if (isNonEmptyString(challenge.description) && challenge.description.trim().split(/\s+/).length < 10) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "thin-description",
      message: "Description is very short and may not anchor the scenario clearly enough.",
      field: "challenge_definition.description",
    });
  }

  if (isNonEmptyString(challenge.context) && challenge.context.trim().split(/\s+/).length < 25) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "thin-context",
      message: "Context is brief and may not provide enough system grounding.",
      field: "challenge_definition.context",
    });
  }

  if (Array.isArray(challenge.evaluation_signals) && challenge.evaluation_signals.length < 2) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "few-evaluation-signals",
      message: "Evaluation signals are sparse for reliable review.",
      field: "challenge_definition.evaluation_signals",
    });
  }

  if (Array.isArray(challenge.evaluation_signals) && runtimeArtifacts.length > 0) {
    const artifactPattern = artifactKeywordPattern(runtimeArtifacts);
    const hasArtifactAnchoredSignal = challenge.evaluation_signals.some((signal) => artifactPattern.test(signal));
    const artifactAnchoredInstructionCount = Array.isArray(challenge.candidate_instructions)
      ? countArtifactAnchoredItems(challenge.candidate_instructions, artifactPattern)
      : 0;

    if (!hasArtifactAnchoredSignal) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "generic-evaluation-signals",
        message: "Evaluation signals are not tied clearly to the supplied artifacts.",
        field: "challenge_definition.evaluation_signals",
        suggested_action: "Reference logs, config, traces, or specific artifact evidence more explicitly.",
      });
    }

    challenge.evaluation_signals.forEach((signal, index) => {
      if (genericSignalPattern(signal) && !artifactPattern.test(signal)) {
        collectIssue(issues, {
          stage: "semantic",
          severity: "warning",
          code: "vague-evaluation-signal",
          message: `Evaluation signal ${index + 1} is generic and weakly grounded.`,
          field: `challenge_definition.evaluation_signals[${index}]`,
        });
      }
    });

    if (Array.isArray(challenge.candidate_instructions) && artifactAnchoredInstructionCount === 0) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "generic-candidate-instructions",
        message: "Candidate instructions are not anchored to the supplied artifacts.",
        field: "challenge_definition.candidate_instructions",
        suggested_action: "Point the learner or candidate at the specific logs, config, traces, or documents provided.",
      });
    }

    challenge.candidate_instructions?.forEach((instruction, index) => {
      if (genericInstructionPattern(instruction) && !artifactPattern.test(instruction)) {
        collectIssue(issues, {
          stage: "semantic",
          severity: "warning",
          code: "vague-candidate-instruction",
          message: `Candidate instruction ${index + 1} is generic and weakly grounded.`,
          field: `challenge_definition.candidate_instructions[${index}]`,
        });
      }
    });
  }

  if (Array.isArray(challenge.tags) && challenge.tags.length === 0) {
    collectIssue(issues, {
      stage: "semantic",
      severity: "warning",
      code: "empty-tags",
      message: "Tags array is present but empty.",
      field: "challenge_definition.tags",
    });
  }

  if (request?.intended_mode === "training" && challenge.training_support) {
    const trainingSupport = challenge.training_support;
    const trainingDepth = request.training_support_depth ?? "standard";
    const trainingScaffoldCount = [
      ...(trainingSupport.reflection_prompts ?? []),
      ...(trainingSupport.thinking_checklist ?? []),
      ...(trainingSupport.checkpoints ?? []),
      ...(trainingSupport.hints ?? []),
    ].length;

    if (trainingDepth === "deep" && trainingScaffoldCount < 6) {
      collectIssue(issues, {
        stage: "semantic",
        severity: "warning",
        code: "training-support-too-thin",
        message: "Training support depth is set to deep, but the scaffolding is still sparse.",
        field: "challenge_definition.training_support",
      });
    }

    trainingSupport.hints?.forEach((hint, index) => {
      if (isLeadingHint(hint.content)) {
        collectIssue(issues, {
          stage: "semantic",
          severity: "warning",
          code: "hint-too-leading",
          message: `Hint ${index + 1} may give away too much of the causal chain.`,
          field: `challenge_definition.training_support.hints[${index}].content`,
          suggested_action: "Rewrite the hint to steer investigation rather than naming the likely answer.",
        });
      }
    });
  }

  const structuralStatus = hasIssueSeverity(issues.filter((issue) => issue.stage === "structural"), "error")
    ? "fail"
    : "pass";
  const semanticIssues = issues.filter((issue) => issue.stage === "semantic");
  const semanticStatus = semanticIssues.some((issue) => issue.severity === "error")
    ? "fail"
    : semanticIssues.some((issue) => issue.severity === "warning")
      ? "warn"
      : "pass";

  let overallRecommendation = "promote";
  if (structuralStatus === "fail" || semanticStatus === "fail") {
    overallRecommendation = "reject";
  } else if (semanticStatus === "warn") {
    overallRecommendation = "repair";
  }

  return {
    challenge_id: draftPackage.challenge_id,
    structural_status: structuralStatus,
    semantic_status: semanticStatus,
    issues,
    overall_recommendation: overallRecommendation,
    generated_at: new Date().toISOString(),
    repaired: Array.isArray(draftPackage.repair_history) && draftPackage.repair_history.length > 0,
    repair_attempts: Array.isArray(draftPackage.repair_history) ? draftPackage.repair_history.length : 0,
  };
}

export function buildMetadata(envelope, inputPath) {
  const { draft_package: draftPackage } = envelope;

  return {
    run_id: draftPackage.run_id ?? null,
    challenge_id: draftPackage.challenge_id,
    request_ref: draftPackage.request_ref,
    specialty_pack_ref: draftPackage.specialty_pack_ref,
    generated_at: draftPackage.generated_at,
    source_input: inputPath,
    generator_metadata: draftPackage.generator_metadata ?? {},
    generation_notes: draftPackage.generation_notes ?? [],
    repair_history: draftPackage.repair_history ?? [],
  };
}

export function buildSkeletonMetadata(skeleton, inputPath) {
  return {
    skeleton_id: skeleton.skeleton_id,
    request_ref: skeleton.request_ref,
    specialty_pack_ref: skeleton.specialty_pack_ref,
    generated_at: skeleton.generated_at,
    source_input: inputPath,
    generator_metadata: skeleton.generator_metadata ?? {},
  };
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function copyDirectory(sourceDir, destinationDir) {
  ensureDirectory(destinationDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

export function removeDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

export function writeDraft(rootDir, envelope, inputPath) {
  const { draft_package: draftPackage } = envelope;
  const runId = draftPackage.run_id ?? draftPackage.challenge_id;
  const outputDir = path.join(rootDir, "generated", "drafts", runId);
  const artifactsDir = path.join(outputDir, "artifacts");

  ensureDirectory(artifactsDir);

  writeYamlFile(path.join(outputDir, "challenge.yaml"), draftPackage.challenge_definition);
  writeYamlFile(path.join(outputDir, "request.yaml"), envelope.request);
  writeYamlFile(path.join(outputDir, "metadata.yaml"), buildMetadata(envelope, inputPath));

  if (envelope.validation_report) {
    writeYamlFile(path.join(outputDir, "validation-report.yaml"), envelope.validation_report);
  }

  if (envelope.promotion_record) {
    writeYamlFile(path.join(outputDir, "promotion-record.yaml"), envelope.promotion_record);
  }

  for (const artifact of draftPackage.artifacts) {
    if (!isNonEmptyString(artifact.path)) {
      fail("Each draft artifact must include a non-empty `path`.");
    }

    const artifactPath = path.join(outputDir, artifact.path);
    ensureDirectory(path.dirname(artifactPath));
    fs.writeFileSync(artifactPath, String(artifact.content ?? ""), "utf8");
  }

  return outputDir;
}

export function writeSkeleton(rootDir, envelope, inputPath) {
  const { scenario_skeleton: skeleton } = envelope;
  const runId = skeleton.generator_metadata?.run_id ?? skeleton.skeleton_id;
  const outputDir = path.join(rootDir, "generated", "skeletons", runId);

  ensureDirectory(outputDir);

  writeYamlFile(path.join(outputDir, "skeleton.yaml"), skeleton);
  writeYamlFile(path.join(outputDir, "request.yaml"), envelope.request);
  writeYamlFile(path.join(outputDir, "metadata.yaml"), buildSkeletonMetadata(skeleton, inputPath));

  if (envelope.validation_report) {
    writeYamlFile(path.join(outputDir, "validation-report.yaml"), envelope.validation_report);
  }

  return outputDir;
}

export function extractJsonObject(text) {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return {
      parsed: JSON.parse(cleaned),
      candidate: cleaned,
    };
  } catch {
    const anchored = extractAnchoredDraftPackageCandidate(cleaned);
    if (anchored) {
      return anchored;
    }

    const candidates = extractBalancedJsonCandidates(cleaned);

    if (candidates.length === 0) {
      fail("Model output did not contain a parseable JSON object.");
    }

    let lastError = null;
    let lastParsedFallback = null;

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const candidate = candidates[index];

      try {
        const parsed = JSON.parse(candidate);
        if (looksLikeDraftChallengePackage(parsed)) {
          return {
            parsed,
            candidate,
          };
        }

        if (!lastParsedFallback) {
          lastParsedFallback = {
            parsed,
            candidate,
          };
        }
      } catch (error) {
        lastError = {
          message: error.message,
          candidate,
        };
      }
    }

    if (lastParsedFallback) {
      return lastParsedFallback;
    }

    if (lastError) {
      const context = buildJsonErrorContext(lastError.candidate, lastError.message);
      fail(`Model output was not valid JSON: ${lastError.message}\n\n${context}`);
    }

    fail("Model output did not contain a parseable JSON object.");
  }
}

function extractBalancedJsonCandidates(text) {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  const candidates = [];

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth === 0) {
        continue;
      }

      depth -= 1;
      if (depth === 0 && start !== -1) {
        candidates.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return candidates;
}

function buildJsonErrorContext(candidate, message) {
  const match = message.match(/position (\d+)/i);
  if (!match) {
    return "Could not determine JSON error position.";
  }

  const position = Number(match[1]);
  if (!Number.isFinite(position)) {
    return "Could not determine JSON error position.";
  }

  const start = Math.max(0, position - 160);
  const end = Math.min(candidate.length, position + 160);
  const excerpt = candidate.slice(start, end);

  return [
    `JSON error context around position ${position}:`,
    excerpt,
  ].join("\n");
}
