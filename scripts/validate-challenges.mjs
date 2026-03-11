import fs from "node:fs";
import path from "node:path";
import yaml from "../apps/runner/node_modules/js-yaml/dist/js-yaml.mjs";

const rootDir = process.cwd();
const challengesDir = path.join(rootDir, "challenges");
const allowedArchetypes = new Set([
  "broken-system-investigation",
  "architecture-thought-experiment",
  "tool-steering-challenge",
]);

const requiredStringFields = [
  "id",
  "title",
  "archetype",
  "category",
  "description",
  "context",
  "difficulty",
];

const errors = [];
const warnings = [];
let validatedCount = 0;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateStringList(value, fieldName, filePath) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${filePath}: \`${fieldName}\` must be a non-empty array.`);
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${filePath}: \`${fieldName}[${index}]\` must be a non-empty string.`);
    }
  });
}

function validateArtifactList(challenge, challengeDir, filePath) {
  const artifacts = challenge.supplied_artifacts;

  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    errors.push(`${filePath}: \`supplied_artifacts\` must be a non-empty array.`);
    return;
  }

  artifacts.forEach((artifact, index) => {
    if (!artifact || typeof artifact !== "object") {
      errors.push(`${filePath}: \`supplied_artifacts[${index}]\` must be an object.`);
      return;
    }

    for (const key of ["path", "kind", "purpose"]) {
      if (!isNonEmptyString(artifact[key])) {
        errors.push(`${filePath}: \`supplied_artifacts[${index}].${key}\` must be a non-empty string.`);
      }
    }

    if (isNonEmptyString(artifact.path)) {
      const artifactPath = path.join(challengeDir, artifact.path);
      if (!fs.existsSync(artifactPath)) {
        errors.push(`${filePath}: artifact path does not exist: ${artifact.path}`);
      }
    }
  });
}

function validateRubric(challenge, filePath) {
  if (!challenge.rubric) {
    return;
  }

  if (typeof challenge.rubric !== "object" || Array.isArray(challenge.rubric)) {
    errors.push(`${filePath}: \`rubric\` must be an object when provided.`);
    return;
  }

  for (const rubricField of ["strong", "weak"]) {
    const rubricItems = challenge.rubric[rubricField];
    if (rubricItems === undefined) {
      continue;
    }

    if (!Array.isArray(rubricItems)) {
      errors.push(`${filePath}: \`rubric.${rubricField}\` must be an array.`);
      continue;
    }

    rubricItems.forEach((item, index) => {
      if (!isNonEmptyString(item)) {
        warnings.push(
          `${filePath}: \`rubric.${rubricField}[${index}]\` is not a plain string. Quote list items containing colons.`,
        );
      }
    });
  }
}

function validateTrainingSupport(challenge, filePath) {
  if (!challenge.training_support) {
    return;
  }

  if (typeof challenge.training_support !== "object" || Array.isArray(challenge.training_support)) {
    errors.push(`${filePath}: \`training_support\` must be an object when provided.`);
    return;
  }

  for (const fieldName of ["reflection_prompts", "thinking_checklist"]) {
    const value = challenge.training_support[fieldName];
    if (value === undefined) {
      continue;
    }

    if (!Array.isArray(value)) {
      errors.push(`${filePath}: \`training_support.${fieldName}\` must be an array.`);
      continue;
    }

    value.forEach((item, index) => {
      if (!isNonEmptyString(item)) {
        errors.push(
          `${filePath}: \`training_support.${fieldName}[${index}]\` must be a non-empty string.`,
        );
      }
    });
  }

  const hints = challenge.training_support.hints;
  if (hints !== undefined) {
    if (!Array.isArray(hints)) {
      errors.push(`${filePath}: \`training_support.hints\` must be an array.`);
    } else {
      hints.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors.push(`${filePath}: \`training_support.hints[${index}]\` must be an object.`);
          return;
        }

        for (const key of ["title", "content"]) {
          if (!isNonEmptyString(item[key])) {
            errors.push(
              `${filePath}: \`training_support.hints[${index}].${key}\` must be a non-empty string.`,
            );
          }
        }
      });
    }
  }

  const workedExamples = challenge.training_support.worked_examples;
  if (workedExamples === undefined) {
    return;
  }

  if (!Array.isArray(workedExamples)) {
    errors.push(`${filePath}: \`training_support.worked_examples\` must be an array.`);
    return;
  }

  workedExamples.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${filePath}: \`training_support.worked_examples[${index}]\` must be an object.`);
      return;
    }

    for (const key of ["label", "href"]) {
      if (!isNonEmptyString(item[key])) {
        errors.push(
          `${filePath}: \`training_support.worked_examples[${index}].${key}\` must be a non-empty string.`,
        );
      }
    }
  });
}

function validateChallenge(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  let challenge;

  try {
    challenge = yaml.load(source);
  } catch (error) {
    errors.push(`${filePath}: YAML parse failure: ${error.message}`);
    return;
  }

  if (!challenge || typeof challenge !== "object" || Array.isArray(challenge)) {
    errors.push(`${filePath}: challenge definition must be a YAML object.`);
    return;
  }

  requiredStringFields.forEach((field) => {
    if (!isNonEmptyString(challenge[field])) {
      errors.push(`${filePath}: \`${field}\` must be a non-empty string.`);
    }
  });

  if (!Number.isInteger(challenge.estimated_time_minutes) || challenge.estimated_time_minutes <= 0) {
    errors.push(`${filePath}: \`estimated_time_minutes\` must be a positive integer.`);
  }

  if (!allowedArchetypes.has(challenge.archetype)) {
    errors.push(`${filePath}: \`archetype\` must be one of ${Array.from(allowedArchetypes).join(", ")}.`);
  }

  const challengeDir = path.dirname(filePath);
  const folderArchetype = path.relative(challengesDir, challengeDir).split(path.sep)[0];
  if (folderArchetype && folderArchetype !== "_templates" && challenge.archetype !== folderArchetype) {
    errors.push(`${filePath}: folder archetype \`${folderArchetype}\` does not match challenge archetype \`${challenge.archetype}\`.`);
  }

  validateStringList(challenge.candidate_instructions, "candidate_instructions", filePath);
  validateStringList(challenge.evaluation_signals, "evaluation_signals", filePath);
  validateArtifactList(challenge, challengeDir, filePath);
  validateRubric(challenge, filePath);
  validateTrainingSupport(challenge, filePath);

  validatedCount += 1;
}

function findChallengeFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "_templates") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findChallengeFiles(fullPath);
    } else if (entry.isFile() && entry.name === "challenge.yaml") {
      validateChallenge(fullPath);
    }
  }
}

if (!fs.existsSync(challengesDir)) {
  console.error("No challenges directory found.");
  process.exit(1);
}

findChallengeFiles(challengesDir);

warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

if (errors.length > 0) {
  errors.forEach((error) => console.error(`Error: ${error}`));
  process.exit(1);
}

console.log(`Validated ${validatedCount} challenge files successfully.`);
if (warnings.length > 0) {
  console.log(`${warnings.length} warning(s) emitted.`);
}
