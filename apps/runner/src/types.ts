export type ChallengeArtifact = {
  path: string;
  kind: string;
  purpose: string;
};

export type ChallengeRubric = {
  strong?: string[];
  weak?: string[];
};

export type Challenge = {
  id: string;
  title: string;
  archetype: string;
  category: string;
  description: string;
  context: string;
  supplied_artifacts: ChallengeArtifact[];
  candidate_instructions: string[];
  evaluation_signals: string[];
  difficulty: string;
  estimated_time_minutes: number;
  tags?: string[];
  rubric?: ChallengeRubric;
};

export type ChallengeArtifactContent = ChallengeArtifact & {
  content: string;
};

export type LoadedChallenge = Challenge & {
  sourcePath: string;
  artifacts: ChallengeArtifactContent[];
};
