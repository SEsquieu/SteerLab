import path from "node:path";
import {
  buildValidationReport,
  fail,
  loadStructuredFile,
  validateEnvelope,
  writeDraft,
} from "./lib.mjs";

const rootDir = process.cwd();

function loadEnvelope(inputPath) {
  return loadStructuredFile(rootDir, inputPath);
}

function main() {
  const [, , inputPath] = process.argv;

  if (!inputPath) {
    fail("Usage: node scripts/generation/scaffold-draft.mjs <input.yaml|input.json>");
  }

  const envelope = loadEnvelope(inputPath);
  validateEnvelope(envelope);
  if (!envelope.validation_report) {
    envelope.validation_report = buildValidationReport({
      draftPackage: envelope.draft_package,
      request: envelope.request,
      pack: null,
    });
  }
  const outputDir = writeDraft(rootDir, envelope, inputPath);
  console.log(`Wrote generated draft to ${path.relative(rootDir, outputDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
