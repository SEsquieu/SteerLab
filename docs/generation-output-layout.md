# Generation Output Layout

This document defines the first file-layout convention for generated challenge artifacts in SteerLab.

It is meant to support local experimentation, daily practice generation, and repository-bound draft review without mixing those outputs into the curated challenge library too early.

## Design Goal

Generated output should be:

- easy to inspect
- easy to diff
- easy to clean up
- clearly separated from curated repository content
- structured enough that validation and promotion can operate on files predictably

## Top-Level Principle

Generated output should not land directly under [`challenges/`](../challenges) by default.

Instead, it should first land in a generated-output area where:

- draft packages live
- validation reports live
- promotion records live
- repair history can be inspected

Only explicitly promoted content should move toward the curated challenge library.

## Recommended Layout

```text
generated/
|-- drafts/
|   `-- <challenge-id>/
|       |-- challenge.yaml
|       |-- request.yaml
|       |-- validation-report.yaml
|       |-- promotion-record.yaml
|       |-- metadata.yaml
|       `-- artifacts/
|-- daily/
|   `-- YYYY-MM-DD/
|       `-- <challenge-id>/
|           |-- challenge.yaml
|           |-- request.yaml
|           |-- validation-report.yaml
|           `-- artifacts/
`-- review/
    `-- <challenge-id>/
        |-- challenge.yaml
        |-- request.yaml
        |-- validation-report.yaml
        |-- promotion-record.yaml
        |-- metadata.yaml
        `-- artifacts/
```

## Directory Roles

### `generated/drafts/`

General-purpose draft generation output.

Use this for:

- local experimentation
- repair-loop development
- non-promoted generation runs

This is the best default landing area for early scaffolding.

### `generated/daily/`

Ephemeral training-oriented output for daily practice generation.

The date partition makes it easier to:

- generate daily batches
- inspect freshness behavior
- clean up old practice output later

### `generated/review/`

Repository-promotion candidates that are ready for closer human inspection.

This is the most appropriate staging area before content is manually promoted into [`challenges/`](../challenges).

Only drafts with:

- `structural_status: pass`
- `semantic_status: pass`
- `overall_recommendation: promote`

should normally be staged here.

## File Roles

### `challenge.yaml`

The generated challenge definition in repository schema form.

This should be the file the runner and validator can inspect directly.

### `request.yaml`

The normalized `GenerationRequest` used to create the draft.

This is important for:

- traceability
- debugging generation quality
- rerunning with small changes later

### `validation-report.yaml`

The `ValidationReport` for the current state of the draft.

This file should reflect the latest validation outcome after any bounded repair step.

### `promotion-record.yaml`

The `PromotionRecord` if a promotion decision has been made.

This may be absent for early local drafts that have not reached promotion decision-making yet.

### `metadata.yaml`

Optional non-schema metadata for the generation run.

Examples:

- generator provider/model info
- run ids
- repair history summary
- timestamps

This should stay operational and trace-oriented, not become an untyped dumping ground.

### `artifacts/`

The draft artifact bundle referenced by `challenge.yaml`.

This should mirror the repository challenge layout closely enough that promotion into curated content is straightforward later.

## Why Not Write Directly Into `challenges/`

Because generation and curation are different activities.

Writing directly into [`challenges/`](../challenges) would blur:

- draft output
- reviewed content
- daily disposable practice
- curated repository artifacts

SteerLab should keep those paths visibly distinct.

## Promotion Path

A healthy path should look like:

1. generate into `generated/drafts/` or `generated/daily/`
2. validate and repair in place
3. if strong enough, move into `generated/review/`
4. after human review, promote into [`challenges/`](../challenges)

That makes the transition from generated output to curated content explicit.

## v1 Guidance

The first implementation should keep this simple.

For v1:

- support one draft directory per generated challenge
- write YAML files, not databases
- prefer replace-in-place updates for validation and repair
- treat review staging and curated promotion as explicit copy steps

Avoid in v1:

- a complex cache or object store
- hidden binary metadata
- multiple overlapping directory conventions

## Immediate Next Step

With this layout defined, the next useful implementation step is:

1. make review staging the default path between validated drafts and curated repo content
2. expose a compact review summary so generated candidates are easy to inspect before curation
