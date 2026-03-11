# SteerLab

> How well can you steer powerful tools?

SteerLab is an open-source exploration of engineering evaluation in an era where AI coding tools are normal and allowed.

The project starts from a simple observation: much of modern engineering work no longer looks like isolated code production. It looks like understanding existing systems, designing under constraints, guiding tools well, and making sound judgments from incomplete evidence. If powerful tools are available to everyone, then a central evaluation question becomes: can someone steer those tools, systems, and tradeoffs responsibly?

This repository is a first-pass framework, not a finished standard. It combines a challenge model, seed scenarios, and a lightweight reference runner so contributors can debate the problem in public and improve the artifacts in public.

## Why This Exists

Many engineering interviews still rely heavily on signals that are convenient to administer but weakly aligned with real work:

- timed algorithm puzzles
- context-free implementation tasks
- interviews optimized for recall rather than judgment
- hiring loops that either ban AI unrealistically or ignore it entirely

Those methods were always partial. The spread of strong AI tooling makes their limitations harder to defend.

Real engineering work now often centers on:

- investigating broken systems
- designing with operational and product constraints in mind
- checking, steering, and correcting AI-assisted output
- deciding what to trust, what to verify, and what to reject
- communicating clearly under ambiguity

SteerLab exists to explore evaluation formats that surface those abilities more directly.

## The Three Core Archetypes

SteerLab organizes challenges around three canonical archetypes. Together, they aim to cover a large portion of real engineering work.

### 1. Broken System Investigation

The candidate is given a system that is malfunctioning or behaving unexpectedly. They must inspect artifacts, form hypotheses, diagnose likely causes, and propose mitigations or fixes.

Signals surfaced:

- debugging ability
- systems reasoning
- hypothesis formation
- failure mode awareness
- risk analysis
- communication clarity

Typical artifacts:

- logs
- traces
- metrics snapshots
- configs
- code excerpts
- architecture notes

### 2. Architecture Thought Experiment

The candidate is given a realistic feature request, scaling problem, migration, or system constraint. They must propose an approach, explain tradeoffs, identify risks, and reason about boundaries.

Signals surfaced:

- architecture reasoning
- decomposition
- tradeoff analysis
- scalability thinking
- maintainability thinking
- boundary awareness
- communication clarity

Typical artifacts:

- current system descriptions
- interface definitions
- operational constraints
- traffic assumptions
- product requirements
- architecture sketches

### 3. Tool Steering Challenge

The candidate is explicitly allowed and encouraged to use AI tools. The point is not whether they abstain from leverage. The point is how well they guide it, validate it, refine context, and judge the resulting work.

Signals surfaced:

- AI collaboration skill
- context steering
- prompt quality
- validation discipline
- iteration strategy
- engineering judgment
- communication clarity

Typical artifacts:

- a vague but realistic task
- a codebase slice
- constraints and acceptance criteria
- optional AI interaction logging hooks

## Why These Three Matter

Taken together, these archetypes map to three broad modes of engineering work:

- Broken System Investigation: understanding and debugging existing systems
- Architecture Thought Experiment: designing under constraints
- Tool Steering Challenge: responsibly using AI leverage

This does not cover every engineering responsibility. It does provide a more serious starting point than shallow coding tests for evaluating how someone works with context, ambiguity, leverage, and judgment.

## What This Project Is

SteerLab is:

- an open challenge format centered on the three archetypes above
- a seed library of realistic engineering scenarios
- a local-first reference runner for exploring candidate workflows
- a public place to debate evaluation philosophy and rubric design
- a draft reference implementation, not a finished platform

## Project Goals

- Define an open challenge model that makes archetype-based evaluation concrete.
- Build a simple reference runner that contributors can understand and modify easily.
- Seed the repository with realistic scenarios across all three archetypes.
- Explore how candidate notes, reasoning, and optional AI traces might be captured.
- Encourage rigorous public discussion about AI-era engineering evaluation.

## Non-Goals

- claiming a universal or final hiring standard
- replacing every interview process with one framework
- building a closed commercial test platform
- rewarding performance theater around AI usage
- turning engineering evaluation into a trick-question content mill

## Repository Structure

```text
.
|-- README.md
|-- MANIFESTO.md
|-- CONTRIBUTING.md
|-- ROADMAP.md
|-- docs/
|   |-- challenge-archetypes.md
|   `-- challenge-format.md
|-- challenges/
|   |-- architecture-thought-experiment/
|   |-- broken-system-investigation/
|   `-- tool-steering-challenge/
`-- apps/
    `-- runner/
```

## Reference Runner

The repository includes a minimal React + Vite + TypeScript runner. It currently:

- lists available challenges
- shows archetype, difficulty, time estimate, and evaluation signals
- renders challenge context and supplied artifacts
- provides local note and response fields in the browser

It does not yet implement reviewer workflows, scoring, persistence beyond local storage, AI trace ingestion, or replayable candidate sessions.

## Getting Started

Requirements:

- Node.js 20+
- npm 10+

Run locally:

```bash
npm install --prefix apps/runner
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Challenge Model

Challenges live under [`challenges/`](./challenges) as YAML definitions plus local artifacts.

Read the core docs:

- [`docs/challenge-archetypes.md`](./docs/challenge-archetypes.md)
- [`docs/challenge-design-guide.md`](./docs/challenge-design-guide.md)
- [`docs/challenge-format.md`](./docs/challenge-format.md)
- [`docs/example-review.md`](./docs/example-review.md)
- [`docs/reviewer-guide.md`](./docs/reviewer-guide.md)

The current seed library includes:

- 2 Broken System Investigation challenges
- 2 Architecture Thought Experiment challenges
- 2 Tool Steering Challenge scenarios

For new challenge authoring:

- start from [`challenges/_templates/`](./challenges/_templates)
- validate challenge files with `npm run validate:challenges`

## Contributing

The project needs contributors who want to improve:

- challenge quality
- rubric clarity
- reviewer guidance
- candidate workflow design
- artifact conventions
- AI trace capture ideas
- the project’s assumptions and philosophy

Start here:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`LICENSE`](./LICENSE)
- [`MANIFESTO.md`](./MANIFESTO.md)
- [`ROADMAP.md`](./ROADMAP.md)
- [`docs/challenge-design-guide.md`](./docs/challenge-design-guide.md)
- [`docs/example-review.md`](./docs/example-review.md)
- [`docs/reviewer-guide.md`](./docs/reviewer-guide.md)

## Early Roadmap

Near-term:

- refine the archetype model and challenge schema
- expand the open challenge library
- improve artifact rendering and reviewer guidance
- add better support for candidate reasoning capture
- explore optional AI interaction trace capture

Longer-term:

- richer challenge authoring tools
- replayable reasoning traces
- reviewer workflows and comparative rubric experiments
- stronger artifact support for logs, code, diffs, and diagrams
- broader open-source challenge library growth

## Status

This project is intentionally unfinished.

It is a strong point of view plus a set of editable artifacts meant to invite scrutiny. If you think engineering evaluation should evolve in the AI era, SteerLab is an attempt to make that conversation concrete enough to build on.
