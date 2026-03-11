import yaml from "js-yaml";
import type { Challenge, LoadedChallenge } from "./types";

import featureFlagChallenge from "../../../challenges/architecture-thought-experiment/feature-flag-migration/challenge.yaml?raw";
import featureFlagOverview from "../../../challenges/architecture-thought-experiment/feature-flag-migration/artifacts/system-overview.md?raw";
import featureFlagPattern from "../../../challenges/architecture-thought-experiment/feature-flag-migration/artifacts/current-flag-pattern.ts?raw";

import analyticsChallenge from "../../../challenges/architecture-thought-experiment/analytics-event-pipeline/challenge.yaml?raw";
import analyticsState from "../../../challenges/architecture-thought-experiment/analytics-event-pipeline/artifacts/current-state.md?raw";
import analyticsSchema from "../../../challenges/architecture-thought-experiment/analytics-event-pipeline/artifacts/schema-drift-example.json?raw";

import cacheChallenge from "../../../challenges/broken-system-investigation/cache-stampede-catalog-api/challenge.yaml?raw";
import cacheCode from "../../../challenges/broken-system-investigation/cache-stampede-catalog-api/artifacts/cache.ts?raw";
import cacheLog from "../../../challenges/broken-system-investigation/cache-stampede-catalog-api/artifacts/incident.log?raw";
import cacheMetrics from "../../../challenges/broken-system-investigation/cache-stampede-catalog-api/artifacts/metrics.md?raw";

import webhookChallenge from "../../../challenges/broken-system-investigation/webhook-retry-storm/challenge.yaml?raw";
import webhookHandler from "../../../challenges/broken-system-investigation/webhook-retry-storm/artifacts/webhook-handler.ts?raw";
import webhookLog from "../../../challenges/broken-system-investigation/webhook-retry-storm/artifacts/delivery.log?raw";
import webhookDb from "../../../challenges/broken-system-investigation/webhook-retry-storm/artifacts/db-note.md?raw";

import migrationChallenge from "../../../challenges/tool-steering-challenge/legacy-typescript-migration/challenge.yaml?raw";
import migrationSummary from "../../../challenges/tool-steering-challenge/legacy-typescript-migration/artifacts/module-summary.md?raw";
import migrationComponent from "../../../challenges/tool-steering-challenge/legacy-typescript-migration/artifacts/component-example.tsx?raw";

import incidentChallenge from "../../../challenges/tool-steering-challenge/incident-triage-with-ai/challenge.yaml?raw";
import incidentConstraints from "../../../challenges/tool-steering-challenge/incident-triage-with-ai/artifacts/incident-constraints.md?raw";
import incidentLog from "../../../challenges/tool-steering-challenge/incident-triage-with-ai/artifacts/log-sample.txt?raw";

function parseChallenge(source: string): Challenge {
  return yaml.load(source) as Challenge;
}

function normalizeRubricItems(items: unknown): string[] | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }

  return items.map((item) => {
    if (typeof item === "string") {
      return item;
    }

    if (item && typeof item === "object") {
      return Object.entries(item)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
    }

    return String(item);
  });
}

function withArtifacts(
  definition: string,
  sourcePath: string,
  artifactContents: Record<string, string>,
): LoadedChallenge {
  const challenge = parseChallenge(definition);

  return {
    ...challenge,
    rubric: challenge.rubric
      ? {
          strong: normalizeRubricItems(challenge.rubric.strong),
          weak: normalizeRubricItems(challenge.rubric.weak),
        }
      : undefined,
    sourcePath,
    artifacts: challenge.supplied_artifacts.map((artifact) => ({
      ...artifact,
      content: artifactContents[artifact.path] ?? "Artifact content missing.",
    })),
  };
}

export const challenges: LoadedChallenge[] = [
  withArtifacts(
    featureFlagChallenge,
    "challenges/architecture-thought-experiment/feature-flag-migration/challenge.yaml",
    {
      "artifacts/system-overview.md": featureFlagOverview,
      "artifacts/current-flag-pattern.ts": featureFlagPattern,
    },
  ),
  withArtifacts(
    analyticsChallenge,
    "challenges/architecture-thought-experiment/analytics-event-pipeline/challenge.yaml",
    {
      "artifacts/current-state.md": analyticsState,
      "artifacts/schema-drift-example.json": analyticsSchema,
    },
  ),
  withArtifacts(
    cacheChallenge,
    "challenges/broken-system-investigation/cache-stampede-catalog-api/challenge.yaml",
    {
      "artifacts/cache.ts": cacheCode,
      "artifacts/incident.log": cacheLog,
      "artifacts/metrics.md": cacheMetrics,
    },
  ),
  withArtifacts(
    webhookChallenge,
    "challenges/broken-system-investigation/webhook-retry-storm/challenge.yaml",
    {
      "artifacts/webhook-handler.ts": webhookHandler,
      "artifacts/delivery.log": webhookLog,
      "artifacts/db-note.md": webhookDb,
    },
  ),
  withArtifacts(
    migrationChallenge,
    "challenges/tool-steering-challenge/legacy-typescript-migration/challenge.yaml",
    {
      "artifacts/module-summary.md": migrationSummary,
      "artifacts/component-example.tsx": migrationComponent,
    },
  ),
  withArtifacts(
    incidentChallenge,
    "challenges/tool-steering-challenge/incident-triage-with-ai/challenge.yaml",
    {
      "artifacts/incident-constraints.md": incidentConstraints,
      "artifacts/log-sample.txt": incidentLog,
    },
  ),
].sort((left, right) => {
  const archetypeOrder = left.archetype.localeCompare(right.archetype);
  return archetypeOrder !== 0 ? archetypeOrder : left.title.localeCompare(right.title);
});
