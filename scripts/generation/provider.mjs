import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDirectory, extractJsonObject, fail } from "./lib.mjs";

const rootDir = process.cwd();

function writeStageArtifacts(runId, stageName, prompt, rawOutput) {
  const stageDir = path.join(rootDir, "generated", "raw", runId, stageName);
  ensureDirectory(stageDir);
  fs.writeFileSync(path.join(stageDir, "prompt.txt"), prompt, "utf8");
  fs.writeFileSync(path.join(stageDir, "response.txt"), rawOutput, "utf8");
  return stageDir;
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

export function createProvider({ provider = "ollama", model = "qwen3.5:4b" } = {}) {
  if (provider !== "ollama") {
    fail(`Unsupported provider: ${provider}`);
  }

  return {
    provider,
    model,
    generateObject({ runId, stageName, prompt }) {
      const rawOutput = runOllama(model, prompt);
      const rawDir = writeStageArtifacts(runId, stageName, prompt, rawOutput);
      const extraction = extractJsonObject(rawOutput);
      return {
        parsed: extraction.parsed,
        rawDir,
        rawOutput,
      };
    },
  };
}
