export type ChallengeArtifact = {
  path: string;
  kind: string;
  purpose: string;
};

export type ChallengeRubric = {
  strong?: string[];
  weak?: string[];
};

export type ChallengeWorkedExample = {
  label: string;
  href: string;
};

export type ChallengeTrainingHint = {
  title: string;
  content: string;
};

export type ChallengeTrainingCheckpoint = {
  id: string;
  title: string;
  prompt: string;
};

export type ChallengeTrainingSupport = {
  reflection_prompts?: string[];
  thinking_checklist?: string[];
  worked_examples?: ChallengeWorkedExample[];
  hints?: ChallengeTrainingHint[];
  checkpoints?: ChallengeTrainingCheckpoint[];
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
  training_support?: ChallengeTrainingSupport;
};

export type ChallengeArtifactContent = ChallengeArtifact & {
  content: string;
};

export type LoadedChallenge = Challenge & {
  sourcePath: string;
  artifacts: ChallengeArtifactContent[];
};
