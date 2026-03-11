# LLM Integration Architecture

This document describes how LLM integration should fit into SteerLab.

The goal is not to turn SteerLab into an AI wrapper or a model-specific product. The goal is to let models participate in bounded roles while SteerLab remains responsible for structure, pedagogy, and evaluation logic.

## Core Principle

SteerLab owns:

- the challenge archetypes
- the challenge schema
- the validation rules
- the reasoning workflow
- the review and training structures

Models may generate or assist, but they do not define the framework.

That means the project should optimize for:

- model-agnostic architecture
- durable structure over model-specific cleverness
- bounded roles for model participation
- authentic interaction capture when evaluation requires it

## Why This Matters

SteerLab should not depend on a particular provider or current-generation model behavior for its core value.

The project’s durable value lives in:

- challenge design
- engineering reasoning workflows
- coaching structure
- evaluator visibility into candidate judgment

If those are strong, the model layer can evolve independently.

## Shared Provider Layer

SteerLab should support multiple providers behind a simple abstraction.

Examples:

- Ollama
- OpenAI
- Anthropic
- local models
- future provider adapters

The provider layer exists so the framework can remain model-agnostic while supporting both hosted and local deployment patterns.

## Three Distinct Model Roles

LLM integration in SteerLab is not one thing. It should be split into three distinct roles.

### 1. Scenario Generator

Purpose:

- generate draft challenge scenarios
- generate draft artifacts or challenge context
- support training-oriented scenario creation

This role is draft-producing, not authoritative.

Generated output should still pass through SteerLab validation and, where appropriate, human review before being treated as a usable challenge.

Typical input:

- archetype
- difficulty
- experience level
- domain
- artifact preferences

Typical output:

- challenge draft
- context
- proposed artifacts
- evaluation signals
- reviewer or thinking checklist candidates

### 2. Coaching Assistant

Purpose:

- support Training Mode
- guide learner reasoning
- provide progressive hints
- reinforce better engineering habits

This role should be pedagogically constrained.

The coach should prefer:

- questions over answers
- hints over solutions
- reasoning prompts over final conclusions
- evidence discipline over confidence theater

The coach should not simply solve the challenge for the learner.

### 3. Candidate Tool Interface

Purpose:

- support Evaluation Mode when candidates are allowed to use LLMs directly
- preserve the authentic model experience
- capture candidate-model interaction for review when appropriate

This role is fundamentally different from coaching.

In this mode, SteerLab should not heavily reshape the model into a teaching persona. The point is to observe how the candidate actually interacts with a model:

- what context they provide
- how they scope requests
- how they iterate
- what they accept or reject
- how they validate outputs

This is the role that makes authentic AI-collaboration evaluation possible.

## Training Mode vs Evaluation Mode

The distinction is important:

- In Training Mode, SteerLab shapes model behavior.
- In Evaluation Mode, SteerLab preserves candidate-model interaction and captures it for review.

That single distinction should guide many future product decisions.

### Training Mode

Relevant model roles:

- Scenario Generator
- Coaching Assistant

Training Mode should use model participation to make practice richer, but always inside a SteerLab-defined pedagogical structure.

### Evaluation Mode

Relevant model role:

- Candidate Tool Interface

Evaluation Mode should preserve authentic usage patterns and make them legible to reviewers without tutoring the candidate or smoothing away important interaction signals.

## Validation Boundary

Generated model output should not become first-class content automatically.

SteerLab should validate:

- schema correctness
- archetype compliance
- artifact references
- evaluation signal quality
- internal consistency

For generated content, there should be a clear boundary:

model output -> validation -> optional repair -> review or promotion

This prevents generated content from bypassing the framework’s quality standards.

## Structure Over Intelligence

The project should prefer structural guarantees over faith in model quality.

That means:

- the challenge format should remain explicit
- the validator should remain authoritative
- coaching rules should remain separate from generation rules
- evaluation trace capture should be explicit rather than implied

SteerLab should become stronger by improving its structure, not by depending on whichever model currently performs best.

## Candidate Trace Capture

Evaluation-side model use may eventually include optional trace capture such as:

- prompts
- model responses
- iteration history
- attached context or files
- timestamps
- candidate notes about acceptance or rejection

That capture should be optional, explicit, and privacy-aware.

The point is not surveillance. The point is to support review of how someone steers a powerful tool in practice.

## Non-Goals

This architecture does not imply that SteerLab should become:

- an AI problem generator with no quality standards
- a thin wrapper around one provider API
- a system that auto-accepts generated challenges
- a coaching system that solves problems for the learner
- an evaluation system that distorts authentic candidate-model interaction

## Design Summary

SteerLab should treat models as bounded participants inside a framework that it controls.

The clean mental model is:

- Scenario Generator: creates draft content
- Coaching Assistant: supports learning
- Candidate Tool Interface: preserves authentic evaluation-time model use

The framework remains the product. The model remains an interchangeable component.

