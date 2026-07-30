# Output Formats — Reference

The description + rubric you authored are format-agnostic. This catalog covers how to serialize them for
each consumer. Pick by who/what grades the work and where it lives. When unsure, emit **Portable** — it
converts into any of the others.

## Contents

- [Portable (default)](#portable-default)
- [Acceptance criteria / definition of done](#acceptance-criteria--definition-of-done)
- [Eval-harness rubric](#eval-harness-rubric)
- [Subagent brief](#subagent-brief)
- [Managed Agents define_outcome](#managed-agents-define_outcome)

---

## Portable (default)

**Use when:** you don't yet know the consumer, or a human will read it directly. This is the raw
material every other format is cut from.

**Template:**

```markdown
**Outcome:** <one-line description naming the artifact + format>

<the rubric markdown — grouped ## sections, gradeable bullets, Output Quality section>
```

That's it. Hand it over as-is, or convert it below.

---

## Acceptance criteria / definition of done

**Use when:** the consumer is a ticket (Linear, Jira, GitHub issue) or a PR, and a human reviewer checks
the boxes. Flatten each rubric criterion into a checkbox; keep the section headings as bold groupings so
a reviewer can scan.

**Template:**

```markdown
**Definition of done:** <one-line description>

**Revenue Projections**
- [ ] Uses historical revenue data from the last 5 fiscal years
- [ ] Projects revenue for at least 5 years forward

**Output Quality**
- [ ] All figures in a single .xlsx with clearly labeled sheets
```

Keep the criteria verbatim from the rubric — the gradeable phrasing is the whole point. Don't soften
"does not exceed long-term GDP growth" into "growth looks reasonable" just because it's now a checkbox.

---

## Eval-harness rubric

**Use when:** an automated grader or LLM judge scores outputs programmatically (skill evals, regression
suites, an LLM-as-judge loop). The harness needs each criterion as a discrete, machine-addressable
assertion — usually with a stable id and a pass/fail (or weighted) result.

**Template (JSON):**

```json
{
  "outcome": "Build a DCF model for Costco in .xlsx",
  "criteria": [
    { "id": "revenue.history_5y", "text": "Uses historical revenue data from the last 5 fiscal years", "weight": 1 },
    { "id": "terminal.growth_cap", "text": "Terminal growth rate does not exceed long-term GDP growth", "weight": 1 },
    { "id": "output.single_xlsx", "text": "All figures in a single .xlsx with clearly labeled sheets", "weight": 1 }
  ]
}
```

Give every criterion a stable `id` so results stay comparable across runs. Each `text` should be
checkable by an evaluator that sees only the artifact — same bar as the rubric. If the harness has its
own schema (e.g. skill-creator's `assertions` array with `text` / `passed` / `evidence`), map to it
rather than inventing a new shape.

---

## Subagent brief

**Use when:** you're handing the work to a subagent (or a fresh session) that will both produce *and*
self-check against the bar — including an **agent or automation that runs repeatedly**, where the rubric
grades the runtime output (e.g. the CSV a daily job appends to), not a one-shot deliverable. The brief is
prompt-shaped: the target first, then the rubric as the standard to meet before returning.

**Template:**

```markdown
## Task
<one-line description naming the artifact + where to write it>

## Done when (self-check against this before returning)
<the rubric markdown — every bullet must hold>

Return the artifact path plus a line-by-line note of which criteria pass.
```

This gives the subagent the same contract a grader would enforce, so it can iterate before handing back
instead of round-tripping through you.

---

## Managed Agents define_outcome

**Use when:** the consumer is Anthropic's Managed Agents API and a harness-provisioned grader scores the
artifact and feeds revisions back automatically. This format adds two API-specific things on top of the
description + rubric: a `max_iterations` count and the event envelope.

**Recommend `max_iterations` first.** Size it to the work, don't just take the default:
- Simple, near-one-shot artifact with few independent criteria → keep near the default **3**.
- Many independent criteria, real ambiguity, or a high bar needing revision rounds → raise it, up to the
  max of **20**.
State the number *and* a one-line reason so a human can adjust.

**Template:**

```json
{
  "type": "user.define_outcome",
  "description": "Build a DCF model for Costco in .xlsx",
  "rubric": { "type": "text", "content": "# DCF Model Rubric\n## Revenue Projections\n- ..." },
  "max_iterations": 5
}
```

The `rubric.content` is your rubric markdown with newlines escaped as `\n`. For a rubric you'll reuse
across sessions, upload it via the Files API and swap to `{ "type": "file", "file_id": "file_01..." }`.

For the full event schema, the evaluation-result table (`satisfied` / `needs_revision` /
`max_iterations_reached` / `failed` / `interrupted`), the beta-header requirements, and the handoff to
the configured API tool for actually sending it, read `references/managed-agents.md`. This skill stops at
the payload — it does not create sessions or send events.
