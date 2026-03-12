import fs from "node:fs";
import path from "node:path";
import {
  buildValidationReport,
  copyDirectory,
  fail,
  isNonEmptyString,
  loadStructuredFile,
  pathExists,
  readYamlFile,
  slugify,
  validateDraftPackage,
  writeYamlFile,
} from "./lib.mjs";

const rootDir = process.cwd();

function parseArgs(argv) {
  const args = {
    overwrite: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--overwrite") {
      args.overwrite = true;
      continue;
    }

    if (token === "--slug") {
      const slug = argv[index + 1];
      if (!isNonEmptyString(slug)) {
        fail("`--slug` requires a non-empty value.");
      }
      args.slug = slugify(slug);
      index += 1;
      continue;
    }

    if (token === "--pack") {
      const packPath = argv[index + 1];
      if (!isNonEmptyString(packPath)) {
        fail("`--pack` requires a non-empty value.");
      }
      args.packPath = packPath;
      index += 1;
      continue;
    }

    if (!args.draftDir) {
      args.draftDir = token;
      continue;
    }

    fail(`Unrecognized argument: ${token}`);
  }

  if (!isNonEmptyString(args.draftDir)) {
    fail("Usage: node scripts/generation/promote-draft.mjs <generated-draft-dir> [--slug <slug>] [--overwrite]");
  }

  return args;
}

function loadDraftPackageFromDirectory(draftDir) {
  const challengePath = path.join(draftDir, "challenge.yaml");
  const metadataPath = path.join(draftDir, "metadata.yaml");
  const artifactsDir = path.join(draftDir, "artifacts");

  if (!pathExists(challengePath)) {
    fail(`Draft is missing challenge.yaml: ${path.relative(rootDir, challengePath)}`);
  }

  if (!pathExists(metadataPath)) {
    fail(`Draft is missing metadata.yaml: ${path.relative(rootDir, metadataPath)}`);
  }

  if (!pathExists(artifactsDir)) {
    fail(`Draft is missing artifacts/: ${path.relative(rootDir, artifactsDir)}`);
  }

  const challengeDefinition = readYamlFile(challengePath);
  const metadata = readYamlFile(metadataPath);

  if (!challengeDefinition || typeof challengeDefinition !== "object" || Array.isArray(challengeDefinition)) {
    fail("Draft challenge.yaml must contain an object.");
  }

  const artifacts = [];

  for (const artifact of challengeDefinition.supplied_artifacts ?? []) {
    const artifactPath = path.join(draftDir, artifact.path);
    if (!pathExists(artifactPath)) {
      fail(`Draft artifact is missing: ${path.relative(rootDir, artifactPath)}`);
    }

    artifacts.push({
      ...artifact,
      content: fs.readFileSync(artifactPath, "utf8"),
    });
  }

  const draftPackage = {
    run_id: metadata.run_id ?? undefined,
    challenge_id: challengeDefinition.id,
    request_ref: metadata.request_ref ?? "unknown-request",
    specialty_pack_ref: metadata.specialty_pack_ref ?? "unknown-pack",
    generated_at: metadata.generated_at ?? new Date().toISOString(),
    challenge_definition: challengeDefinition,
    artifacts,
    generator_metadata: metadata.generator_metadata ?? {},
    generation_notes: metadata.generation_notes ?? [],
    repair_history: metadata.repair_history ?? [],
  };

  validateDraftPackage(draftPackage);
  return { draftPackage, metadata };
}

function createPromotionRecord({ challengeId, validationReportRef, promotedPath, recommendation }) {
  return {
    challenge_id: challengeId,
    source_mode: "draft-review",
    destination: "repo-candidate",
    decision: "approved",
    basis: "human-review",
    validation_report_ref: validationReportRef,
    decided_at: new Date().toISOString(),
    decided_by: "manual-promotion-script",
    notes: [
      `Promoted into ${promotedPath.replace(/\\/g, "/")} for frontend inspection.`,
      `Validation recommendation at promotion time: ${recommendation}.`,
    ],
    next_actions: [
      "Run npm run validate:challenges.",
      "Restart the runner dev server if it was already running.",
      "Review the promoted challenge for semantic quality before keeping it curated.",
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const draftDir = path.resolve(rootDir, args.draftDir);

  if (!pathExists(draftDir)) {
    fail(`Draft directory does not exist: ${args.draftDir}`);
  }

  const { draftPackage } = loadDraftPackageFromDirectory(draftDir);
  const requestPath = path.join(draftDir, "request.yaml");
  const validationReportPath = path.join(draftDir, "validation-report.yaml");
  const request = pathExists(requestPath) ? readYamlFile(requestPath) : null;
  const pack = args.packPath ? loadStructuredFile(rootDir, args.packPath) : null;
  const validationReport = pathExists(validationReportPath)
    ? readYamlFile(validationReportPath)
    : buildValidationReport({ draftPackage, request, pack });

  if (!pathExists(validationReportPath)) {
    writeYamlFile(validationReportPath, validationReport);
  }

  if (validationReport.structural_status !== "pass") {
    fail(
      `Draft failed structural validation and cannot be promoted: ${validationReportPath}\nRecommendation: ${validationReport.overall_recommendation}`,
    );
  }

  const challenge = draftPackage.challenge_definition;
  const slug = args.slug ?? slugify(challenge.id);
  const targetDir = path.join(rootDir, "challenges", challenge.archetype, slug);
  const targetArtifactsDir = path.join(targetDir, "artifacts");

  if (pathExists(targetDir)) {
    if (!args.overwrite) {
      fail(
        `Target challenge directory already exists: ${path.relative(rootDir, targetDir)}\nUse --overwrite to replace it.`,
      );
    }

    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  fs.mkdirSync(targetArtifactsDir, { recursive: true });
  writeYamlFile(path.join(targetDir, "challenge.yaml"), challenge);
  copyDirectory(path.join(draftDir, "artifacts"), targetArtifactsDir);

  const promotedPath = path.relative(rootDir, targetDir);
  const promotionRecord = createPromotionRecord({
    challengeId: challenge.id,
    validationReportRef: "validation-report.yaml",
    promotedPath,
    recommendation: validationReport.overall_recommendation,
  });

  writeYamlFile(path.join(draftDir, "promotion-record.yaml"), promotionRecord);

  console.log(`Promoted draft to ${promotedPath.replace(/\\/g, "/")}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
