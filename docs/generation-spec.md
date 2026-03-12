# Generation Spec

This document defines the first concrete internal spec for challenge generation in SteerLab.

It is not a public challenge schema. It is an internal architecture boundary for future generation work.

The immediate goal is to make the generation pipeline concrete enough that future code can be written against stable objects rather than vague prompt ideas.

## Design Intent

SteerLab generation should be:

- archetype-first
- specialty-extensible
- schema-bounded
- validation-aware
- promotion-aware
- provider-agnostic

The model may draft content. SteerLab still owns the request shape, pack selection, validation rules, and promotion policy.

## Internal Objects

The first-pass internal generation spec centers on two objects:

- `GenerationRequest`
- `SpecialtyPack`

Other pipeline objects such as `DraftChallengePackage`, `ValidationReport`, and `PromotionRecord` should follow later.

## `GenerationRequest`

`GenerationRequest` is the normalized request object that enters the generation pipeline.

It is the output of request normalization and the input to pack selection and draft generation.

### Purpose

`GenerationRequest` should answer:

- what kind of challenge should be generated
- for what intended mode
- at what difficulty and time budget
- with what realism and artifact constraints
- with what optional training support depth

### Required Fields

```ts
type GenerationRequest = {
  archetype: ArchetypeId;
  specialty: SpecialtyId;
  difficulty: "intro" | "intermediate" | "advanced";
  intended_mode: "training" | "evaluation" | "draft-review";
  estimated_time_minutes: number;
  artifact_profile: ArtifactProfile;
  realism_constraints: string[];
};
```

### Field Semantics

#### `archetype`

Must be one of the canonical SteerLab archetypes:

- `broken-system-investigation`
- `architecture-thought-experiment`
- `tool-steering-challenge`

This remains the primary judgment category.

#### `specialty`

The domain context to apply inside the archetype.

Examples:

- `frontend`
- `devops`
- `data-platform`
- `cloud-infrastructure`
- `payments`

This is where most future breadth should come from.

#### `difficulty`

Controls depth, ambiguity, artifact density, and expected tradeoff complexity.

Draft scale:

- `intro`
- `intermediate`
- `advanced`

#### `intended_mode`

Declares what the generated draft is primarily for.

Values:

- `training`
- `evaluation`
- `draft-review`

`training` should bias toward stronger learning scaffolds.

`evaluation` should avoid leaking training artifacts into the candidate experience.

`draft-review` is for internal content development and review workflows rather than direct end-user use.

#### `estimated_time_minutes`

The target response time for a serious first-pass attempt.

This should influence scope, artifact count, and expected reasoning depth.

#### `artifact_profile`

Defines the rough artifact budget and preferred shapes.

```ts
type ArtifactProfile = {
  preferred_kinds: ArtifactKind[];
  required_kinds?: ArtifactKind[];
  max_artifacts: number;
};
```

This is a generation constraint, not a guarantee that every preferred artifact kind will appear.

#### `realism_constraints`

List of scenario-level constraints the draft must respect.

Examples:

- "avoid toy examples"
- "keep the system plausible for a 20-person SaaS engineering team"
- "prefer operational realism over stack novelty"
- "do not require hidden company-specific knowledge"

This field is important because realism should be explicit rather than assumed.

### Optional Fields

```ts
type GenerationRequestOptional = {
  seniority_target?: "early-career" | "mid" | "senior" | "staff-plus";
  topic_tags?: string[];
  context_style?: string;
  banned_topics?: string[];
  freshness_policy?: "stable" | "daily-practice";
  training_support_depth?: "light" | "standard" | "deep";
  source_request?: string;
};
```

### Optional Field Notes

#### `seniority_target`

Useful when difficulty alone is too coarse.

This should shape ambiguity, ownership level, and expected tradeoff depth more than raw jargon density.

#### `topic_tags`

Optional helper tags for narrowing the domain inside a specialty.

Examples:

- `incident-response`
- `caching`
- `schema-governance`
- `rollout-safety`

#### `context_style`

Optional tone or company-shape hint.

Examples:

- "B2B SaaS platform"
- "consumer mobile app"
- "internal platform team"

This should influence realism, not marketing flavor.

#### `banned_topics`

Used to avoid repetition or steer away from undesired patterns.

Examples:

- "rate limiting"
- "feature flags"
- "vector databases"

#### `freshness_policy`

Separates stable curation from disposable practice generation.

Values:

- `stable`
- `daily-practice`

#### `training_support_depth`

Relevant mainly for `training` mode generation.

Values:

- `light`
- `standard`
- `deep`

This should influence the density of reflection prompts, checkpoints, hints, and compare-ready scaffolds.

#### `source_request`

Optional raw input text before normalization.

Useful for traceability and debugging, not for direct downstream logic.

### Example

```yaml
archetype: broken-system-investigation
specialty: devops
difficulty: intermediate
intended_mode: training
estimated_time_minutes: 30
artifact_profile:
  preferred_kinds:
    - log
    - config
    - markdown
  required_kinds:
    - log
  max_artifacts: 3
realism_constraints:
  - Avoid toy infrastructure failures.
  - Keep the scenario plausible for a small-to-medium product engineering team.
seniority_target: mid
topic_tags:
  - deployment
  - rollback
freshness_policy: daily-practice
training_support_depth: standard
source_request: Give me a 30-minute devops debugging practice challenge.
```

## `SpecialtyPack`

`SpecialtyPack` is the SteerLab-owned domain bundle used during pack selection and semantic generation guidance.

It is the primary mechanism for expanding generation breadth without expanding archetypes casually.

### Purpose

`SpecialtyPack` should answer:

- what kinds of systems and situations are realistic in this specialty
- what artifacts are useful
- what failure modes or tradeoffs are common
- what generated patterns should be rejected
- what heuristics should shape evaluation and training supports

### Required Fields

```ts
type SpecialtyPack = {
  id: SpecialtyId;
  version: string;
  title: string;
  summary: string;
  supported_archetypes: ArchetypeId[];
  system_patterns: string[];
  artifact_guidance: ArtifactGuidance;
  realism_rules: string[];
  anti_patterns: string[];
};
```

### Field Semantics

#### `id`

Stable identifier.

Examples:

- `frontend`
- `devops`
- `data-platform`

#### `version`

Used so pack behavior can evolve without becoming opaque.

#### `title`

Human-readable pack name.

#### `summary`

Short description of the engineering slice the pack covers.

#### `supported_archetypes`

Explicitly lists which canonical archetypes this pack can support well.

This matters because not every specialty should be assumed to fit every archetype equally.

#### `system_patterns`

Short descriptions of realistic system shapes for the specialty.

Examples for `devops`:

- "Kubernetes-based service with managed database and queued jobs"
- "CI/CD pipeline with staged deploys and rollback paths"
- "Terraform-managed cloud resources with environment drift risk"

These help the generator stay grounded.

#### `artifact_guidance`

Defines likely artifact shapes for this specialty.

```ts
type ArtifactGuidance = {
  preferred_kinds: ArtifactKind[];
  common_pairs?: Array<[ArtifactKind, ArtifactKind]>;
  discouraged_kinds?: ArtifactKind[];
  max_recommended_artifacts?: number;
};
```

This is not a hard schema. It is generation guidance.

#### `realism_rules`

Pack-specific rules that keep the domain plausible.

Examples:

- "Prefer operational incidents over contrived cloud trivia."
- "Keep failures explainable from the supplied evidence."
- "Avoid requiring niche vendor knowledge unless the task explicitly centers it."

#### `anti_patterns`

Generated patterns the pipeline should reject or repair.

Examples:

- "buzzword stack substitution without tradeoff explanation"
- "generic observability advice not tied to the supplied artifacts"
- "security theater without concrete system impact"

### Optional Fields

```ts
type SpecialtyPackOptional = {
  vocabulary?: string[];
  common_failure_modes?: string[];
  common_tradeoff_axes?: string[];
  evaluation_heuristics?: string[];
  training_heuristics?: string[];
  tag_catalog?: string[];
};
```

### Optional Field Notes

#### `vocabulary`

Useful domain terms the generator and semantic validator may expect to see used appropriately.

#### `common_failure_modes`

Particularly valuable for `broken-system-investigation`.

Examples:

- retry storms
- config drift
- stale caches
- broken rollout ordering

#### `common_tradeoff_axes`

Particularly valuable for `architecture-thought-experiment`.

Examples:

- latency vs consistency
- operability vs flexibility
- centralization vs team autonomy

#### `evaluation_heuristics`

Pack-level heuristics for what strong responses tend to surface.

These are not a substitute for challenge-specific evaluation signals.

#### `training_heuristics`

Pack-level heuristics for useful checkpoints, hints, and reflection scaffolds.

#### `tag_catalog`

Suggested topic tags that fit this specialty.

### Example

```yaml
id: devops
version: "0.1"
title: DevOps
summary: Operational systems, delivery workflows, deployment safety, and infrastructure reliability.
supported_archetypes:
  - broken-system-investigation
  - architecture-thought-experiment
  - tool-steering-challenge
system_patterns:
  - Kubernetes-hosted services with managed dependencies
  - CI/CD pipelines with staged rollout and rollback
  - Infrastructure-as-code environments with config drift risk
artifact_guidance:
  preferred_kinds:
    - log
    - config
    - markdown
  common_pairs:
    - [log, config]
    - [markdown, code]
  max_recommended_artifacts: 4
realism_rules:
  - Prefer incidents and tradeoffs that a product engineering team could actually face.
  - Keep failures diagnosable from the supplied evidence.
anti_patterns:
  - Generic cloud advice without a concrete system.
  - Vendor-name swapping that does not change the reasoning.
common_failure_modes:
  - deploy rollback gaps
  - retry amplification
  - observability blind spots
  - config drift
common_tradeoff_axes:
  - deployment speed vs safety
  - platform control vs team autonomy
training_heuristics:
  - Ask the learner to identify the operational boundary first.
  - Prefer checkpoints that separate observed facts from remediation ideas.
```

## v1 Guardrails

The first implementation should keep the spec intentionally narrow.

### `GenerationRequest` v1 should not include

- provider-specific prompt payloads
- full prompt templates
- arbitrary untyped metadata blobs
- direct artifact contents
- promotion outcomes

### `SpecialtyPack` v1 should not include

- executable code hooks
- free-form embedded model prompts as the primary source of truth
- hidden scoring rules
- implicit archetype creation by another name

## Relationship Between The Two

The intended flow is:

1. normalize raw intent into a `GenerationRequest`
2. select a `SpecialtyPack`
3. combine request constraints with pack guidance
4. produce a `DraftChallengePackage`
5. validate, repair, and promote as appropriate

`GenerationRequest` says what is wanted.

`SpecialtyPack` says how that specialty should stay realistic and useful.

## Open Questions

These should stay open for now:

- Should `specialty` be a single id in v1, or eventually a weighted list?
- Should `training_support_depth` live in `GenerationRequest`, or inside a separate generation profile object?
- How much of semantic validation should be pack-defined versus shared globally?
- Should `supported_archetypes` be permissive guidance or a hard allow-list?

## Immediate Next Step

After this spec, the next sensible move is:

1. define `ValidationReport`
2. define `PromotionRecord`
3. add the first example `SpecialtyPack` directory structure
4. only then begin code-level generation scaffolding
