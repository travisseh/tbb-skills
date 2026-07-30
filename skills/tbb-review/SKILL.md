---
name: tbb-review
description: Review a Textbook Technology change against its plan or defined outcomes before a pull request, including repo-specific correctness, simplification, adversarial convergence, CI, CodeRabbit, and human approval. Use after implementation and before a PR is opened or merged.
---

# TBB Review

Review the complete diff against its intended integration branch. Include
staged, unstaged, and untracked files. Preserve unrelated user changes. Do not
commit, push, open or merge a PR, resolve threads, or alter Jira unless asked.

## 1. Reconstruct intent

- Read `CLAUDE.md`, the ticket, README, CI, and runtime pins.
- Find the `tbb-plan` output and any `define-outcomes` rubric in the ticket, PR,
  branch artifacts, or supplied context. Use them as the review oracle when they
  exist: acceptance criteria, non-goals, contracts, checks, and rollout.
- If neither exists, derive the minimum reviewable outcome from the ticket. Ask
  only when missing intent makes correctness impossible to judge.
- Treat the plan as a hypothesis, not proof. Flag both code that violates the
  plan and plan assumptions contradicted by the repository.
- Trace changed payloads and identifiers through every producer and consumer.
- Flag unrelated scope and unverifiable assumptions.

## 2. Review correctness

Look first for the failure modes repeatedly seen in this codebase:

- frontend-only validation or inconsistent create/update validation;
- state that is returned but not persisted and reloaded;
- missing or malformed nested input;
- per-row state leakage or unclear transaction boundaries;
- null-unsafe exception paths and silent fallback values;
- duplicate processing, unsafe retries, and missing reconciliation;
- changed status strings or message fields that break another repository;
- external API schema, pagination, timeout, or response-handling assumptions;
- sensitive request/response logging.

For financial rules, verify units, rounding, provenance, and explicit
missing-cost behavior. For imports, verify the intended atomicity, idempotency,
partial-failure policy, quarantine, and operator recovery.

## 3. Review structure

- Keep jobs/controllers thin and business rules in existing service/action
  boundaries.
- Keep vendor behavior behind adapters.
- Reuse nearby patterns before adding abstractions.
- Reject unrelated modernization, generated artifacts, dead code, and
  speculative infrastructure.
- Review migrations for compatibility, existing-data safety, deploy order,
  rollback, and schema output.

## 4. Delete unnecessary complexity

Invoke `$ponytail-review` on the complete locked diff. It reviews complexity
only, after the correctness pass.

- Apply high-confidence `delete`, `stdlib`, `native`, `yagni`, and `shrink`
  findings that preserve the plan or defined outcomes.
- Never simplify away validation, data-loss protection, security,
  accessibility, or the minimum meaningful test.
- Report `net: -<N> lines possible`, or `Lean already. Ship.`

If `$ponytail-review` is unavailable, apply those five checks directly.

## 5. Verify by repository

Run focused tests first, then the available full checks on the final head.

- **POS:** use the supported legacy runtime; run relevant PHPUnit suites. Run
  JavaScript tests/build if assets changed. Any changed deterministic money,
  import, or transaction rule requires a test.
- **Weborders / Checkout / Bazaar:** run `bundle exec rails test`; run
  `bundle exec rails test:system` for changed flows; run repo-configured RuboCop
  and Brakeman checks.
- **Product Management:** run Rails tests, then Vue lint, unit tests, and build
  with the checked-in Node version.

If no checked-in check exists, say so. Never report a skipped, retried-away, or
unrun check as passing. Review whether tests accidentally make live network
calls and whether CI runtime versions match local pins.

## 6. Review to convergence

1. Resolve or refute each actionable CodeRabbit comment with code or evidence.
2. Invoke `$aos-adversarial-review-loop` on the complete locked scope. Use an
   independent reviewer, fix or technically refute every Critical and Important
   finding, and re-review until a round contains only Minor findings or none.
   Surface a genuine impasse instead of looping forever.
3. If that skill is unavailable, preserve the same independence and stop rule
   with a fresh reviewer context. Never substitute author self-review.
4. Re-run affected checks after the final review fix.
5. Run CI on the final head without `[skip ci]`.
6. Require the repository's human approval. Route business-rule questions to
   Ed, application-logic review to Josh, and infrastructure-sensitive changes
   to Earl as appropriate.

## Output

Lead with findings ordered by severity. Every finding needs:

- file and line;
- concrete failure scenario;
- why existing tests do not prevent it;
- smallest safe fix.

Then report plan/outcome coverage, scope reviewed, ponytail net reduction,
adversarial-review rounds and convergence, checks run, CI/CodeRabbit status,
Theory/Hunch verification, New Relic or logging signal, and remaining risks. If
there are no material findings, say `No material findings` and list any
coverage gaps.
