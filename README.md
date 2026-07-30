# TBB Skills

Reusable AI-agent skills for planning, implementation review, pull-request
follow-through, and product demos.

The root [`CLAUDE.md`](CLAUDE.md) is a concise shared-context template for the
five Textbook Technology application repositories. Copy it into each repository
and keep the verified repo-specific details current.

## Included skills

- `textbook-plan`: turn a request into a repository-grounded implementation
  plan with explicit contracts and failure behavior.
- `textbook-code-review`: review the full change set against Textbook-specific
  correctness, integration, test, and approval rules.
- `define-outcomes`: define a crisp target and independently gradeable rubric.
- `ponytail`: find the smallest safe solution that works.
- `code-review-pipeline`: run a complete pre-PR quality pass.
- `adversarial-review-loop`: independently review changes to severity
  convergence.
- `record-demo`: record and publish a real product walkthrough.
- `youtube-upload`: upload an MP4 with the YouTube Data API.
- `baby-the-pr`: monitor a PR with a strict automated-review allowlist.
- `visual-plan`: create a structured visual implementation plan.
- `visual-code-review`: create an interactive code-to-product review.

## Install

Copy a skill folder into the skills directory used by your coding agent. For
example:

```bash
cp -R skills/<skill-name> ~/.codex/skills/
cp -R skills/<skill-name> ~/.claude/skills/
```

Other hosts may use a repository-local `.agents/skills/` directory or a custom
global skills path. Restart the agent or reload its skills after copying.

Some skills depend on tools or services that must be configured separately:

- `youtube-upload` requires Google OAuth credentials, YouTube Data API v3, and
  the script dependency documented in its `SKILL.md`.
- `record-demo` requires `youtube-upload` only when external YouTube publication
  is explicitly requested.
- `code-review-pipeline` uses `ponytail` when installed and includes a built-in
  fallback when it is not.
- `visual-plan` requires the Agent-Native Plans connector or its documented
  local-files mode.
- `baby-the-pr` requires authenticated GitHub access.

Review each `SKILL.md` before use. Repository instructions and explicit user
authorization always take precedence over a skill.
