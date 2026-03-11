# Example Review: Tool Steering Challenge

This document shows one possible candidate response and one possible reviewer walkthrough for a Tool Steering Challenge.

It is not a gold-standard answer key. Its purpose is to make the review model more concrete and show what responsible AI-assisted engineering work can look like.

Challenge used:

- [`tool-steering-challenge/legacy-typescript-migration/challenge.yaml`](../challenges/tool-steering-challenge/legacy-typescript-migration/challenge.yaml)

## Example Candidate Response

### High-Level Approach

I would treat this migration as a scoped refactor with AI assistance inside a tightly controlled loop, not as a broad “make this typed” task.

The risks in the prompt are exactly the ones AI tools are prone to amplify:

- widening scope across nearby files
- introducing type annotations that satisfy the compiler but misrepresent runtime behavior
- reshaping component logic in ways that look cleaner but subtly change pricing behavior

So my workflow would be:

1. inspect the module manually and define the smallest safe migration slice
2. write explicit acceptance criteria before generating code
3. use AI for bounded transformations or drafting, not end-to-end autonomous refactoring
4. review diffs manually and test behavior against known edge cases
5. repeat in small increments

### Safe First Slice

The first slice I would choose is not “convert the whole module.”

I would start with:

- defining a real `Props` type for the current component shape
- extracting pricing calculation into a pure helper
- adding focused tests for pricing behavior before making deeper structural changes

That gives me a narrow surface area where AI can help with code generation, but where I can still reason clearly about correctness.

### How I Would Prompt the AI

I would give the model bounded tasks with explicit guardrails.

Example prompt 1:

> You are helping with a narrow TypeScript migration in a React component.
> Do not change rendering behavior or component structure beyond what is requested.
> First, infer a minimal safe `Props` interface from this component and list any assumptions separately.
> If a field’s runtime shape is unclear, mark it as uncertain instead of inventing a precise type.

Example prompt 2:

> Extract the subtotal/discount/total logic into a pure helper function.
> Preserve current behavior exactly, including the current discount precedence.
> Return only the helper and the minimal call-site change.
> Do not refactor unrelated JSX or rename unrelated props.

Example prompt 3:

> Propose 5 targeted test cases for pricing behavior based on this code.
> Focus on coupon percent, coupon amount, missing items, and values that could create regressions.
> Do not generate snapshot tests.

### What I Would Not Delegate Blindly

I would not let the model:

- redesign the component architecture in one pass
- infer “better” business rules for discount logic
- propagate new types broadly across the codebase without inspection
- convert weakly understood runtime data into overly precise types

Those decisions need human review because they can create false confidence. A migration can become more typed while becoming less accurate.

### Validation Strategy

Before trusting any generated patch, I would check:

- did the diff stay within the requested scope?
- did any behavior change in pricing calculation?
- were uncertain runtime shapes represented honestly?
- did the model silently normalize or “improve” business logic?

I would validate with:

- focused unit tests around pricing behavior
- manual diff review
- TypeScript compiler feedback
- if possible, a quick manual render check for the component

I would also keep the migration incremental enough that a bad step can be reverted without losing the whole effort.

### Example of Human Judgment Overriding AI

If the model proposed changing:

```ts
const discount = coupon.percent ? subtotal * coupon.percent : coupon.amount || 0;
```

into something more “normalized,” I would stop and verify whether it had changed business semantics. It might be correct to improve this later, but that is a product logic decision, not a typing task.

That is exactly the kind of place where AI can create plausible-looking but dangerous edits.

### Deliverable Framing

At the end of the first pass, I would want:

- one small reviewed diff
- explicit test coverage for extracted pricing logic
- a short note on remaining typing uncertainties
- a defined next slice rather than a giant migration branch

That would let the team build confidence without pretending one AI-assisted pass can safely modernize the whole module.

## Example Reviewer Walkthrough

### Overall Assessment

Strong

### Why This Response Is Strong

The response treats AI as leverage inside an engineering workflow rather than as a source of authority.

Notable strengths:

- narrows the migration into a safe first slice
- uses prompts with explicit scope constraints
- separates generation from validation
- anticipates the common failure mode where generated typing appears correct but changes behavior
- preserves human review around business logic

### Evidence of Engineering Judgment

The strongest signal here is not the prompt wording by itself. It is the surrounding control structure.

The candidate defines:

- what the first step should be
- what the AI is allowed to do
- what it is not allowed to do
- how outputs will be checked before trust is granted

That is the core of responsible tool steering.

### What Keeps This From Being Perfect

A reviewer might still ask for:

- a more explicit strategy for tracking migration assumptions over multiple slices
- clearer discussion of how to prevent scope creep if the AI touches neighboring files
- a more concrete example of a rejected model output and why it would be rejected

Those would strengthen the answer, but the current response already demonstrates solid judgment.

### What a Weaker Response Would Have Looked Like

A weaker response would likely have:

- said “I’d ask AI to convert the component to TypeScript”
- focused on prompt cleverness without validation discipline
- assumed passing type checks is enough
- let the model reshape business logic during the migration
- failed to distinguish between implementation help and judgment responsibility

## Why This Example Matters

Tool Steering Challenges are easy to misunderstand as prompt-writing exercises.

This example is meant to show a better standard:

- reward scope control
- reward validation discipline
- reward honest handling of uncertainty
- reward human accountability over model fluency

