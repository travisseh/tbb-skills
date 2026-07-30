---
name: textbook-code-review
description: Review a Textbook Technology change before a pull request, with repo-specific checks for legacy POS, Rails services, imports, financial rules, cross-repo contracts, CI, CodeRabbit, and human approval. Use after implementation and before a PR is opened or merged.
---

# Textbook Code Review

Review the complete diff against its intended integration branch. Include
staged, unstaged, and untracked files. Preserve unrelated user changes. Do not
commit, push, open or merge a PR, resolve threads, or alter Jira unless asked.

## 1. Reconstruct intent

- Read `CLAUDE.md`, the ticket, plan, README, CI, and runtime pins.
- Confirm acceptance criteria, non-goals, and affected repositories.
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

## 4. Verify by repository

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

## 5. Review the review

1. Resolve or refute each actionable CodeRabbit comment with code or evidence.
2. Run one fresh independent review of the final diff. Use
   `adversarial-review-loop` when installed; otherwise reread the diff with no
   access to the first review notes.
3. Run CI on the final head without `[skip ci]`.
4. Require the repository's human approval. Route business-rule questions to
   Ed, application-logic review to Josh, and infrastructure-sensitive changes
   to Earl as appropriate.

## Output

Lead with findings ordered by severity. Every finding needs:

- file and line;
- concrete failure scenario;
- why existing tests do not prevent it;
- smallest safe fix.

Then report scope reviewed, checks run, CI/CodeRabbit status, Theory/Hunch
verification, New Relic or logging signal, and remaining risks. If there are no
material findings, say `No material findings` and list any coverage gaps.
