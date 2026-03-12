import path from "node:path";
import {
  buildSkeletonValidationReport,
  fail,
  loadStructuredFile,
  pathExists,
  readYamlFile,
  validateScenarioSkeleton,
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

  if (!args.skeletonDir && positional.length > 0) {
    args.skeletonDir = positional[0];
  }

  if (!args.packPath && positional.length > 1) {
    args.packPath = positional[1];
  }

  if (!args.skeletonDir) {
    fail("Usage: node scripts/generation/validate-skeleton.mjs <generated-skeleton-dir> [--pack specialties/<name>/pack.yaml]");
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const skeletonDir = path.resolve(rootDir, args.skeletonDir);

  if (!pathExists(skeletonDir)) {
    fail(`Skeleton directory does not exist: ${args.skeletonDir}`);
  }

  const skeleton = readYamlFile(path.join(skeletonDir, "skeleton.yaml"));
  const request = readYamlFile(path.join(skeletonDir, "request.yaml"));
  const pack = args.packPath ? loadStructuredFile(rootDir, args.packPath) : null;

  validateScenarioSkeleton(skeleton);

  const report = buildSkeletonValidationReport({
    skeleton,
    request,
    pack,
  });

  const reportPath = path.join(skeletonDir, "validation-report.yaml");
  writeYamlFile(reportPath, report);

  console.log(`Wrote skeleton validation report to ${path.relative(rootDir, reportPath)}`);
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
