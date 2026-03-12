export type ArchetypeId =
  | "broken-system-investigation"
  | "architecture-thought-experiment"
  | "tool-steering-challenge";

export type Difficulty = "intro" | "intermediate" | "advanced";

export type IntendedMode = "training" | "evaluation" | "draft-review";

export type PromotionDestination =
  | "scratch"
  | "daily-practice-queue"
  | "draft-library"
  | "repo-candidate"
  | "repo-curated";

export type ArtifactKind =
  | "code"
  | "config"
  | "diagram"
  | "json"
  | "log"
  | "markdown"
  | "text"
  | "trace"
  | "yaml";

export type ArtifactProfile = {
  preferred_kinds: ArtifactKind[];
  required_kinds?: ArtifactKind[];
  max_artifacts: number;
};

export type GenerationRequest = {
  archetype: ArchetypeId;
  specialty: string;
  difficulty: Difficulty;
  intended_mode: IntendedMode;
  estimated_time_minutes: number;
  artifact_profile: ArtifactProfile;
  realism_constraints: string[];
  seniority_target?: "early-career" | "mid" | "senior" | "staff-plus";
  topic_tags?: string[];
  context_style?: string;
  banned_topics?: string[];
  freshness_policy?: "stable" | "daily-practice";
  training_support_depth?: "light" | "standard" | "deep";
  source_request?: string;
};

export type ArtifactGuidance = {
  preferred_kinds: ArtifactKind[];
  common_pairs?: Array<[ArtifactKind, ArtifactKind]>;
  discouraged_kinds?: ArtifactKind[];
  max_recommended_artifacts?: number;
};

export type SpecialtyPack = {
  id: string;
  version: string;
  title: string;
  summary: string;
  supported_archetypes: ArchetypeId[];
  system_patterns: string[];
  artifact_guidance: ArtifactGuidance;
  realism_rules: string[];
  anti_patterns: string[];
  vocabulary?: string[];
  common_failure_modes?: string[];
  common_tradeoff_axes?: string[];
  evaluation_heuristics?: string[];
  training_heuristics?: string[];
  tag_catalog?: string[];
};

export type DraftArtifactRef = {
  path: string;
  kind: string;
  purpose: string;
};

export type DraftArtifact = DraftArtifactRef & {
  content: string;
};

export type DraftChallengeDefinition = {
  id: string;
  title: string;
  archetype: ArchetypeId;
  category: string;
  description: string;
  context: string;
  supplied_artifacts: DraftArtifactRef[];
  candidate_instructions: string[];
  evaluation_signals: string[];
  difficulty: Difficulty;
  estimated_time_minutes: number;
  tags?: string[];
  rubric?: {
    strong?: string[];
    weak?: string[];
  };
  training_support?: {
    reflection_prompts?: string[];
    thinking_checklist?: string[];
    checkpoints?: Array<{
      id: string;
      title: string;
      prompt: string;
    }>;
    hints?: Array<{
      title: string;
      content: string;
    }>;
    worked_examples?: Array<{
      label: string;
      href: string;
    }>;
  };
};

export type DraftChallengePackage = {
  challenge_id: string;
  request_ref: string;
  specialty_pack_ref: string;
  generated_at: string;
  challenge_definition: DraftChallengeDefinition;
  artifacts: DraftArtifact[];
  generation_notes?: string[];
  generator_metadata?: {
    provider?: string;
    model?: string;
    run_id?: string;
  };
  repair_history?: string[];
};

export type ValidationIssue = {
  stage: "structural" | "semantic" | "repair";
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  field?: string;
  suggested_action?: string;
};

export type ValidationReport = {
  challenge_id: string;
  structural_status: "pass" | "fail";
  semantic_status: "pass" | "warn" | "fail";
  issues: ValidationIssue[];
  overall_recommendation: "promote" | "repair" | "reject";
  generated_at?: string;
  repaired?: boolean;
  repair_attempts?: number;
  repair_summary?: string[];
  reviewer_notes?: string[];
};

export type PromotionRecord = {
  challenge_id: string;
  source_mode: IntendedMode;
  destination: PromotionDestination;
  decision: "approved" | "needs-repair" | "rejected";
  basis: "automatic" | "human-review" | "hybrid";
  validation_report_ref: string;
  decided_at?: string;
  decided_by?: string;
  notes?: string[];
  next_actions?: string[];
};

export type DraftSerializationEnvelope = {
  request: GenerationRequest;
  draft_package: DraftChallengePackage;
  validation_report?: ValidationReport;
  promotion_record?: PromotionRecord;
};
