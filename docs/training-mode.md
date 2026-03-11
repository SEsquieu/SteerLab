# Training Mode

Training Mode is the second primary application of the SteerLab framework.

Its purpose is to help people practice AI-era engineering judgment, not just be evaluated on it.

This mode is centered on questions like:

- How should I reason through this kind of system problem?
- What tradeoffs or failure modes should I notice?
- How should I use AI assistance responsibly on work like this?
- What does strong engineering thinking look like in context?

## What Training Mode Is For

Training Mode is intended for:

- self-practice
- mentorship
- team learning
- onboarding
- engineering enablement
- helping senior engineers adopt AI tools without abandoning rigor

It is especially well suited to people learning how to think more clearly about systems, architecture, debugging, and AI-assisted workflows.

## What It Optimizes For

Training Mode prioritizes:

- guided reflection
- structured thinking
- explicit tradeoff awareness
- learning loops
- comparison with worked examples

Where Evaluation Mode asks how well someone performed, Training Mode asks how to help someone improve.

## Shared Foundations

Training Mode uses the same SteerLab core as Evaluation Mode:

- the archetype model
- the challenge schema
- the challenge library
- the challenge design guide
- the reference runner

This matters because the project should not fork challenge content too early. The same scenario should be usable both for evaluation and for practice, even if the surrounding experience differs.

Training Mode may eventually use model-backed scenario generation and coaching, but those model roles should remain bounded by SteerLab’s pedagogical structure rather than acting as unconstrained assistants.

## Typical Training Mode Features

Examples of training-specific features include:

- reflection prompts
- thinking checklists
- guided hints
- progressive reveal of context
- worked example comparisons
- coaching scaffolds
- model-backed scenario generation and coaching under explicit rules

These features are meant to help people internalize better engineering habits, especially when using powerful tools.

## Training Mindset

Training Mode should reinforce habits such as:

- separating observation from inference
- naming uncertainty explicitly
- identifying tradeoffs before deciding
- constraining AI-generated work before trusting it
- treating leverage as something to steer, not something to obey

The goal is not prompt fluency by itself. The goal is better engineering judgment under leverage.

## Boundaries

Training Mode should not collapse into:

- generic tutorials
- AI hype demos
- hand-holding that removes real reasoning
- challenge content divorced from realistic engineering work

The value of this mode depends on staying grounded in the same serious scenarios that make the evaluation side useful.

See [`docs/llm-integration.md`](./llm-integration.md) for the model-role split between scenario generation, coaching, and authentic evaluation-time model use.
