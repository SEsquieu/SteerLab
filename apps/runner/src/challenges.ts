import yaml from "js-yaml";
import type { Challenge, LoadedChallenge } from "./types";

const challengeModules = import.meta.glob("../../../challenges/**/challenge.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const artifactModules = import.meta.glob("../../../challenges/**/artifacts/**", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

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

function toRepoRelativePath(modulePath: string) {
  return modulePath.replace(/^(\.\.\/){3}/, "");
}

function getArtifactContentsForChallenge(challengePath: string) {
  const challengeDir = challengePath.slice(0, challengePath.lastIndexOf("/challenge.yaml"));
  const artifactPrefix = `${challengeDir}/artifacts/`;

  return Object.fromEntries(
    Object.entries(artifactModules)
      .filter(([artifactPath]) => artifactPath.startsWith(artifactPrefix))
      .map(([artifactPath, content]) => [artifactPath.slice(challengeDir.length + 1), content]),
  );
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

export const challenges: LoadedChallenge[] = Object.entries(challengeModules)
  .filter(([challengePath]) => !challengePath.includes("/_templates/"))
  .map(([challengePath, definition]) =>
    withArtifacts(
      definition,
      toRepoRelativePath(challengePath),
      getArtifactContentsForChallenge(challengePath),
    ),
  )
  .sort((left, right) => {
    const archetypeOrder = left.archetype.localeCompare(right.archetype);
    return archetypeOrder !== 0 ? archetypeOrder : left.title.localeCompare(right.title);
  });
