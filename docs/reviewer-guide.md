# Reviewer Guide

This document is a first-pass guide for evaluating SteerLab challenge responses.

The goal is not to create a perfect universal scoring system. The goal is to help reviewers make more consistent, evidence-based judgments and avoid collapsing into style preference or vague impressions.

## Reviewer Mindset

Review the response for engineering quality, not rhetorical polish alone.

A strong response usually makes reasoning visible. It distinguishes what is known from what is inferred, addresses constraints directly, and shows judgment about risk, tradeoffs, and validation.

Do not review by asking:

- Did the candidate say exactly what I would say?
- Did they use my preferred tools or stack?
- Did the answer sound confident?

Review by asking:

- Did the candidate understand the problem they were given?
- Did they reason responsibly from the available evidence?
- Did they identify important constraints and risks?
- Did they propose actions that make sense in context?

## General Review Dimensions

Across archetypes, strong responses often show:

- clear problem framing
- evidence discipline
- coherent causal reasoning
- explicit tradeoff handling
- awareness of uncertainty
- practical communication

Weak responses often show:

- premature certainty
- generic advice disconnected from the artifacts
- buzzword substitution for reasoning
- missing risk analysis
- no clear distinction between immediate actions and durable fixes

## Reviewing Broken System Investigation

Focus on:

- how well the candidate interprets the evidence
- whether they form a coherent causal hypothesis
- whether they distinguish symptom from root cause
- whether they propose sensible mitigation and verification steps

Strong signs:

- connects logs, code, metrics, and context into one explanation
- names missing information without becoming paralyzed by it
- considers blast radius and operational safety
- proposes both immediate mitigation and longer-term prevention

Weak signs:

- jumps to generic scaling or restart advice
- overstates certainty from weak evidence
- ignores contradictory artifacts
- proposes fixes without explaining the failure mechanism

## Reviewing Architecture Thought Experiment

Focus on:

- how well the candidate frames constraints before proposing solutions
- whether they surface meaningful tradeoffs
- whether they reason about migration, ownership, and operational burden
- whether they distinguish first version from longer-term evolution

Strong signs:

- defines clear boundaries and responsibilities
- discusses failure handling and degraded modes
- explains why a design fits the team and context
- acknowledges what should be deferred

Weak signs:

- proposes a large architecture with little justification
- recites tools and components without causal reasoning
- ignores migration, rollout, or maintenance cost
- treats scale claims as self-evident

## Reviewing Tool Steering Challenge

Focus on:

- how the candidate would use AI inside a controlled workflow
- how they provide context and constraints
- how they validate outputs before trusting them
- whether they preserve human accountability

Strong signs:

- uses AI for bounded tasks rather than total delegation
- defines acceptance criteria and verification steps
- anticipates plausible but wrong model output
- explains how scope would be constrained

Weak signs:

- treats AI output as authoritative
- confuses prompting fluency with engineering rigor
- ignores privacy, safety, or review constraints
- has no concrete validation plan

## Interpreting Ambiguity

Many challenges intentionally include ambiguity. Do not penalize candidates for failing to infer secret author intent. Reward candidates who:

- make reasonable assumptions explicit
- explain alternative interpretations when relevant
- choose a path and justify it

A candidate does not need the exact same conclusion as the author to be strong.

## Suggested Rating Approach

If you need lightweight structure, use:

- Strong: response demonstrates disciplined reasoning, sound judgment, and good handling of uncertainty
- Mixed: response shows useful competence but misses important constraints, risks, or validation steps
- Weak: response is generic, brittle, overconfident, or disconnected from the actual challenge artifacts

This is intentionally coarse. Overprecision without reviewer alignment usually creates false confidence.

## Common Reviewer Failure Modes

- rewarding style over substance
- overvaluing answers that match personal preferences
- penalizing reasonable alternative tradeoffs
- confusing confidence with competence
- expecting completeness when the prompt only supports a scoped response

The point of review is not to grade performance theater. It is to assess whether the candidate’s engineering thinking is visible and credible.
