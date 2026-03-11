# Roadmap

This roadmap is directional. It describes likely phases of the project, not fixed commitments.

## Phase 0: Establish the Core Archetypes

- center the repository on the three canonical archetypes
- refine the challenge schema around archetype-first design
- publish a small but serious seed library
- ship a minimal local runner that reflects the model clearly
- document the philosophy behind the framework
- make explicit that the framework is extensible, but that new archetypes should meet a high bar
- define the relationship between the shared core, Evaluation Mode, and Training Mode

## Phase 1: Strengthen the Open Challenge Library

- expand the number of challenges within each archetype
- diversify domains, seniority levels, and system types
- improve challenge authoring guidance
- document common evaluation signals and failure modes
- keep the challenge corpus grounded and non-gimmicky

## Phase 2: Richer Artifact Support

- improve rendering for logs, code, configs, traces, and diagrams
- add conventions for larger artifact bundles
- explore diff-aware and multi-file scenario display
- support challenge validation and artifact integrity checks

## Phase 3: Candidate and Reviewer Workflows

- add reviewer mode and rubric-specific views
- support candidate response export/import
- explore reviewer annotation workflows
- compare freeform responses with more structured reasoning capture
- make challenge timing and navigation clearer

## Phase 3B: Training Workflows

- define Training Mode as a first-class sibling to Evaluation Mode
- add guided reflection and thinking checklists
- experiment with worked example reveal flows
- explore practice-oriented challenge navigation
- support learning loops without weakening challenge realism

## Phase 4: Model Integration And Reasoning Trace Capture

- define a model-agnostic provider abstraction
- separate scenario generation, coaching, and candidate tool interaction as distinct roles
- support optional scenario generation for Training Mode
- support optional coaching for Training Mode under explicit pedagogical constraints
- define authentic candidate-model trace capture for Evaluation Mode
- study privacy, consent, and misuse risks around trace capture
- distinguish disciplined steering from superficial tool theatrics

## Phase 4B: Replay And Review

- explore replayable reasoning traces
- experiment with prompt and tool-use logging formats
- connect evaluation-time traces to reviewer workflows
- explore training-time replay for coaching and reflection

## Phase 5: Authoring Tools and Ecosystem Growth

- build lightweight challenge authoring tools
- add schema validation and linting
- support open challenge library expansion through community packs
- document adaptation patterns for teams, educators, and researchers
- make it easier to fork the framework without adopting the whole repo

## Phase 6: Evaluation Research

- experiment with reviewer workflows and scoring models
- compare archetype-based signals with traditional hiring signals
- study rubric reliability and reviewer drift
- document bias risks and failure modes in evaluation design
- publish lessons from open challenge development

## Open Questions

- Which signals best capture engineering judgment across the three archetypes?
- Are the current archetypes sufficient, and under what conditions would adding a new one be justified?
- How much structure should candidate responses require?
- How should AI use be captured without rewarding performance theater?
- What kinds of reviewer prompts produce the most reliable judgments?
- How should challenge difficulty vary across role types and seniority?

## What Success Looks Like

Near-term success:

- the three archetypes feel coherent and useful
- contributors add realistic challenges and critique the framework seriously
- the reference runner is simple enough to inspect and extend
- the docs create a shared vocabulary for AI-era engineering evaluation

Longer-term success:

- a broader open challenge library
- better reviewer and authoring workflows
- clearer training workflows for practicing AI-era engineering judgment
- clearer public thinking about how to evaluate engineering in an AI-normal world
- reuse by others without needing a central proprietary platform
