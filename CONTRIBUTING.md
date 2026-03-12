# Contributing

SteerLab is an open exploration, not a finished standard. Contributions should make the project more realistic, more inspectable, or more intellectually honest.

## The Core Model

This repository is organized around three canonical challenge archetypes:

- Broken System Investigation
- Architecture Thought Experiment
- Tool Steering Challenge

If you are proposing a challenge, rubric, or workflow change, start by being explicit about which archetype it belongs to and what competence signals it is intended to surface.

The framework is extensible, but new archetypes should be proposed rarely and held to a high bar. In most cases, contributors should propose new challenge categories within an existing archetype rather than expanding the archetype set itself.

The project also distinguishes between:

- shared core framework work
- Evaluation Mode work
- Training Mode work

It is also beginning to distinguish between:

- archetype expansion, which should stay rare
- specialty-pack expansion, which should be the normal path for growing domain breadth

When proposing changes, be explicit about which layer your contribution belongs to.

## Modes

Shared core:

- archetypes
- challenge schema
- challenge content
- challenge design guidance
- model integration boundaries
- base runner primitives

Evaluation Mode:

- reviewer workflows
- candidate response capture
- rubrics
- assessment-oriented runner features

Training Mode:

- reflection scaffolds
- hints and guided practice
- learning-oriented runner features
- worked examples and coaching patterns

The same challenge should stay usable across both modes whenever practical. Prefer extending shared challenge metadata over forking content into parallel challenge libraries too early.

Add to the shared core if the change benefits both modes. Add to Evaluation Mode or Training Mode if the change is specific to one of those applications.

If your proposal is about domain breadth for generation or future challenge design, prefer working through specialty packs rather than proposing new archetypes.

## Contribution Principles

- Prefer realism over gimmicks.
- Prefer clear signals over challenge cleverness.
- Prefer inspectable artifacts over hidden logic.
- Keep the project grounded in plausible engineering work.
- Avoid overclaiming. This is an evolving framework.

## Contributing New Challenges

Each challenge should live under [`challenges/`](./challenges) in the directory for its archetype and include:

- a `challenge.yaml`
- the referenced artifacts
- an optional `rubric.md` if needed

Before submitting a challenge:

- read [`docs/challenge-archetypes.md`](./docs/challenge-archetypes.md)
- read [`docs/challenge-design-guide.md`](./docs/challenge-design-guide.md)
- read [`docs/evaluation-mode.md`](./docs/evaluation-mode.md)
- read [`docs/challenge-format.md`](./docs/challenge-format.md)
- read [`docs/example-review.md`](./docs/example-review.md) for a concrete reviewer walkthrough
- read [`docs/example-review-architecture.md`](./docs/example-review-architecture.md) for a worked architecture review example
- read [`docs/example-review-tool-steering.md`](./docs/example-review-tool-steering.md) for a worked tool steering review example
- read [`docs/llm-integration.md`](./docs/llm-integration.md) if your proposal touches model use, trace capture, generation, or coaching
- read [`docs/training-mode.md`](./docs/training-mode.md)
- start from [`challenges/_templates/`](./challenges/_templates) when possible
- run `npm run validate:challenges`
- be explicit about the intended archetype and primary signals
- keep the scenario plausible for real engineering work
- include artifacts that support disciplined reasoning
- avoid hidden tricks that punish good-faith analysis

## Proposing Challenges Within an Archetype

When proposing a new challenge, explain:

- which archetype it belongs to
- what competence it evaluates
- why the supplied artifacts are sufficient
- what strong responses should reveal
- what weak or misleading versions of the challenge would look like

Examples:

- Broken System Investigation: incident analysis, production regressions, reliability failures, integration anomalies
- Architecture Thought Experiment: migrations, scaling decisions, boundary design, rollout planning
- Tool Steering Challenge: AI-assisted refactors, AI-assisted incident support, AI-guided implementation planning

## Proposing a New Archetype

This should be uncommon.

If you believe the framework needs a new archetype, explain:

- why the proposed work does not fit an existing archetype
- what materially distinct competence signal it surfaces
- what different artifacts or reviewer approach it requires
- why it reflects a substantial class of real engineering work

The default bias should be toward adding categories, examples, and reviewer guidance before adding a new archetype.

## Improving Challenge Design

High-value design contributions usually do one of these:

- tighten the archetype so the signal is clearer
- improve artifacts so the challenge feels more like real work
- remove gimmicks or accidental ambiguity
- make candidate instructions more concrete
- improve reviewer guidance so interpretation is less arbitrary

## Contributing Specialty Packs

Specialty packs live under [`specialties/`](./specialties).

They are the preferred mechanism for extending SteerLab into domains like frontend, devops, data-platform, cloud, payments, or embedded without inventing new archetypes casually.

Before proposing a new pack:

- read [`docs/generation-pipeline.md`](./docs/generation-pipeline.md)
- read [`docs/generation-spec.md`](./docs/generation-spec.md)
- read [`docs/specialty-packs.md`](./docs/specialty-packs.md)
- start from [`specialties/_template/`](./specialties/_template)

Good specialty-pack contributions should:

- define realistic system patterns
- clarify useful artifact shapes
- document common failure modes or tradeoff axes
- identify bad generated patterns to reject
- strengthen realism rather than add domain buzzwords

## Suggesting New Signals or Rubrics

Rubrics and evaluation signals are expected to evolve.

Useful improvements usually:

- distinguish shallow fluency from sound reasoning
- help reviewers see tradeoffs more clearly
- reduce scoring drift between reviewers
- identify failure modes such as premature certainty, buzzword architecture, or uncritical AI acceptance

If you propose a rubric change, explain what reviewer confusion or mis-scoring it fixes.

If you are proposing reviewer process changes, read [`docs/reviewer-guide.md`](./docs/reviewer-guide.md) first and explain how your change improves judgment quality or reviewer consistency.

Repository hygiene for public contributions:

- issue templates live under [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE)
- the pull request template lives at [`.github/pull_request_template.md`](./.github/pull_request_template.md)
- project license: [`LICENSE`](./LICENSE)

## Discussing Evaluation Philosophy

Critique is part of the project.

If you think the archetype model is incomplete, a challenge is biased, a rubric is underspecified, or the project is incentivizing the wrong behavior, say so plainly. Strong criticism is useful when it includes:

- the claim being challenged
- the practical consequence of getting it wrong
- a proposed alternative
- a concrete example that exposes the issue

## Improving the Reference Runner

The current runner is intentionally lightweight. Useful contributions include:

- better archetype presentation in the UI
- richer artifact rendering
- improved note and response workflows
- reviewer mode
- training mode scaffolds
- clearer mode-specific UX boundaries
- AI interaction trace capture experiments
- model-provider integration that preserves the framework boundary
- export/import or replay flows

Keep the implementation hackable. Prefer local-first simplicity unless added complexity clearly earns its place.

## Suggested Workflow

1. Open an issue for substantial philosophy, schema, or workflow changes.
2. Keep pull requests focused when possible.
3. Explain the reasoning behind structural changes.
4. Update docs alongside schema or challenge changes.

## Commit Hygiene

Keep commit history legible.

Preferred patterns:

- commit each meaningful change separately
- separate philosophy or documentation changes from runner or tooling changes when practical
- keep schema and validation changes isolated
- keep challenge additions in their own commits when possible
- avoid catch-all "misc" commits except for purely mechanical cleanup

This is a guideline, not a rigid rule. The goal is to make the repository easier to review, discuss, and evolve in public.

## Development

Install the runner dependencies:

```bash
npm install --prefix apps/runner
```

Start the local app:

```bash
npm run dev
```

## Code Style

- TypeScript preferred for the reference app
- keep dependencies minimal
- keep state management simple
- avoid unnecessary infrastructure
- document non-obvious design choices

## License

Add a project license before broad distribution if one is not already present.
