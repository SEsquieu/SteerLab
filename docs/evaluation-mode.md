# Evaluation Mode

Evaluation Mode is one of the two primary applications of the SteerLab framework.

Its purpose is to support assessment of engineering judgment in realistic, AI-era scenarios.

This mode is centered on questions like:

- How well did the candidate reason from the supplied evidence?
- How clearly did they communicate tradeoffs and uncertainty?
- How responsibly did they use AI assistance, when allowed?
- How consistently can reviewers interpret the response?

## What Evaluation Mode Is For

Evaluation Mode is intended for:

- hiring loops
- internal engineering assessments
- calibration exercises
- structured interview experiments
- reviewer workflow design

It is not intended to reduce engineering competence to one score. Its role is to make evaluation artifacts clearer, more realistic, and more inspectable.

## What It Optimizes For

Evaluation Mode prioritizes:

- candidate response capture
- reviewer consistency
- evaluation signals and rubrics
- evidence-based assessment
- challenge realism

## Shared Foundations

Evaluation Mode uses the shared SteerLab core:

- the archetype model
- the challenge schema
- the challenge library
- the challenge design guide
- the reference runner

This is important. Evaluation Mode does not define a separate challenge system. It applies a reviewer- and assessment-oriented lens to the same shared challenge primitives.

It also depends on a specific integration boundary when models are allowed: Evaluation Mode should preserve authentic candidate-model interaction rather than reshaping the model into a teaching assistant.

## Typical Evaluation Mode Features

Examples of evaluation-specific features include:

- candidate notes and response capture
- reviewer notes
- reviewer checklists
- rubric views
- structured review outcomes
- export/import of assessment artifacts
- optional capture of authentic candidate-model interaction traces

See [`docs/llm-integration.md`](./llm-integration.md) for the distinction between training-side coaching and evaluation-side candidate tool use.

## Reviewer Mindset

Reviewers in this mode should focus on:

- reasoning quality
- constraint handling
- engineering judgment
- validation discipline
- communication clarity

They should avoid:

- grading by stack preference
- overvaluing confidence or polish
- treating one exact answer as required unless the challenge truly demands it

See [`docs/reviewer-guide.md`](./reviewer-guide.md) for more detail.

## Boundaries

Evaluation Mode should remain lightweight and legible.

The project should be careful not to overbuild:

- rigid scoring systems
- premature analytics layers
- enterprise workflow assumptions
- platform complexity unrelated to better evaluation design

The point is to support better assessment thinking, not to rush into a full commercial testing platform.
