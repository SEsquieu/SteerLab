# Challenge Design Guide

This document is about quality control.

SteerLab will only be useful if its challenges stay grounded in real engineering work and resist the usual drift toward puzzle junk, trivia, and gimmicks. A good challenge is not merely interesting. It is a credible instrument for surfacing meaningful engineering signals.

## What Good Challenge Design Tries To Do

A strong challenge should:

- make its primary signal clear
- feel like plausible engineering work
- provide enough evidence or constraints for disciplined reasoning
- reward judgment rather than guessing
- be reviewable without requiring mind-reading

Every challenge should begin with a simple question:

What should a strong candidate visibly do here that a weaker candidate is unlikely to do?

If that cannot be answered concretely, the challenge is probably underspecified or measuring the wrong thing.

## What Makes a Good Challenge

Strong challenges usually have these properties:

### Clear signal

The challenge has a primary purpose. It is mainly about diagnosis, or architecture, or tool steering. It may touch adjacent skills, but the center is clear.

### Realistic context

The system, constraints, and artifacts feel like they could exist in a real team. The candidate is not solving an abstract puzzle. They are working inside believable engineering conditions.

### Useful ambiguity

There is some uncertainty, because real work is uncertain. But the ambiguity is productive rather than arbitrary. It forces prioritization, inference, and tradeoff reasoning.

### Sufficient evidence

The candidate has enough information to produce a disciplined response. The challenge should not depend on hidden facts or secret intended interpretations.

### Reviewable outputs

A reviewer can look at a response and reasonably distinguish strong, acceptable, and weak work. The task is not so open-ended that all judgment collapses into vibes.

## What Makes a Bad Challenge

Weak challenges usually fail in one or more of these ways:

### Puzzle logic disguised as realism

The prompt looks like a real system, but the actual answer turns on a tiny trick.

### Hidden-answer design

The author knows the intended conclusion, but the candidate is not given enough evidence to reach it responsibly.

### Buzzword bait

The task rewards naming fashionable tools or patterns instead of reasoning about why they help.

### Gimmicky AI usage

In Tool Steering Challenges, the challenge becomes "write a clever prompt" instead of "use AI responsibly inside an engineering workflow."

### Excessive breadth

The challenge asks for too much. Candidates end up hand-waving because the scope is closer to "design an entire company platform" than to a serious evaluation scenario.

## How to Avoid Gimmicks

- Do not hide the core signal behind trivia.
- Do not punish candidates for making reasonable assumptions.
- Do not write gotchas that only reward guessing what the author meant.
- Do not confuse messiness with realism.
- Do not reward theatrical AI usage over validation discipline.
- Do not make the challenge artificially adversarial.

If a challenge would make a thoughtful engineer say, "no one would evaluate this way in real life," that is a warning sign.

## How to Surface Real Signals

The main job of challenge design is to create conditions where the desired competence becomes visible.

### To surface debugging ability

- provide multiple artifact types
- include noisy but relevant evidence
- require the candidate to connect symptoms to mechanisms
- ask for mitigation as well as diagnosis

### To surface architecture reasoning

- include real constraints
- force tradeoffs rather than unconstrained invention
- ask about migration, rollout, failure handling, and operational burden
- make maintainability and ownership relevant

### To surface tool steering ability

- give AI a reason to matter
- include enough ambiguity that context-setting matters
- ask how outputs would be constrained and verified
- distinguish between fluent prompting and disciplined engineering

## Archetype-Specific Design Guidance

### Broken System Investigation

Good versions:

- provide logs, code, metrics, configs, or traces that can support a coherent hypothesis
- let the candidate separate observation, inference, and uncertainty
- include operational consequences and mitigation questions

Weak versions:

- hide the answer behind one magic line
- depend on niche vendor trivia
- lack enough evidence to support disciplined diagnosis

### Architecture Thought Experiment

Good versions:

- include concrete business or system constraints
- ask for migration and tradeoff reasoning, not just ideal end state
- surface operational and maintenance implications

Weak versions:

- ask for "design X at scale" with no meaningful context
- reward diagram inflation or stack-name recital
- imply a single correct answer without saying so

### Tool Steering Challenge

Good versions:

- make AI collaboration relevant to the task
- ask how scope, verification, and iteration would be controlled
- keep human accountability central

Weak versions:

- reduce the evaluation to prompt cleverness
- treat AI output as inherently impressive
- ignore privacy, risk, validation, or change review

## Artifact Quality

Artifacts should be:

- concise enough to review
- rich enough to matter
- internally consistent
- directly relevant to the intended signal

Good artifact sets often combine:

- one or two primary artifacts
- one secondary artifact that complicates or confirms interpretation
- enough context to avoid blind guesswork

Bad artifact sets often:

- drown the candidate in noise
- omit the one piece of context required for serious reasoning
- contain contradictions that are accidental rather than purposeful

## Rubric Design

A rubric should help reviewers recognize quality, not pretend there is one mechanical score.

Good rubrics:

- describe strong reasoning patterns
- call out common weak patterns
- focus on evidence, tradeoffs, and judgment
- avoid overfitting to a single phrasing of the answer

Bad rubrics:

- collapse everything into right vs wrong
- reward matching the author’s preferred stack or wording
- ignore uncertainty handling

## Quality Checklist for Authors

Before submitting a challenge, ask:

- Is the archetype clear?
- Is the core signal visible?
- Would a thoughtful engineer recognize this as plausible work?
- Is there enough information for a disciplined response?
- Are the evaluation signals concrete enough for reviewers?
- Did I avoid tricks, trivia, and gimmicks?

If the answer to any of these is no, the challenge probably needs another pass.
