# Staged Generation

This document defines the small-model-friendly generation flow for SteerLab.

The goal is not just to add more steps. The goal is to:

- reduce prompt size
- reduce output size
- isolate failure modes
- preserve challenge quality
- keep formatting and structure inside SteerLab instead of inside the model

## Core Principle

The model should generate only the creative pieces.

SteerLab should own:

- ids
- archetype and difficulty propagation
- artifact slots and file paths
- training scaffold counts
- final package assembly
- validation
- repair targeting

## Current Modular Pipeline

The current staged pipeline is:

1. `ChallengeSeed`
2. procedural `ScenarioSkeleton`
3. `ContextBlock`
4. `ArtifactBlueprint`
5. per-artifact content generation
6. `EvaluationBundle`
7. procedural assembly into `DraftChallengePackage`

This is a better fit for small local models than a single large draft-generation pass.

## Fast vs Full

The modular pipeline supports two operating modes:

- `fast`
  - uses a model for seed, context, per-artifact generation, and evaluation/training scaffolds
  - uses procedural artifact blueprint generation
  - minimizes prompt size and output size
- `full`
  - adds a dedicated artifact-blueprint generation call
  - spends more model effort tightening evidence design before artifact generation

## Stage 1: Challenge Seed

`ChallengeSeed` is the smallest creative planning object.

It contains:

- title
- one short premise
- issue class
- artifact kind plan

This stage exists so the model can make one small high-level choice without being asked to author a whole challenge.

## Stage 2: Procedural Scenario Skeleton

SteerLab turns the seed into a structured skeleton procedurally.

The skeleton contains:

- id
- archetype
- category
- difficulty
- estimated time
- tags
- artifact slots
- scaffold plan

The model is not asked to invent these fields again.

### Shape

```ts
type ScenarioSkeleton = {
  skeleton_id: string;
  request_ref: string;
  specialty_pack_ref: string;
  generated_at: string;
  issue_class: string;
  challenge_outline: {
    title: string;
    archetype: ArchetypeId;
    category: string;
    description: string;
    context: string;
    difficulty: Difficulty;
    estimated_time_minutes: number;
    tags?: string[];
  };
  artifact_slots: Array<{
    path: string;
    kind: ArtifactKind;
    purpose: string;
  }>;
  scaffold_plan: {
    reflection_prompt_count: number;
    checklist_count: number;
    checkpoint_count: number;
    hint_count: number;
  };
};
```

## Stage 3: Context And Instructions

This model call writes only:

- short description
- one context paragraph
- candidate instructions

Constraints:

- short output
- max 3 candidate instructions
- no artifact content
- no evaluation signals
- no training scaffolds

## Stage 4: Artifact Blueprinting

This stage defines what each artifact should prove.

Each artifact blueprint contains:

- slot id
- path
- kind
- purpose
- evidentiary role
- clue

In `fast` mode, this can be generated procedurally.
In `full` mode, it is a dedicated model call.

## Stage 5: Per-Artifact Generation

Each artifact is generated independently with a type-specific prompt.

Examples:

- log generator
- config generator
- markdown field report generator
- trace generator

This is one of the key optimizations for local models:

- each call is small
- retries are cheap
- artifact prompts can be specialized by kind

## Stage 6: Evaluation And Training Bundle

This model call writes only:

- evaluation signals
- reflection prompts
- thinking checklist
- checkpoints
- hints

SteerLab controls the counts and output shape procedurally.

This keeps the prompt narrow and avoids asking the model to re-author the whole challenge.

## Stage 7: Procedural Assembly

SteerLab assembles the final `DraftChallengePackage` procedurally from:

- request
- pack
- skeleton
- context block
- artifact blueprints
- artifact contents
- evaluation/training bundle

This means the model is no longer responsible for:

- package metadata
- repeated structural fields
- file layout
- copying artifact refs correctly

## Validation Between Stages

Each stage should be inspectable and locally debuggable.

The current implementation persists:

- raw prompts and responses under `generated/raw/<run-id>/`
- intermediate stage outputs under `generated/pipeline/<run-id>/`
- validated drafts under `generated/drafts/<run-id>/`

The current validator layer also checks more than schema shape. It now includes:

- parser recovery for verbose reasoning-first model outputs
- normalization for common per-artifact wrapper shapes
- semantic warnings for weak artifact grounding
- semantic warnings for cross-artifact narrative drift
- semantic warnings for unsupported asserted evidence in evaluation and training scaffolds
- normalization of escaped newline-heavy text artifacts before writing draft files

Recommended flow:

1. generate seed
2. build skeleton procedurally
3. generate context block
4. generate or derive artifact blueprints
5. generate each artifact independently
6. generate evaluation bundle
7. assemble full draft procedurally
8. validate full draft
9. optionally run one repair pass
10. stage into review if promotable

## Why This Helps Local Models

This design works better with smaller local models because it:

- minimizes context passed into each call
- minimizes output length for each call
- avoids full-schema dumps where possible
- isolates retries to the weak stage
- moves deterministic scaffolding out of the model

## Current Active Work

The active implementation focus is not adding broad new architecture surface.

It is:

- measuring stage quality across specialties
- tightening validation honesty
- improving repair targeting for drafts marked `repair`

The goal is to make the staged pipeline trustworthy for review workflows before broadening provider support or generation volume.

## Entry Point

The current entry point is:

```bash
npm run generate:challenge -- scripts/generation/example-request-embedded.yaml --pack specialties/embedded/pack.yaml --model qwen3.5:4b --mode fast
```

This is now the recommended path for small-model challenge generation experiments.
