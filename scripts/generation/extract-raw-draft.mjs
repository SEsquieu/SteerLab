import fs from "node:fs";
import path from "node:path";
import {
  buildValidationReport,
  extractJsonObject,
  fail,
  loadStructuredFile,
  validateDraftPackage,
  writeDraft,
} from "./lib.mjs";

const rootDir = process.cwd();

function parseArgs(argv) {
  const options = {
    requestPath: "",
    packPath: "",
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--request") {
      options.requestPath = argv[index + 1] ?? "";
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

  if (!options.rawDir && positional.length > 0) {
    options.rawDir = positional[0];
  }

  if (!options.requestPath && positional.length > 1) {
    options.requestPath = positional[1];
  }

  if (!options.packPath && positional.length > 2) {
    options.packPath = positional[2];
  }

  if (!options.rawDir || !options.requestPath || !options.packPath) {
    fail(
      "Usage: node scripts/generation/extract-raw-draft.mjs <raw-run-dir> --request <request.yaml> --pack <pack.yaml>",
    );
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rawDir = path.resolve(rootDir, options.rawDir);
  const responsePath = path.join(rawDir, "response.txt");

  if (!fs.existsSync(rawDir)) {
    fail(`Raw run directory does not exist: ${options.rawDir}`);
  }

  if (!fs.existsSync(responsePath)) {
    fail(`Raw run directory is missing response.txt: ${path.relative(rootDir, responsePath)}`);
  }

  const rawResponse = fs.readFileSync(responsePath, "utf8");
  const extraction = extractJsonObject(rawResponse);
  const request = loadStructuredFile(rootDir, options.requestPath);
  const pack = loadStructuredFile(rootDir, options.packPath);
  const draftPackage = extraction.parsed;

  draftPackage.run_id ??= path.basename(rawDir);

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

  const outputDir = writeDraft(rootDir, envelope, options.requestPath);

  console.log(`Extracted draft from ${path.relative(rootDir, responsePath)}`);
  console.log(`Wrote generated draft to ${path.relative(rootDir, outputDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
