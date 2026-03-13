import fs from "node:fs";
import path from "node:path";
import { ensureDirectory, extractJsonObject, fail } from "./lib.mjs";

const rootDir = process.cwd();

function getStageDir(runId, stageName) {
  return path.join(rootDir, "generated", "raw", runId, stageName);
}

function initializeStageArtifacts(runId, stageName, prompt) {
  const stageDir = getStageDir(runId, stageName);
  ensureDirectory(stageDir);
  fs.writeFileSync(path.join(stageDir, "prompt.txt"), prompt, "utf8");
  return stageDir;
}

function writeStageResponse(stageDir, rawOutput) {
  fs.writeFileSync(path.join(stageDir, "response.txt"), rawOutput, "utf8");
}

function writeStageRequest(stageDir, requestBody) {
  fs.writeFileSync(path.join(stageDir, "request.json"), JSON.stringify(requestBody, null, 2), "utf8");
}

function writeStageError(stageDir, error) {
  fs.writeFileSync(path.join(stageDir, "error.txt"), String(error ?? "").trim(), "utf8");
}

function normalizeOllamaHost(host) {
  const candidate = String(host || process.env.OLLAMA_HOST || "127.0.0.1:11434").trim();
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate.replace(/\/+$/, "");
  }
  return `http://${candidate.replace(/\/+$/, "")}`;
}

function buildGenerateOptions(settings = {}) {
  const options = {};

  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    options[key] = value;
  }

  return options;
}

async function runOllamaApi(model, prompt, config = {}) {
  const apiBaseUrl = normalizeOllamaHost(config.host);
  const requestBody = {
    model,
    prompt,
    stream: false,
    think: config.think ?? undefined,
    format: "json",
    options: buildGenerateOptions({
      temperature: config.temperature,
      top_p: config.topP,
      top_k: config.topK,
      min_p: config.minP,
      presence_penalty: config.presencePenalty,
      repetition_penalty: config.repetitionPenalty,
    }),
  };

  const response = await fetch(`${apiBaseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Ollama API request failed (${response.status}): ${text || response.statusText}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== "object") {
    fail("Ollama API returned an invalid response payload.");
  }

  return {
    rawOutput: String(payload.response ?? ""),
    requestBody,
    payload,
  };
}

export function createProvider({
  provider = "ollama",
  model = "qwen3.5:4b",
  think = null,
  hideThinking = false,
  host = null,
  temperature = null,
  topP = null,
  topK = null,
  minP = null,
  presencePenalty = null,
  repetitionPenalty = null,
} = {}) {
  if (provider !== "ollama") {
    fail(`Unsupported provider: ${provider}`);
  }

  return {
    provider,
    model,
    think,
    hideThinking,
    host: normalizeOllamaHost(host),
    temperature,
    topP,
    topK,
    minP,
    presencePenalty,
    repetitionPenalty,
    async generateObject({ runId, stageName, prompt }) {
      const rawDir = initializeStageArtifacts(runId, stageName, prompt);
      let rawOutput = "";

      try {
        const response = await runOllamaApi(model, prompt, {
          host,
          think,
          temperature,
          topP,
          topK,
          minP,
          presencePenalty,
          repetitionPenalty,
        });

        rawOutput = response.rawOutput;
        writeStageRequest(rawDir, response.requestBody);
        writeStageResponse(rawDir, hideThinking ? rawOutput.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() : rawOutput);
      } catch (error) {
        writeStageError(rawDir, error.message ?? error);
        throw error;
      }

      const extraction = extractJsonObject(rawOutput);
      return {
        parsed: extraction.parsed,
        rawDir,
        rawOutput,
      };
    },
  };
}
