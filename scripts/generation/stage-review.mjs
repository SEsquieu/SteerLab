import path from "node:path";
import {
  copyDirectory,
  fail,
  pathExists,
  readYamlFile,
  removeDirectory,
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

    if (!args.draftDir) {
      args.draftDir = token;
      continue;
    }

    fail(`Unrecognized argument: ${token}`);
  }

  if (!args.draftDir) {
    fail("Usage: node scripts/generation/stage-review.mjs <generated-draft-dir> [--overwrite]");
  }

  return args;
}

function createPromotionRecord({ challengeId, sourceMode, stagedPath }) {
  return {
    challenge_id: challengeId,
    source_mode: sourceMode,
    destination: "repo-candidate",
    decision: "approved",
    basis: "automatic",
    validation_report_ref: "validation-report.yaml",
    decided_at: new Date().toISOString(),
    decided_by: "stage-review-script",
    notes: [
      `Staged into ${stagedPath.replace(/\\/g, "/")} for human review before repo curation.`,
    ],
    next_actions: [
      "Inspect challenge.yaml, artifacts, and validation-report.yaml in generated/review/.",
      "Promote into challenges/ only after human review confirms the draft is worth curating.",
    ],
  };
}

function createReviewSummary({ challenge, metadata, request, validationReport }) {
  return {
    challenge_id: challenge.id,
    title: challenge.title,
    archetype: challenge.archetype,
    category: challenge.category,
    specialty_pack_ref: metadata.specialty_pack_ref,
    intended_mode: request?.intended_mode ?? "unknown",
    source_request: request?.source_request ?? null,
    estimated_time_minutes: challenge.estimated_time_minutes,
    structural_status: validationReport.structural_status,
    semantic_status: validationReport.semantic_status,
    overall_recommendation: validationReport.overall_recommendation,
    repair_attempts: validationReport.repair_attempts ?? 0,
    repaired: validationReport.repaired ?? false,
    issue_codes: (validationReport.issues ?? []).map((issue) => issue.code),
    generated_at: metadata.generated_at ?? null,
    staged_at: new Date().toISOString(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const draftDir = path.resolve(rootDir, args.draftDir);

  if (!pathExists(draftDir)) {
    fail(`Draft directory does not exist: ${args.draftDir}`);
  }

  const challengePath = path.join(draftDir, "challenge.yaml");
  const metadataPath = path.join(draftDir, "metadata.yaml");
  const requestPath = path.join(draftDir, "request.yaml");
  const validationReportPath = path.join(draftDir, "validation-report.yaml");

  for (const requiredPath of [challengePath, metadataPath, requestPath, validationReportPath]) {
    if (!pathExists(requiredPath)) {
      fail(`Draft is missing required file: ${path.relative(rootDir, requiredPath)}`);
    }
  }

  const challenge = readYamlFile(challengePath);
  const metadata = readYamlFile(metadataPath);
  const request = readYamlFile(requestPath);
  const validationReport = readYamlFile(validationReportPath);

  if (validationReport.structural_status !== "pass") {
    fail("Only structurally valid drafts can move into generated/review/.");
  }

  if (validationReport.overall_recommendation !== "promote") {
    fail(
      `Only drafts with overall_recommendation=promote can move into generated/review/.\nCurrent recommendation: ${validationReport.overall_recommendation}`,
    );
  }

  const reviewDirName = metadata.run_id ?? challenge.id;
  const targetDir = path.join(rootDir, "generated", "review", reviewDirName);

  if (pathExists(targetDir)) {
    if (!args.overwrite) {
      fail(
        `Review directory already exists: ${path.relative(rootDir, targetDir)}\nUse --overwrite to replace it.`,
      );
    }

    removeDirectory(targetDir);
  }

  copyDirectory(draftDir, targetDir);

  const stagedPath = path.relative(rootDir, targetDir);
  const promotionRecord = createPromotionRecord({
    challengeId: challenge.id,
    sourceMode: request?.intended_mode ?? "draft-review",
    stagedPath,
  });
  const reviewSummary = createReviewSummary({
    challenge,
    metadata,
    request,
    validationReport,
  });

  writeYamlFile(path.join(targetDir, "promotion-record.yaml"), promotionRecord);
  writeYamlFile(path.join(targetDir, "review-summary.yaml"), reviewSummary);
  writeYamlFile(path.join(draftDir, "promotion-record.yaml"), promotionRecord);

  console.log(`Staged draft into ${stagedPath.replace(/\\/g, "/")}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
