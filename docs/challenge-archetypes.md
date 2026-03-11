# Challenge Archetypes

This document explains the three canonical SteerLab challenge archetypes:

- Broken System Investigation
- Architecture Thought Experiment
- Tool Steering Challenge

These are not meant to cover every engineering responsibility. They are meant to provide a serious and coherent foundation for evaluating much of real engineering work in an AI-normal environment.

They are the current core archetypes of the project, not a permanent claim that all meaningful engineering evaluation must fit inside exactly three buckets forever.

## Why Archetypes Matter

Engineering evaluation often goes wrong when challenge design is vague about what it is actually trying to measure. A candidate is given a task, but the underlying signal is unclear. Reviewers then score against instinct rather than shared criteria.

Archetypes are meant to force clarity.

Each archetype names:

- the kind of work the candidate is being asked to do
- the primary competence signals the challenge is intended to surface
- the kinds of artifacts that make the exercise realistic
- the reviewer mindset needed to evaluate responses fairly

## Why Start With Only Three

The project starts with three archetypes on purpose.

Too many archetypes too early would make the framework vague, unstable, and easy to dilute. The current set is meant to provide a strong, legible center of gravity for the project.

The intended discipline is:

- new challenges and categories should be added often
- new archetypes should be added rarely

That keeps the framework extensible without letting it collapse into taxonomy sprawl.

## 1. Broken System Investigation

### What It Is

The candidate enters an existing system that is malfunctioning, degraded, or behaving unexpectedly. They are given evidence, not certainty. Their task is to understand the system, form and refine hypotheses, diagnose likely causes, and propose mitigations or fixes.

This archetype should feel like engineering work that starts midstream, after something has already gone wrong.

### Why It Matters

A large amount of engineering value comes from understanding and stabilizing existing systems. This includes incidents, regressions, weird behavior after deploys, performance anomalies, and integration failures. These situations reward people who can work from evidence instead of from idealized assumptions.

### Signals It Reveals

- debugging ability
- systems reasoning
- hypothesis formation
- failure mode awareness
- risk analysis
- evidence discipline
- communication clarity under uncertainty

### Good Challenge Design

Strong Broken System Investigation challenges:

- provide enough evidence for reasoned diagnosis
- leave some ambiguity so the candidate must interpret, not just pattern-match
- make the causal chain reconstructable from the artifacts
- reward careful reasoning more than lucky guessing
- allow multiple plausible mitigations as long as the thinking is sound

Typical artifacts:

- logs
- traces
- metrics snapshots
- config files
- code excerpts
- database notes
- architecture diagrams

### Weak or Gimmicky Versions

Weak versions usually do one of the following:

- hide the answer behind a tiny trick
- require a specific technology-specific trivia fact
- provide too little evidence to support any disciplined conclusion
- reward guessing the intended bug rather than reasoning from artifacts
- confuse chaos with realism

### Reviewer Guidance

Reviewers should ask:

- Did the candidate build a coherent explanation from the evidence?
- Did they distinguish facts, inferences, and unknowns?
- Did they propose sensible mitigation and longer-term fixes?
- Did they understand blast radius and operational risk?

The goal is not perfect clairvoyance. The goal is disciplined diagnosis.

## 2. Architecture Thought Experiment

### What It Is

The candidate is given a realistic design problem: a feature request, migration, scaling pressure, reliability requirement, or system constraint. They must propose an approach, define system boundaries, identify tradeoffs, and explain what matters most.

This is not about drawing the fanciest diagram. It is about reasoning responsibly under constraints.

### Why It Matters

Much of senior and mid-level engineering work is design under imperfect information. Teams rarely choose between obviously correct and obviously wrong architectures. They choose among tradeoffs shaped by history, staffing, operational maturity, cost, and product goals.

### Signals It Reveals

- architecture reasoning
- decomposition
- tradeoff analysis
- scalability thinking
- maintainability thinking
- boundary awareness
- communication clarity

### Good Challenge Design

Strong Architecture Thought Experiment challenges:

- include realistic constraints rather than abstract freedom
- make it possible to discuss migration and rollout, not just end-state design
- reward explicit tradeoff reasoning
- avoid implying there is only one right stack
- surface operational concerns, not just component diagrams

Typical artifacts:

- current system description
- product requirements
- operational constraints
- architecture sketches
- API contracts
- data model notes

### Weak or Gimmicky Versions

Weak versions often:

- reward buzzword fluency
- ask for a giant architecture without meaningful constraints
- focus on naming infrastructure components rather than explaining why they belong
- punish reasonable tradeoffs because the prompt secretly wanted a specific answer

### Reviewer Guidance

Reviewers should ask:

- Did the candidate frame the problem well before solving it?
- Did they identify the main constraints and tradeoffs?
- Did they explain migration, failure handling, and operational implications?
- Did they distinguish what is essential now from what can wait?

The signal is judgment, not diagram density.

## 3. Tool Steering Challenge

### What It Is

The candidate is explicitly allowed and encouraged to use AI assistance. The challenge examines how they direct the tool, provide context, constrain scope, validate outputs, and communicate what they trust or reject.

The purpose is not to reward theatrical prompt-writing. The purpose is to evaluate whether someone can use leverage responsibly.

### Why It Matters

AI tools are becoming part of normal engineering work. That changes evaluation. If leverage is real, then responsible use of leverage is a real engineering skill. Teams need engineers who can guide models well, critique generated output, and avoid mistaking plausible answers for reliable ones.

### Signals It Reveals

- AI collaboration skill
- context steering
- prompt quality
- validation discipline
- iteration strategy
- engineering judgment
- communication clarity

### Good Challenge Design

Strong Tool Steering Challenges:

- make AI use relevant rather than decorative
- give the candidate enough ambiguity that context steering matters
- reward explicit validation plans
- surface risks like overbroad edits, hallucinated assumptions, and false confidence
- keep human accountability central

Typical artifacts:

- vague requirements
- codebase slices
- implementation constraints
- known regression risks
- optional trace-capture hooks or prompt logs

### Weak or Gimmicky Versions

Weak versions often:

- reduce the task to "write a good prompt"
- confuse tool fluency with engineering quality
- treat AI output as inherently impressive
- ignore validation, testing, and scope control
- punish candidates for using AI when the challenge supposedly allows it

### Reviewer Guidance

Reviewers should ask:

- Did the candidate use AI in a bounded, intentional workflow?
- Did they provide context and constraints well?
- Did they explain how they would verify outputs before trusting them?
- Did they preserve human accountability for decisions?

The goal is not blind acceleration. The goal is disciplined steering.

## How the Three Fit Together

These archetypes correspond to three broad modes of engineering work:

- Broken System Investigation: understand and debug existing systems
- Architecture Thought Experiment: design under constraints
- Tool Steering Challenge: use AI leverage responsibly

Together, they provide a more serious framework for evaluation than shallow code puzzles alone. They still leave open many questions about review, bias, scope, and scoring. That is expected. The point of this repository is to make those questions concrete enough to explore in the open.

## When a New Archetype Might Be Justified

The project should not add new archetypes casually.

A new archetype should clear a high bar. In practice, that means it should:

- surface a materially distinct engineering signal
- require a meaningfully different challenge shape
- call for different artifacts or reviewer logic
- represent a substantial class of real engineering work
- not fit cleanly as a category within an existing archetype

If a proposal can be modeled as a new challenge category, that is usually the better move.

This is how the framework can remain open to growth without losing conceptual clarity.
