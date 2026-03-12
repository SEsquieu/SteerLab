import fs from "node:fs";
import path from "node:path";
import {
  buildValidationReport,
  fail,
  loadStructuredFile,
  pathExists,
  readYamlFile,
  validateDraftPackage,
  writeYamlFile,
} from "./lib.mjs";

const rootDir = process.cwd();

function parseArgs(argv) {
  const args = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--pack") {
      args.packPath = argv[index + 1];
      index += 1;
      continue;
    }

    positional.push(token);
  }

  if (!args.draftDir && positional.length > 0) {
    args.draftDir = positional[0];
  }

  if (!args.packPath && positional.length > 1) {
    args.packPath = positional[1];
  }

  if (!args.draftDir) {
    fail("Usage: node scripts/generation/validate-draft.mjs <generated-draft-dir> [--pack specialties/<name>/pack.yaml]");
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const draftDir = path.resolve(rootDir, args.draftDir);

  if (!pathExists(draftDir)) {
    fail(`Draft directory does not exist: ${args.draftDir}`);
  }

  const challengeDefinition = readYamlFile(path.join(draftDir, "challenge.yaml"));
  const metadata = readYamlFile(path.join(draftDir, "metadata.yaml"));
  const request = readYamlFile(path.join(draftDir, "request.yaml"));
  const pack = args.packPath ? loadStructuredFile(rootDir, args.packPath) : null;

  const artifacts = (challengeDefinition.supplied_artifacts ?? []).map((artifact) => {
    const artifactPath = path.join(draftDir, artifact.path);
    return {
      ...artifact,
      content: pathExists(artifactPath) ? String(fs.readFileSync(artifactPath, "utf8")) : "",
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

  const report = buildValidationReport({
    draftPackage,
    request,
    pack,
  });

  const reportPath = path.join(draftDir, "validation-report.yaml");
  writeYamlFile(reportPath, report);

  console.log(`Wrote validation report to ${path.relative(rootDir, reportPath)}`);
  console.log(
    `Validation result: structural=${report.structural_status}, semantic=${report.semantic_status}, recommendation=${report.overall_recommendation}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
