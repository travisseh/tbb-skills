---
name: define-outcomes
description: "Define what 'done' looks like for any piece of work — a crisp
  description of the target plus a gradeable rubric of independently-checkable
  criteria — then serialize it however the consumer needs. Use whenever someone
  wants to 'define an outcome', 'define what done looks like', 'write a rubric',
  'acceptance criteria', 'definition of done', 'set the bar / success criteria
  for this task', 'gradeable / scoreable criteria', or a 'grading rubric' — for
  a ticket, a PR, an eval harness, a subagent brief, or the Managed Agents API
  (define_outcome), even if they don't name a format. Works interactively
  (draft, pull the user in for gaps + approval) or autonomously (derive 'done'
  from context, no user). EXCLUDE: actually executing the work or running the
  grader, sending Managed Agents API requests / creating sessions, and generic
  code review."
---

# Define Outcomes

Turn a fuzzy task into *graded work*. The core move is the same no matter who consumes it: state what
the finished thing should be (**description**) and the explicit, independently-checkable criteria that
decide whether it's good (**rubric**). Once you have those two, you can serialize them for whatever
needs them — a ticket's acceptance criteria, a PR's definition of done, an eval harness, a subagent
brief, or the Managed Agents API. Your job here is the **authoring craft**, not executing the work or
running the grader.

An outcome has two essential parts (plus per-format extras):

| Part | What it is |
|------|------------|
| `description` | One crisp line naming the artifact + format. "Build a DCF model for Costco in .xlsx." |
| `rubric` | Explicit, **independently gradeable** criteria — grouped markdown. The contract an evaluator scores against. |

**Who grades it varies; the discipline doesn't.** The evaluator might be a human reviewer, an LLM
judge, an automated eval harness, or the Managed Agents grader. The best ones score each criterion
independently and often in a *separate context* from whoever produced the artifact, so they aren't
biased by how it was built. That's exactly why vague criteria hurt you — an evaluator can only check
what you make checkable. The rubric craft (gradeable criteria, the known-good-example technique, the
worked example) lives in `references/rubric-craft.md`; read it before drafting your first rubric.

## Pick a mode

Two ways to run. They share the *entire* authoring craft; they differ only in whether you pause for a
human.

- **Interactive** — a user is in the loop. Draft the best outcome you can from context first, then pull
  them in *only* to fill genuine gaps and to approve before you emit. Default to this whenever a human
  is present and engaged.
- **Autonomous** — no user. Derive "done" entirely from task context, make reasonable assumptions (and
  write them down), self-check, and emit. No approval gate.

If you're unsure and a human is reachable, treat it as interactive — a 30-second confirmation is
cheaper than a rubric that grades the wrong thing.

## Workflow

### 1. Read the task for the artifact, format, and quality bar

Before asking anyone anything, extract what you already know:

- **Artifact** — what concrete thing gets produced? (a `.xlsx` model, a CSV, a report, a merged PR)
- **Format** — file type, file count, where it lands. Pin the exact deliverable you expect.
- **Quality bar** — what makes the result *good*, not just present? This is the raw material for your
  rubric criteria.

If the task names **two incompatible artifacts or formats** ("a plain-text paragraph *and* a multi-sheet
Excel dashboard"), stop here and reconcile — surface the conflict and pick one. Don't quietly draft
around one and drop the other; the self-check in step 5 only catches description↔rubric drift, not a
description that silently abandons half the request.

### 2. (Interactive only) Fill genuine gaps

Ask only what context can't answer — don't interview for things you can reasonably infer. Highest-value
questions:

- What's the deliverable and its exact format?
- What does the quality bar actually require? (the things a reviewer would reject over)
- **Is there a known-good example** of this artifact? If so, derive criteria from it — the technique is
  in `references/rubric-craft.md`. This often beats writing criteria cold.
- **Who/what will grade it, and in what format do they need it?** (Drives the output-format choice in
  step 7 — a human ticket, an eval harness, the Managed Agents API.)

### 3. Draft the description

One line. Name the artifact and the format so the producer and the evaluator anchor on the same target.
"Build a DCF model for Costco in .xlsx" — not "Do some financial analysis." A second clause is fine when
run-semantics are load-bearing — for a repeating job, cadence and write-behavior belong here ("…appends
a dated row to one CSV per day, never overwriting").

### 4. Draft the rubric

Markdown, grouped under `##` section headings, with bullet criteria under each. Every criterion must be
something an evaluator can verify by looking **only at the artifact**.

- Gradeable: "The CSV contains a `price` column with numeric values." / "Terminal growth rate does not
  exceed long-term GDP growth."
- Not gradeable: "The data looks good." / "The model is high quality." (an evaluator can't score these
  reliably, so they produce noise)

Always include an **Output Quality** section that pins the format, file count, and labeling/structure.
See `references/rubric-craft.md` for the principles and a worked example to mirror.

### 5. Self-check before you emit

Four checks, every time:

1. **Every criterion is grader-checkable** from the artifact alone — no "looks good," no criteria that
   require knowing the producer's internal process.
2. **Description and rubric don't contradict.** If the description says `.xlsx` and the rubric demands a
   PDF, no evaluator can reconcile them (in Managed Agents this specifically returns a `failed` result).
   Reconcile before emitting.
3. **The description is faithful to the request.** If the original task named more than the description
   captures, you either reconciled an incompatibility in step 1 or you silently dropped something — make
   sure it's the former. The description and rubric can agree perfectly with each other while together
   ignoring half of what was asked.
4. **An Output Quality section exists** pinning format and structure.

In autonomous mode, also write down any assumptions you made so a human can audit them later.

### 6. (Interactive only) Get approval

Show the user the `description` and the full rubric. Revise on feedback. The rubric is the contract the
evaluator enforces — it's worth a beat of human sign-off.

### 7. Choose an output format and emit

The description + rubric are format-agnostic. Now serialize them for the actual consumer. Read
`references/output-formats.md` and pick:

- **Portable (default)** — the description line + the rubric markdown, ready to drop anywhere.
- **Acceptance criteria / definition of done** — checkbox list for a ticket or PR.
- **Eval-harness rubric** — structured per-criterion checks for an automated grader.
- **Subagent brief** — a prompt-shaped block handing a subagent the target + the bar.
- **Managed Agents `define_outcome`** — the API event payload (+ `max_iterations`, beta headers). Read
  `references/managed-agents.md` for the schema and API handoff.

When in doubt, emit the portable form — it converts into any of the others.

## Saving a rubric to disk (optional)

If asked to save the rubric as a file, follow the current workspace's output
convention. If none exists, use
`${DEFAULT_AGENT_OUTPUT_PATH:-./artifacts/}define-outcomes/` and create that
directory first.

## Red flags

- **Vague criteria.** "High quality," "looks professional," "good structure" — no evaluator can score
  these. Rewrite each as a concrete, checkable fact about the artifact.
- **Description/rubric drift.** They name different artifacts or formats. Reconcile before emitting.
- **Contradictory request.** The task itself names incompatible deliverables. Don't pick one and silently
  drop the other — surface the conflict and reconcile (step 1) before drafting.
- **No Output Quality section.** Format, file count, and structure go ungraded and the producer may hand
  back the right content in the wrong container.
- **Picking a format before the rubric is sound.** The serialization is the last step. Get the criteria
  gradeable first; the format is mechanical after that.
- **Over-interviewing in interactive mode.** Draft first from context; ask only for what you genuinely
  can't infer. A wall of questions before any draft wastes the user's time.
