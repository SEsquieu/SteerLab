# Challenge Format

This document defines the current draft of the SteerLab challenge specification.

The format is intentionally small, text-first, and Git-friendly. It is designed for open-source challenge authoring rather than heavy platform infrastructure.

## Design Goals

- human-readable
- easy to diff and review
- usable from local files
- expressive enough for realistic engineering scenarios
- explicit about archetype, artifacts, and evaluation signals

## Canonical Archetypes

Every challenge must declare one of these archetypes:

- `broken-system-investigation`
- `architecture-thought-experiment`
- `tool-steering-challenge`

See [`docs/challenge-archetypes.md`](./challenge-archetypes.md) for the conceptual guidance behind them.

## Required Fields

Each challenge definition must include:

- `id`
- `title`
- `archetype`
- `category`
- `description`
- `context`
- `supplied_artifacts`
- `candidate_instructions`
- `evaluation_signals`
- `difficulty`
- `estimated_time_minutes`

Optional fields:

- `tags`
- `rubric`
- `training_support`
- `author_notes`
- `reference_solution_notes`

## Field Semantics

### `id`

Stable unique identifier.

Example:

```yaml
id: broken-system-investigation-cache-stampede
```

### `title`

Human-readable scenario title.

### `archetype`

The canonical challenge family. This is the primary organizing field in SteerLab.

Allowed values:

- `broken-system-investigation`
- `architecture-thought-experiment`
- `tool-steering-challenge`

### `category`

A narrower topic area inside the archetype.

Examples:

- `caching`
- `payments-integrations`
- `platform-architecture`
- `data-platform`
- `frontend-migration`
- `incident-operations`

### `description`

Short summary of the scenario.

### `context`

Long-form scenario framing. This should describe the system, operational or product constraints, known ambiguity, and what makes the situation realistic.

### `supplied_artifacts`

List of local files provided with the challenge.

Example:

```yaml
supplied_artifacts:
  - path: artifacts/incident.log
    kind: log
    purpose: Time-ordered production log excerpt
  - path: artifacts/cache.ts
    kind: code
    purpose: Simplified cache wrapper used in the request path
```

### `candidate_instructions`

What the candidate is expected to produce or explain.

### `evaluation_signals`

Reviewer-facing guidance describing what strong responses tend to demonstrate.

### `rubric`

Optional structured rubric. This should help reviewers distinguish strong, acceptable, and weak responses without pretending every challenge has a single correct answer.

### `training_support`

Optional training-oriented scaffolding for Training Mode.

This can include:

- `reflection_prompts`
- `thinking_checklist`
- `checkpoints`
- `hints`
- `worked_examples`

This block is for learning scaffolds, not reviewer judgment artifacts. Keep rubric and assessment language out of `training_support`.

`checkpoints` are especially useful when a challenge should guide the learner through a deliberate sequence such as observations before conclusions, constraints before design, or validation planning before trusting AI output.

Example:

```yaml
training_support:
  reflection_prompts:
    - What constraints matter most here?
    - What would you defer in a safe first version?
  thinking_checklist:
    - State the problem in your own words
    - Name the highest-risk assumptions
  checkpoints:
    - id: constraints
      title: Name the governing constraints
      prompt: Which constraints should drive your first-pass design or diagnosis?
  hints:
    - title: Start with the boundary
      content: Clarify which system component actually owns this decision or failure.
  worked_examples:
    - label: Architecture example review
      href: /docs/example-review-architecture.md
```

### `difficulty`

Draft scale:

- `intro`
- `intermediate`
- `advanced`

### `estimated_time_minutes`

Approximate time for a serious first-pass response.

## Example YAML: Broken System Investigation

```yaml
id: broken-system-investigation-cache-stampede
title: Diagnose a cache stampede after a traffic spike
archetype: broken-system-investigation
category: caching
description: Investigate rising latency and database saturation in a catalog service.
difficulty: intermediate
estimated_time_minutes: 45
tags:
  - incident-analysis
  - performance
context: |
  The catalog API serves product details to web and mobile clients.
  At 09:05 UTC, p95 latency rose sharply and database CPU saturated.
  A recent deploy changed cache TTL behavior.
supplied_artifacts:
  - path: artifacts/cache.ts
    kind: code
    purpose: Simplified cache access path
  - path: artifacts/incident.log
    kind: log
    purpose: Service log excerpt during the incident
candidate_instructions:
  - Identify the most likely root cause.
  - Explain the causal chain using the supplied evidence.
  - Suggest one immediate mitigation and one durable fix.
evaluation_signals:
  - Connects the incident to cache behavior rather than generic scale advice.
  - Builds a coherent hypothesis from code, metrics, and logs.
  - Distinguishes short-term mitigation from long-term prevention.
```

## Example YAML: Architecture Thought Experiment

```yaml
id: architecture-thought-experiment-feature-flag-migration
title: Plan a migration to dynamic feature flag management
archetype: architecture-thought-experiment
category: platform-architecture
description: Design a safe migration from code-based flags to dynamic flag control.
difficulty: intermediate
estimated_time_minutes: 60
tags:
  - rollout-safety
  - migration
context: |
  A product team has outgrown hard-coded feature flags and wants staged rollouts,
  cohort targeting, and emergency disable paths without redeploys.
supplied_artifacts:
  - path: artifacts/system-overview.md
    kind: markdown
    purpose: Current platform and delivery constraints
candidate_instructions:
  - Propose a target architecture.
  - Describe a migration strategy.
  - Explain availability, caching, rollback, and auditability tradeoffs.
evaluation_signals:
  - Separates control-plane and request-path concerns.
  - Addresses degraded-mode behavior and migration safety.
  - Surfaces operational tradeoffs instead of only technical components.
```

## Example YAML: Tool Steering Challenge

```yaml
id: tool-steering-challenge-legacy-typescript-migration
title: Use AI tools to scope and validate a legacy TypeScript migration
archetype: tool-steering-challenge
category: frontend-migration
description: Show how you would steer AI assistance on a risky migration task.
difficulty: intermediate
estimated_time_minutes: 50
tags:
  - ai-collaboration
  - prompt-steering
context: |
  A high-churn React module needs stricter typing, but the team has seen
  AI-generated changes widen scope and introduce subtle regressions.
supplied_artifacts:
  - path: artifacts/module-summary.md
    kind: markdown
    purpose: Description of the module and current pain points
candidate_instructions:
  - Describe your AI-assisted workflow.
  - Show the kinds of prompts or constraints you would use.
  - Explain how you would validate outputs before trusting them.
evaluation_signals:
  - Uses AI as a bounded accelerator rather than a source of authority.
  - Defines scope, acceptance criteria, and verification steps clearly.
  - Anticipates failure modes in generated code and generated reasoning.
training_support:
  reflection_prompts:
    - What parts of this task should the model help with, and what parts need direct human judgment?
    - How will you constrain scope before asking the model for help?
  thinking_checklist:
    - State what success means before generating code
    - Name how generated output will be verified
  hints:
    - title: Constrain before you generate
      content: Decide what the model is allowed to change and how you will verify the result.
  worked_examples:
    - label: Tool Steering example review
      href: /docs/example-review-tool-steering.md
```

## Authoring Guidance

- Keep the archetype clear. Do not write hybrid challenges that muddle the core signal.
- Prefer realistic ambiguity over hidden tricks.
- Supply enough evidence for a reasoned response.
- Keep artifacts concise enough that reviewers can engage seriously.
- Write evaluation signals that a reviewer could actually use.

## File Layout Convention

Recommended structure:

```text
challenges/<archetype>/<challenge-name>/
|-- challenge.yaml
|-- rubric.md            # optional
`-- artifacts/
```

Challenge templates live under [`challenges/_templates/`](../challenges/_templates).

Validate challenge definitions locally with:

```bash
npm run validate:challenges
```

## Future Extensions

Likely future additions:

- reviewer workflow metadata
- seniority targeting
- artifact validation
- workspace templates
- AI interaction trace schema
- replayable reasoning traces

This draft keeps those extensions optional. The current schema is already expected to support both Evaluation Mode and Training Mode through shared challenge content plus mode-specific metadata such as `training_support`.
