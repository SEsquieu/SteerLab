# Embedded

This specialty pack covers embedded and firmware-oriented engineering work in systems that sit close to hardware, peripherals, timing constraints, and constrained runtime environments.

It is intended to support realistic SteerLab generation without turning embedded work into trivia about specific chips or vendors.

## Focus

The pack is designed to produce challenges that surface:

- hardware/software boundary reasoning
- debugging under constrained observability
- timing and state-machine thinking
- failure analysis with logs, traces, configs, and protocol artifacts
- disciplined use of evidence when root causes are ambiguous

## What It Should Avoid

- microcontroller brand trivia
- interview puzzles disguised as interrupt questions
- unrealistic “perfect lab bench” observability
- requiring proprietary board knowledge not present in the challenge

## Expected Uses

- Broken System Investigation:
  device boot loops, intermittent sensor failures, communication timeouts, watchdog resets, field-update regressions
- Architecture Thought Experiment:
  firmware update design, telemetry buffering, fault handling, offline sync, constrained-memory system design
- Tool Steering Challenge:
  using AI to reason about firmware patches, driver changes, protocol debugging, and hardware-adjacent constraints
