# Example Review: Architecture Thought Experiment

This document shows one possible candidate response and one possible reviewer walkthrough for an Architecture Thought Experiment challenge.

It is not a gold-standard answer key. Its purpose is to make the review model more concrete and show what strong design reasoning can look like without pretending there is only one correct architecture.

Challenge used:

- [`architecture-thought-experiment/feature-flag-migration/challenge.yaml`](../challenges/architecture-thought-experiment/feature-flag-migration/challenge.yaml)

## Example Candidate Response

### Proposed Architecture

I would treat this as a lightweight feature flag platform with a clear separation between:

- a control plane for authoring, approvals, targeting rules, and audit history
- a data plane for low-latency flag evaluation in applications

At a first pass, I would avoid making the request path depend on a live network hop to a central flag service. Instead, I would use centrally managed flag definitions that are distributed to SDKs or service-side evaluators with local caching.

For server-side consumers, I would start with:

- a central flag configuration service backed by a relational database
- an admin interface or API for managing flags and rollout rules
- an append-only audit log for changes
- polling or push-based distribution of flag snapshots to services
- in-process evaluation with cached rule data

For mobile and web clients, I would distinguish between:

- server-evaluated flags for sensitive or high-risk decisions such as billing
- client-consumable flags only for low-risk presentation or experience toggles

I would not put raw targeting logic for sensitive billing behavior into the client.

### Availability and Performance

The core requirement is that flag evaluation should still work in degraded mode.

If the control plane is unavailable, applications should continue evaluating against the last known good snapshot. The failure mode should be stale configuration, not request-path outage.

That means:

- local caching in services
- explicit snapshot versioning
- conservative defaults for flags that have never been seen before
- a clear policy for how emergency kill switches are propagated quickly

For the highest-risk flows, such as billing and onboarding, I would prefer fail-safe semantics to be defined per flag. Some flags should default off if evaluation data is missing. Others may need an explicit fallback state tied to rollout safety.

### Migration Strategy

I would do the migration in stages rather than attempting to replace all hard-coded flags at once.

1. Inventory existing flags and classify them by risk, owner, and consumer type.
2. Introduce the central model and SDK/evaluator while preserving the old code-based checks.
3. Migrate a small set of low-risk server-side flags first.
4. Add dual-read or comparison logging for selected flows to confirm that legacy and new evaluations match.
5. Migrate high-risk flags only after rollback paths, observability, and ownership are clear.
6. Establish a cleanup process for stale flags so the new system does not become another source of debt.

For a period of time, the system should support both legacy hard-coded flags and centrally managed flags. That coexistence is important because the risky part of the project is operational migration, not just building the control plane.

### Auditability and Ownership

Every flag should have:

- an owner
- an intended lifespan or review date
- a description of business purpose
- rollout history
- change audit records

Without this, the platform will solve deploy flexibility while making governance worse.

### Tradeoffs

Main tradeoffs I see:

- local evaluation improves latency and availability but increases cache invalidation and config distribution complexity
- central evaluation is simpler to reason about at first, but it is much more dangerous in a request path for critical flows
- percentage rollout and targeting increase product flexibility but also increase debugging difficulty and stale-flag risk

### What I Would Defer in Version 1

I would defer:

- a highly polished UI
- very expressive rule composition
- cross-region active-active control plane complexity unless proven necessary
- broad client-side targeting for sensitive decisions

Version 1 should optimize for safe rollout, clear ownership, auditability, and low-latency evaluation, not maximum product flexibility on day one.

## Example Reviewer Walkthrough

### Overall Assessment

Strong

### Why This Response Is Strong

The response does not treat the problem as a dashboard or CRUD exercise. It recognizes that the real design challenge is building a safe operational model for rollout and evaluation.

Notable strengths:

- clearly separates control plane from data plane
- protects the request path from central service dependency
- differentiates server-side and client-side use cases
- proposes a staged migration rather than a one-shot replacement
- addresses ownership, auditability, and stale-flag debt

### Evidence of Engineering Judgment

The candidate is making sensible scope decisions.

They are not trying to solve every possible feature flag need in version 1. They are optimizing for the actual high-risk concerns in the prompt:

- billing and onboarding safety
- degraded-mode behavior
- migration practicality
- operational governance

That is a strong sign because architecture quality is often about choosing what not to build yet.

### What Keeps This From Being Perfect

A reviewer might still want:

- more explicit discussion of consistency expectations across regions
- clearer treatment of how emergency kill-switch propagation would be made fast enough for critical incidents
- a more concrete migration example showing how one legacy flag would move end to end

Those are worthwhile follow-up questions, but they do not undermine the core quality of the response.

### What a Weaker Response Would Have Looked Like

A weaker response would likely have:

- proposed a central flag API in the hot path without degraded-mode discussion
- focused mostly on UI and rule editing
- ignored coexistence with legacy flags
- treated mobile and billing flows the same as low-risk web presentation flags
- omitted ownership and stale-flag cleanup entirely

## Why This Example Matters

Architecture challenges are easy to review poorly because reviewers can default to stack preference or diagram aesthetics.

This example is meant to show a better standard:

- reward problem framing
- reward tradeoff clarity
- reward migration and operational reasoning
- do not require one exact architecture to recognize strong work

