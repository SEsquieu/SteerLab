import fs from "node:fs";
import path from "node:path";
import yaml from "../../apps/runner/node_modules/js-yaml/dist/js-yaml.mjs";

const rootDir = process.cwd();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeYamlFile(filePath, value) {
  fs.writeFileSync(filePath, yaml.dump(value, { noRefs: true, lineWidth: 100 }), "utf8");
}

function loadEnvelope(inputPath) {
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

function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    fail("Input must be an object with `request` and `draft_package`.");
  }

  if (!envelope.request || typeof envelope.request !== "object" || Array.isArray(envelope.request)) {
    fail("Input is missing a valid `request` object.");
  }

  if (
    !envelope.draft_package ||
    typeof envelope.draft_package !== "object" ||
    Array.isArray(envelope.draft_package)
  ) {
    fail("Input is missing a valid `draft_package` object.");
  }

  const challengeId = envelope.draft_package.challenge_id;
  if (!isNonEmptyString(challengeId)) {
    fail("`draft_package.challenge_id` must be a non-empty string.");
  }

  if (!envelope.draft_package.challenge_definition || typeof envelope.draft_package.challenge_definition !== "object") {
    fail("`draft_package.challenge_definition` must be an object.");
  }

  if (envelope.draft_package.challenge_definition.id !== challengeId) {
    fail("`draft_package.challenge_definition.id` must match `draft_package.challenge_id`.");
  }

  if (!Array.isArray(envelope.draft_package.artifacts)) {
    fail("`draft_package.artifacts` must be an array.");
  }
}

function buildMetadata(envelope, inputPath) {
  const { draft_package: draftPackage } = envelope;

  return {
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

function writeDraft(envelope, inputPath) {
  const { draft_package: draftPackage } = envelope;
  const outputDir = path.join(rootDir, "generated", "drafts", draftPackage.challenge_id);
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

  console.log(`Wrote generated draft to ${path.relative(rootDir, outputDir)}`);
}

function main() {
  const [, , inputPath] = process.argv;

  if (!inputPath) {
    fail("Usage: node scripts/generation/scaffold-draft.mjs <input.yaml|input.json>");
  }

  const envelope = loadEnvelope(inputPath);
  validateEnvelope(envelope);
  writeDraft(envelope, inputPath);
}

main();
