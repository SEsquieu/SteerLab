# Specialty Packs

This document defines the first repository-level structure for `SpecialtyPack` content in SteerLab.

The goal is to make specialty expansion concrete without creating new archetypes casually.

## Why Specialty Packs Exist

SteerLab should grow breadth mostly through specialty packs, not through archetype sprawl.

That means:

- archetypes remain the stable judgment categories
- specialties provide domain context
- packs give generation and validation domain-specific guidance

Examples:

- archetype: `broken-system-investigation`
- specialty pack: `devops`

Or:

- archetype: `tool-steering-challenge`
- specialty pack: `frontend`

The archetype tells SteerLab what kind of engineering judgment is being surfaced.

The specialty pack tells SteerLab what realistic systems, artifacts, failure modes, tradeoffs, and anti-patterns belong in that domain.

## Repository Layout

Recommended structure:

```text
specialties/
|-- _template/
|   |-- README.md
|   `-- pack.yaml
|-- devops/
|   |-- README.md
|   `-- pack.yaml
`-- <specialty-id>/
    |-- README.md
    `-- pack.yaml
```

This keeps packs inspectable, diffable, and easy to expand later.

## `pack.yaml`

`pack.yaml` is the structured definition of the specialty pack.

It should hold:

- stable metadata
- supported archetypes
- system patterns
- artifact guidance
- realism rules
- anti-patterns
- optional heuristics for generation, evaluation, and training

This file should stay text-first and Git-friendly, like the challenge schema.

## `README.md`

Each specialty directory should also include a short `README.md`.

Its role is to explain:

- what domain the pack is trying to represent
- what kinds of systems it targets
- what it intentionally does not try to cover
- how contributors should extend it

This makes the pack understandable without forcing readers to reverse-engineer meaning from YAML alone.

## Minimal `pack.yaml` Shape

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
artifact_guidance:
  preferred_kinds:
    - log
    - config
    - markdown
realism_rules:
  - Prefer incidents and tradeoffs that a product engineering team could actually face.
anti_patterns:
  - Generic cloud advice without a concrete system.
```

See [`docs/generation-spec.md`](./generation-spec.md) for the fuller internal field spec.

## Design Rules

Specialty packs should:

- stay domain-focused
- remain compatible with the canonical archetypes
- improve realism rather than just add jargon
- make generation and validation more grounded
- help contributors extend the framework coherently

Specialty packs should not:

- act as hidden archetypes
- become provider-specific prompt bundles
- encode opaque scoring logic
- turn into loose collections of domain buzzwords

## Pack Expansion Model

Good future additions would look like:

- `specialties/frontend/`
- `specialties/data-platform/`
- `specialties/cloud-infrastructure/`
- `specialties/payments/`
- `specialties/embedded/`

The expected path is:

1. add or refine a specialty pack
2. use it in generation or semantic validation
3. create or improve challenge examples that reflect it

Not:

1. invent a new archetype because a domain is unfamiliar

## What Comes Next

After the structure exists, the next useful steps are:

1. define the first validation rules for `pack.yaml`
2. define how pack selection works against a `GenerationRequest`
3. define how pack heuristics feed semantic validation
4. only then start code-level generation scaffolding
