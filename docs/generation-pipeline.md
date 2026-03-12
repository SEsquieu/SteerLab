# Challenge Generation Pipeline

This document defines the edges of a future challenge-generation pipeline for SteerLab.

For the first concrete internal object shapes, see [`docs/generation-spec.md`](./generation-spec.md).
For the first generated-output file layout, see [`docs/generation-output-layout.md`](./generation-output-layout.md).

The goal is not to let models produce first-class content unchecked. The goal is to define a bounded pipeline that can generate useful draft challenges while preserving SteerLab's structure, quality bar, and future extensibility.

## Core Principle

SteerLab should treat challenge generation as a structured pipeline, not a single prompt.

The durable value still lives in:

- the three canonical archetypes
- the challenge schema
- the validation rules
- the reasoning and training workflows
- the specialty packs and artifact conventions that SteerLab defines

The model may draft content. SteerLab must define the envelope that makes that content usable.

## The Important Axis Split

SteerLab needs a clean separation between:

- `archetype`: the kind of engineering judgment being surfaced
- `specialty`: the domain or discipline context
- `difficulty`: how demanding the scenario is
- `mode`: whether the generated output is intended for Training Mode, Evaluation Mode, or draft review

This distinction matters because future expansion should mostly happen by adding specialties and packs, not by adding new archetypes casually.

Examples:

- archetype: `broken-system-investigation`
- specialty: `devops`
- difficulty: `intermediate`
- mode: `training`

Or:

- archetype: `tool-steering-challenge`
- specialty: `embedded`
- difficulty: `advanced`
- mode: `training`

The archetype model remains stable. The specialty layer is where most future breadth should live.

## Generation Inputs

The generation pipeline should start from a structured request, not a free-form prompt.

Minimum request fields:

- archetype
- specialty
- difficulty
- estimated time target
- intended mode
- artifact budget or preferred artifact types
- realism constraints

Likely optional fields:

- seniority target
- topic tags
- company or product context style
- banned themes or repeated topics
- freshness preferences for daily practice
- training scaffolding depth

This object should be thought of as a `Generation Request`.

## Specialty Packs

To support expansion into areas like devops, frontend, embedded, cloud, data, security, or mobile, SteerLab should not rely on generic model memory alone.

It should introduce `Specialty Packs`.

A specialty pack is a SteerLab-owned bundle of generation guidance for a particular domain.

It should define things like:

- common systems and components
- realistic artifact types
- common failure modes
- typical tradeoffs
- vocabulary and constraints
- difficulty calibration hints
- bad generated patterns to reject
- evaluation signal heuristics
- training-support heuristics

Examples:

- `specialties/devops/`
- `specialties/frontend/`
- `specialties/embedded/`
- `specialties/cloud/`

These packs are the key extensibility mechanism.

New specialties should usually mean adding or refining packs. New archetypes should still be rare.

## Pipeline Stages

The pipeline should have explicit stages.

### 1. Request Normalization

Turn a user or scheduler request into a complete `Generation Request`.

Examples:

- fill missing defaults
- cap artifact count
- enforce allowed archetypes
- map a casual request like "give me a quick devops debugging one" into a structured request

### 2. Pack Selection

Select the relevant specialty pack, artifact templates, and generation heuristics.

This stage answers:

- what kind of system should this scenario involve?
- what artifact shapes are appropriate?
- what realism constraints apply?
- what should be avoided?

### 3. Draft Scenario Generation

Generate a draft challenge package.

Expected outputs:

- `challenge.yaml` draft
- draft artifacts
- evaluation signals
- optional rubric candidates
- optional `training_support`

This stage should still be treated as draft production only.

### 4. Structural Validation

Run the normal SteerLab validator and any artifact existence checks.

This stage should confirm:

- schema correctness
- valid archetype
- artifact paths exist
- required fields are present
- challenge shape is loadable by the runner

### 5. Semantic Validation

Structural validity is necessary but not sufficient.

SteerLab should also check:

- archetype fidelity
- internal consistency between context, artifacts, and evaluation signals
- realism of the scenario
- difficulty calibration
- whether training scaffolds help without giving away the answer
- whether the challenge is too generic, gimmicky, or repetitive

This can include model-assisted critique, but the critique rules should be SteerLab-defined.

### 6. Repair Loop

If a draft fails validation, the system should attempt bounded repair.

Examples:

- fix artifact references
- tighten evaluation signals
- reduce scope
- align training supports with the actual scenario

The repair loop should be capped. Failed drafts should be rejected rather than endlessly massaged.

### 7. Promotion

Generated content should not all land in the same place.

Promotion targets should stay distinct:

- scratch output for one-off local practice
- daily practice queue
- candidate draft library pending review
- curated repository content

The promotion bar should be highest for anything committed into the repo.

This is where `PromotionRecord` becomes important: the system should record both the decision and the destination rather than treating promotion as an implied side effect of validation success.

## Daily Practice Path

If SteerLab becomes a daily engineering practice aid, the generation pipeline should support a lighter-weight path for ephemeral use.

That path might look like:

1. scheduler creates a `Generation Request`
2. specialty pack is selected
3. draft challenge is generated
4. validation and repair run
5. challenge is placed into a local daily queue

That is different from repository promotion.

Daily practice generation can be faster and more disposable, but it should still respect SteerLab's structure and validation boundaries.

## Repository Promotion Path

Repository-bound content should require a stricter path.

Recommended flow:

1. generate draft
2. validate structurally
3. validate semantically
4. repair if needed
5. human review
6. commit or reject

This keeps the public challenge library from becoming an undifferentiated stream of model output.

## What Flexibility Should Mean

Flexibility should not mean turning the schema into a blob.

It should mean:

- stable archetypes
- stable core challenge schema
- specialty-specific packs
- pluggable artifact templates
- pluggable validation heuristics
- multiple promotion paths
- provider-agnostic model calls underneath

This gives SteerLab room to expand across specialties without losing legibility.

## Proposed Boundary Objects

The pipeline will likely benefit from a few explicit internal objects.

### `Generation Request`

Defines what kind of challenge should be produced.

### `Specialty Pack`

Defines domain-specific generation and validation guidance.

### `Draft Challenge Package`

Contains draft YAML, draft artifacts, and metadata about how it was produced.

### `Validation Report`

Captures structural errors, semantic warnings, and repair suggestions.

### `Promotion Record`

Captures where the generated output is allowed to go next.

These do not all need to become public schema immediately, but they are useful architectural boundaries. See [`docs/generation-spec.md`](./generation-spec.md) for the current first-pass field definitions.

## Non-Goals

This pipeline should not become:

- a free-form prompt wrapper
- an auto-publish system for model output
- a specialty explosion that silently creates new archetypes by another name
- a generic content factory with weak realism standards
- a provider-specific feature set disguised as architecture

## Design Summary

The generation pipeline should be:

- archetype-first
- specialty-extensible
- schema-bounded
- validation-heavy
- promotion-aware
- model-agnostic

The central design move is simple:

expand breadth through specialty packs and pipeline structure, not through uncontrolled prompt variation or casual archetype growth.
