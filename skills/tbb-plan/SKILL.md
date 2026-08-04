---
name: tbb-plan
description: Turn a Textbook Brokers Jira ticket or feature request into the smallest safe repository-grounded implementation plan. Use before coding work that may affect legacy POS logic, Rails services, imports, money, RabbitMQ/API contracts, or multiple repositories.
---

# TBB Plan

Create a plan that another engineer or agent can execute without rediscovering
the system. Planning is read-only unless the user explicitly asks for changes.

## 1. Define the outcome

Capture:

- ticket, user outcome, acceptance criteria, and non-goals;
- affected school/store, workflow, and environment;
- unresolved business rules and who must answer them;
- data sensitivity and production-access constraints.

Do not hide ambiguity. Ask only questions that materially change the design.

## 2. Ground the plan in the repositories

1. Read `CLAUDE.md`, README, runtime pins, CI, schema, and nearby tests.
2. Inspect the full current flow, not only the named file.
3. Trace every cross-repo contract: producer, transport, consumer, identifiers,
   status values, money units, versioning, and failure handling.
4. Use `git status`, history, and recent accepted code to identify conventions.
5. Record evidence with file paths and symbols. Separate verified facts from
   assumptions.

## 3. Design the failure path first

For each changed workflow, define:

- server-side validation and authorization;
- transaction boundary and persisted state;
- idempotency key and duplicate behavior;
- retryable, terminal, and partial failures;
- reconciliation, alerting, and operator recovery;
- sensitive-data and logging boundaries.

For financial logic, specify rounding, fallback, missing-data behavior, and
source/provenance. For imports, explicitly choose file-, school-, transaction-,
or row-level atomicity. For external APIs, cover schema changes, pagination,
timeouts, and bounded retries.

## 4. Ponytail the design

Invoke `$ponytail` in full mode on the proposed approach. Use its ladder in
order: delete the need, standard library, native platform, installed dependency,
one line, then minimum custom code.

Keep the shortest design that satisfies the acceptance criteria. Do not remove
trust-boundary validation, data-loss protection, security, accessibility, or the
smallest meaningful test. Record what was intentionally skipped and the
measurable condition that would justify adding it later.

If `$ponytail` is unavailable, apply the ladder directly.

## 5. Produce the implementation plan

Use this compact structure:

```markdown
# <ticket>: <outcome>

## Decision summary
<smallest safe approach, ponytail cuts, key tradeoff, and open blocker>

## Flow and contracts
<current flow -> changed flow; cross-repo payloads and invariants>

## Implementation
1. `path/to/file` — symbol: exact change and why
2. ...

## Failure and data design
<atomicity, idempotency, retry, recovery, privacy>

## Verification
<focused tests, full repo checks, Theory/Hunch scenario, New Relic signal>

## Rollout
<migration/order, compatibility, rollback, owners>
```

Every step must name the exact file or discovery step, the intended behavior,
and the test that proves it. Do not prescribe new infrastructure unless the
existing system cannot meet the requirement.

## Test expectations

- Add deterministic tests for changed money, import, and transaction rules.
- Assert persisted and reloaded state.
- Cover missing, malformed, duplicate, and retry input.
- Test the real service boundary; do not prove only a mock.
- Use system tests for changed user-visible flows.
- Match the repository profile and commands in `CLAUDE.md`.

End with `Ready to implement`, or a short list of blockers with named owners.
