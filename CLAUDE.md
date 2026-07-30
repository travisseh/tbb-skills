# Textbook Technology Agent Context

This is the shared starting point for Textbook Technology product repositories.
Copy it into a repository, keep the matching repo profile, and replace any
unknowns with verified facts. Do not put temporary ticket details here.

## Operating rules

- Read this file, the repository README, CI config, runtime pins, and the current
  ticket before changing code.
- Preserve the repository's framework, runtime, package manager, and local
  patterns. Do not modernize unrelated legacy code.
- Treat production data, student information, credentials, and vendor payloads
  as sensitive. Use sanitized fixtures and Theory/Hunch unless production access
  is explicitly authorized.
- Never log secrets, full vendor payloads, or unnecessary personal information.
- Keep business rules on the server. Frontend validation is supplemental.
- Do not commit, push, open or merge a PR, change a ticket, or modify remote
  state unless explicitly asked.

## System map

- `pos`: legacy PHP/Symfony 1/Doctrine 1 point of sale and core store workflows.
- `weborders`: Rails ordering and upstream web-order workflows.
- `checkout`: Rails checkout and payment workflows.
- `bazaar`: Rails marketplace/integration workflows.
- `product-management`: Rails plus Vue product-management workflows.
- Services exchange data through APIs, RabbitMQ messages, imports, and shared
  identifiers. Payload keys, status values, money units, and identifier formats
  are contracts. Trace both producer and consumer before changing them.

## Repository profiles

### POS

- Use the repository-supported legacy PHP runtime and dependencies.
- New or touched PHP should follow the repository's PSR-1 guidance.
- Keep model calls out of templates and use existing controller helpers.
- Run the smallest relevant PHPUnit suite. Run JavaScript tests/build when
  frontend assets change.

### Weborders, Checkout, and Bazaar

- Use the pinned Ruby version and Bundler setup.
- Run focused Minitest first, then `bundle exec rails test`.
- Run `bundle exec rails test:system` for user-visible flows.
- Run RuboCop, Brakeman, or other repo-configured checks when present.
- Preserve documented RabbitMQ payloads and hard-coded status contracts.

### Product Management

- Use the checked-in Ruby and Node pins, not stale prose.
- Run Rails tests plus the Vue lint, unit-test, and build commands.
- Do not commit generated frontend bundles unless the repository requires it.
- If README, CI, and runtime pins disagree, surface the drift before changing
  runtimes or dependencies.

## Critical design rules

- Financial rules need deterministic tests for rounding, fallback behavior,
  provenance, and missing data. Never silently convert an unknown amount to
  zero without an explicit business rule.
- Imports need an explicit unit of atomicity: file, school, transaction, or row.
  Define duplicate detection, idempotency, retry behavior, partial-failure
  handling, quarantine, and reconciliation.
- External integrations need schema validation, pagination where applicable,
  timeouts, bounded retries, and safe observability.
- Background jobs should be thin. Put business logic in a service/action and
  vendor behavior behind an adapter.
- Database changes must preserve existing data and include an appropriate
  rollout and rollback path.
- Tests should assert persisted and reloaded state, not only return values or
  mocks. Cover malformed and missing nested input.

## Delivery

- Branches normally reference Jira, for example `feature/ABC-123-short-name`.
- Verify in Theory/Hunch before production. Use New Relic and existing logs to
  define the post-release signal.
- CodeRabbit is a first pass, not the approval gate. Resolve or refute each
  actionable finding with evidence, run CI on the final head, then obtain the
  required human review.
- Use [`textbook-plan`](skills/textbook-plan/SKILL.md) before implementation and
  [`textbook-code-review`](skills/textbook-code-review/SKILL.md) before a PR.
