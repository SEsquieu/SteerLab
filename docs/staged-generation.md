# Staged Generation

This document defines the next refinement of SteerLab challenge generation: moving from one large generation pass to a staged generation workflow.

The goal is not to add ceremony. The goal is to make generation:

- faster
- easier to validate
- easier to debug
- less likely to drift
- better suited to smaller local models

## Why Stage Generation

A single-pass draft generator asks the model to do too many things at once:

- invent a realistic scenario
- choose the right evidence shape
- generate artifact contents
- define candidate instructions
- define evaluation signals
- define training scaffolds

That produces a few recurring problems:

- prompts get too large
- model reasoning gets verbose
- scenarios become internally weak while still looking complete
- artifacts do not always support the intended diagnosis
- repairs become slow because the whole package has to be reconsidered

Staged generation keeps each step narrower and makes failure easier to localize.

## Design Principle

SteerLab should decompose generation into bounded tasks with validation between them.

The model should do one kind of work at a time.

SteerLab should decide:

- what each stage is allowed to produce
- what gets validated before the next stage
- what should be regenerated versus repaired

## Recommended First Split

SteerLab does not need a five-stage authoring pipeline immediately. A strong v1 split is enough:

1. `ScenarioSkeleton`
2. `DraftChallengePackage`

This already improves speed, drift control, and review quality.

## Stage 1: Scenario Skeleton

`ScenarioSkeleton` is the narrow planning output that defines the challenge before artifact contents and training/reviewer scaffolds are written.

It should answer:

- what the scenario is
- what category it belongs to
- what the system context is
- what artifact bundle should exist
- what each artifact is supposed to prove

It should not yet contain:

- full artifact contents
- final evaluation signals
- final training supports
- rubric text

### Purpose

`ScenarioSkeleton` exists to test whether the scenario and evidence plan are coherent before the model spends tokens writing full artifacts and scaffolds.

### Proposed Shape

```ts
type ScenarioSkeleton = {
  skeleton_id: string;
  request_ref: string;
  specialty_pack_ref: string;
  generated_at: string;
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
  artifact_plan: Array<{
    path: string;
    kind: ArtifactKind;
    purpose: string;
    evidentiary_role: string;
  }>;
};
```

### What To Validate At This Stage

- archetype matches request
- difficulty and time budget match request
- category and tags are specific enough
- artifact count respects the request profile
- required artifact kinds are present
- artifact purposes are not redundant
- the context does not already give away the answer
- the artifact plan actually supports the scenario

### Typical Failure Modes

- context is too vague to support a real investigation
- context already names the likely root cause
- artifact plan is too thin
- artifacts do not connect cleanly to the intended challenge
- category is just the specialty name again

## Stage 2: Full Draft Package

Only once the skeleton is good enough should SteerLab generate the full `DraftChallengePackage`.

This stage should use:

- the original `GenerationRequest`
- the selected `SpecialtyPack`
- the approved `ScenarioSkeleton`

This stage fills in:

- artifact contents
- candidate instructions
- evaluation signals
- optional rubric
- training support

### Why This Helps

It separates two different kinds of work:

- scenario design
- challenge authoring

That makes it easier to answer:

- is the idea bad?
- or is the artifact/scaffold authoring bad?

## Optional Later Split

If SteerLab needs even tighter control later, generation can split further:

1. `ScenarioSkeleton`
2. `ArtifactPlan`
3. `ArtifactBundle`
4. `ResponseScaffolds`
5. `DraftChallengePackage`

That is not necessary yet, but it is a natural extension if artifact quality becomes the main bottleneck.

## Validation Between Stages

Staged generation only helps if each stage is validated before the next one.

Recommended sequence:

1. generate skeleton
2. validate skeleton
3. repair or regenerate skeleton if needed
4. generate full draft from approved skeleton
5. validate full draft
6. optional one-pass repair
7. stage into review if promotable

## Repair Policy In A Staged Pipeline

The current repair policy still applies:

- one generation pass
- at most one automatic repair pass
- then stop

In a staged system, this becomes:

- one repair pass per stage at most
- but do not repeatedly repair a weak stage forever

If a skeleton is still weak after one bounded repair, regenerate the skeleton instead of repeatedly sanding it.

If a full draft is still weak after one bounded repair, regenerate from a stronger skeleton instead of repeatedly rewriting the same package.

## Why This Fits Local Models Better

Staged generation is especially useful for smaller or slower local models because it:

- reduces prompt size
- reduces output size
- reduces reasoning sprawl
- reduces chance of partial incoherence
- makes retries cheaper

This is particularly important when using models that:

- produce verbose reasoning traces
- are slow on long outputs
- struggle to keep scenario, artifacts, and scaffolds aligned in one pass

## Immediate Next Implementation Goal

The next practical implementation step should be:

1. define `ScenarioSkeleton` in the generation spec
2. add a skeleton-generation script
3. add a skeleton validator
4. add a `skeleton -> draft` generation step

That is enough to make staged generation real without overbuilding the pipeline.
