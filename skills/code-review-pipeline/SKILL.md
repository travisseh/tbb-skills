---
name: code-review-pipeline
description: Run a complete pre-PR quality pipeline for a feature branch, including scope review, structural review, simplification, over-engineering review, project-convention and design-system checks, verification, PR preparation, and a visual recap. Use when a feature is functionally complete and needs a full review or PR-ready pass.
---

# Code Review Pipeline

Run the quality stack on the current feature branch. The feature should already
be functionally complete and demoable. This pipeline reviews, simplifies,
verifies, and packages the work; it does not invent missing product scope.

Work through the phases in order. After every phase that changes code, run the
repository's focused checks before continuing. If a required check cannot pass
after two focused attempts, stop and report the blocker rather than continuing
on a broken base.

## Artifact location

Store review-only output outside the repository:

```text
${AGENT_ARTIFACTS_DIR:-$HOME/.agent-artifacts}/code-review/<repo>/<issue-or-branch>/<timestamp>/
```

Use the operating system's temporary directory if that root is unavailable.
Screenshots, recordings, traces, logs, reports, PR drafts, browser state, and
exploratory scripts belong there. Only product code and intentional tests,
fixtures, migrations, and repository documentation belong in the repository.

## Phase 0: Scope

1. Read repository instructions and identify the integration branch from the
   remote default branch or explicit PR target.
2. Build the full change set from the merge base through the current working
   tree, including staged, unstaged, and untracked files.
3. Flag unrelated files and review-only artifacts. Preserve unrelated user
   changes and ask for a keep/exclude decision only when the intended fix would
   overlap them.
4. Confirm any repository-required ticket and branch naming convention. Do not
   create or mutate external tickets unless the user authorized that action.

## Phase 1: Structural review

Run an independent structural review of the complete change set. Look for:

- stored state that can be derived safely;
- duplicated state transitions or business rules;
- integration knowledge outside the integration boundary;
- unclear ownership, authorization, or transaction boundaries;
- schema changes that create avoidable maintenance work;
- abstractions that hide rather than simplify behavior.

Implement only high-confidence structural improvements that preserve the
feature's intended behavior. Record real tradeoffs that you deliberately leave
unchanged.

## Phase 2: Simplification

Review changed files for behavior-preserving simplification:

- reuse existing helpers and platform features;
- collapse duplicate branches and unnecessary wrappers;
- remove dead or speculative code;
- preserve public APIs, user-facing copy, migrations, and data contracts unless
  the task explicitly authorizes changing them.

Verify every automated simplification claim against the final diff.

## Phase 3: Over-engineering review

Use the `ponytail` skill on the updated diff when installed. Otherwise apply its
core ladder directly: delete first, then standard library, native platform,
already-installed dependencies, and finally the minimum custom code. Consider
`delete`, `stdlib`, `native`, `yagni`, and `shrink` opportunities. Implement
only high-confidence cuts that preserve correctness, validation, security,
accessibility, and error handling.

Report the net line-reduction estimate, or `Lean already. Ship.` when nothing is
worth cutting.

## Phase 4: Project-convention review

Derive the checklist from the repository's own instructions, schema, sibling
features, and recent accepted changes. At minimum, check:

- mutations enforce authorization and invariants server-side;
- important data changes have the expected audit trail and transaction boundary;
- schemas use durable timestamps, deletion behavior, identifiers, and failure
  details appropriate to the domain;
- validation and error shapes match nearby code;
- tests independently validate intended behavior instead of mirroring the
  implementation;
- configuration fails clearly instead of silently using unsafe hardcoded values;
- shared values are computed once and reused across surfaces;
- external API behavior is isolated behind an integration boundary.

Do not copy conventions from another company or codebase when the current
repository provides its own pattern.

## Phase 5: Design-system conformance

For every changed UI surface:

1. Search sibling features and the shared component inventory before accepting
   hand-written components.
2. Reuse established dialogs, forms, hooks, badges, cards, tables, empty states,
   and server-error handling.
3. Match the closest product pattern rather than generic framework defaults.
4. Preserve accessibility basics, including labels, keyboard behavior, focus,
   contrast, and descriptive errors.

## Phase 6: User-facing copy

- Follow repository copy conventions.
- Lead examples with the user's main use case.
- Make error messages explain the next action in the user's vocabulary.
- Make destructive confirmations state the real consequence.
- Remove internal implementation language from customer-facing strings.

## Phase 7: Verification

1. Run the repository's required lint, type, test, and build commands using its
   pinned runtime and package manager.
2. Run focused tests for changed behavior.
3. For user-visible changes, start the real application on an available local
   port and exercise the changed flow in a browser.
4. Restart the development server after material edits before trusting visual
   evidence.
5. Save screenshots, traces, and recordings outside the repository.
6. Reset any test data created during verification.
7. Distinguish code changes, local checks, visible UI behavior, and
   production-verified behavior in the handoff.

If the flow is demoable and the user explicitly authorizes recording and
uploading it, use the `record-demo` skill after browser verification. Otherwise
record `Demo video: not created - external recording/upload not authorized` or
`Demo video: not applicable - <reason>`.

## Phase 8: PR preparation

Prepare, but do not publish, the PR package unless the user explicitly asked for
the external action:

- exact file list and diff summary;
- conventional commit message when the repository uses one;
- problem-first PR body with mechanism, verification, risks, and demo links;
- required reviewers and checks from repository configuration;
- unrelated files and decisions that remain with the user.

Never commit, push, open a PR, resolve review threads, or merge without the
authorization required by the current task and repository instructions.

## Phase 9: Visual recap

When the branch is large or cross-cutting, use `visual-code-review` to create a
reviewer-facing map of the complete change set. Keep generated source outside
the repository. Publish it only when sharing is explicitly requested.

## Final report

Report:

- changes made in each phase;
- findings deliberately skipped and why;
- check and browser-verification results;
- demo and visual-review artifacts;
- the commit/PR package;
- decisions or blockers that require the user.
