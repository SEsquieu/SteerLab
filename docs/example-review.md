# Example Review

This document shows one possible candidate response and one possible reviewer walkthrough for a SteerLab challenge.

It is not a gold-standard answer key. Its purpose is to make the review model more concrete.

Challenge used:

- [`broken-system-investigation/cache-stampede-catalog-api/challenge.yaml`](../challenges/broken-system-investigation/cache-stampede-catalog-api/challenge.yaml)

## Example Candidate Response

### Working Diagnosis

The most likely root cause is a cache stampede triggered by the TTL change from 15 minutes to 30 seconds, combined with a traffic spike concentrated on a narrow set of popular products.

The key evidence is:

- the deploy changed TTL from 15 minutes to 30 seconds
- cache hit rate dropped sharply from 94% to 61%
- the logs show repeated misses for the same product key within seconds
- the same product ID is queried from the database multiple times before the cache is repopulated
- database pool saturation and rising query latency follow immediately after the miss surge

That suggests the cache layer is not coalescing concurrent misses. When a hot key expires, multiple requests trigger the loader at once. Because the homepage campaign concentrated reads on a few products, this effect was amplified on the most popular keys.

### Causal Chain

1. TTL was reduced dramatically.
2. Hot product entries expired much more often.
3. Traffic spike drove many concurrent reads to the same keys.
4. Multiple requests missed and called the database in parallel for the same product.
5. Database load rose, query latency increased, and the system entered a feedback loop where slower queries prolonged the miss window.
6. Upstream timeouts started once the DB pool saturated.

### Immediate Mitigation

Short term, I would restore the prior TTL or otherwise increase it significantly for hot catalog entries. That is the fastest way to reduce miss frequency and shed load from the database.

If the cache layer or platform allows it, I would also consider temporarily serving stale data for catalog reads rather than forcing synchronous regeneration on expiry.

### Durable Fix

I would add request coalescing or single-flight behavior for cache misses so only one in-flight loader runs per key at a time.

I would also add one or more of:

- TTL jitter to avoid synchronized expiry
- stale-while-revalidate behavior for read-heavy catalog data
- metrics around concurrent miss amplification per key

### Additional Data I’d Want

- whether this cache is process-local or shared across instances
- miss rate by key, not just overall hit rate
- whether multiple pods were stampeding the same keys independently
- whether any fallback behavior changed alongside the TTL deploy
- whether homepage traffic was isolated to a small product subset

I’m confident the cache change is central, but I would still want to confirm whether cross-pod behavior made the incident materially worse.

## Example Reviewer Walkthrough

### Overall Assessment

Strong

### Why This Response Is Strong

The response uses the supplied evidence well and builds a coherent causal explanation instead of offering generic performance advice.

Notable strengths:

- correctly centers the TTL change and hot-key traffic concentration
- notices repeated misses for the same key and connects that to missing request coalescing
- distinguishes mitigation from durable fixes
- keeps a disciplined tone by naming additional data worth checking

### Evidence of Engineering Judgment

The candidate does not just say "the DB is overloaded." They explain why it became overloaded.

That matters because the challenge is not testing whether the candidate can recognize a symptom. It is testing whether they can reason from symptoms to mechanism. The response does that well.

The mitigation is also practical. Reverting or raising the TTL is realistic incident behavior. The candidate avoids premature redesign during the acute phase.

### What Keeps This From Being Perfect

The answer is strong, but a reviewer might still look for:

- more explicit discussion of degraded-mode behavior if the cache cannot be trusted
- clearer mention that process-local cache behavior could make hot-key amplification worse across multiple pods
- more operational detail on how to validate the fix after rollout

Those are improvement opportunities, not serious gaps.

### What a Weaker Response Would Have Looked Like

A weaker response would likely have:

- recommended scaling the database without explaining the miss amplification mechanism
- blamed traffic growth alone
- ignored the deploy detail
- proposed a durable fix without distinguishing immediate mitigation

## Why Include Examples Like This

Worked examples make the framework easier to evaluate publicly.

They show:

- what a serious response can look like
- how reviewers can justify judgments
- how the project thinks about evidence and tradeoffs

This repository should eventually include more examples across all three archetypes.

