# Managed Agents — define_outcome Reference

The API-specific mechanics for serializing an outcome as a Managed Agents `user.define_outcome` event.
Only read this when the chosen output format is Managed Agents (see `references/output-formats.md`). The
rubric craft itself is in `references/rubric-craft.md`.

## Contents

- [How an outcome runs](#how-an-outcome-runs)
- [The define_outcome event](#the-define_outcome-event)
- [Evaluation results](#evaluation-results)
- [Handoff: this skill stops at the payload](#handoff-this-skill-stops-at-the-payload)

## How an outcome runs

Defining an outcome elevates a session from *conversation* to *work*. You state what the end result
should be and how to measure quality; the agent works toward that target, self-evaluating and iterating
until it's met.

The harness automatically provisions a **grader** to evaluate the artifact against the rubric. The
grader uses a **separate context window** so it isn't influenced by the main agent's implementation
choices. It scores each criterion independently and returns an explanation summarizing what passed or
failed (or confirms the artifact satisfies the rubric). That feedback is handed back to the agent for
the next iteration.

The agent writes its deliverables to `/mnt/session/outputs/` inside the sandbox. After the final
evaluation the session can continue as a normal conversational session, or a new outcome can be started
— history of the prior outcome is retained. Only one outcome runs at a time, but outcomes can be
chained: send a new `user.define_outcome` event after the previous outcome's terminal event.

## The define_outcome event

You send this to start an outcome. The agent begins work on receipt — no separate user message needed.
It's echoed back with a `processed_at` timestamp and an `outcome_id`.

```json
{
  "type": "user.define_outcome",
  "description": "Build a DCF model for Costco in .xlsx",
  "rubric": { "type": "file", "file_id": "file_01..." },
  "max_iterations": 5
}
```

Fields:

- **`description`** (string, required) — the target. Name the artifact and its format.
- **`rubric`** (required) — one of two forms:
  - `{ "type": "text", "content": "# Rubric\n..." }` — inline markdown (newlines escaped as `\n`).
  - `{ "type": "file", "file_id": "file_01..." }` — a rubric uploaded via the Files API, for reuse
    across sessions. The upload needs **both** the `managed-agents-2026-04-01` and `files-api-2025-04-14`
    beta headers.
- **`max_iterations`** (int, optional) — revise-and-re-grade loops allowed. Default **3**, max **20**.
  See `references/output-formats.md` for how to size it.

All Managed Agents requests require the `managed-agents-2026-04-01` beta header (SDKs set it
automatically). Progress surfaces on the events stream: `agent.*` events show work toward the outcome,
and `span.outcome_evaluation_*` events (start / ongoing heartbeat / end) show the grader's loop. A
`user.message` event can steer the agent mid-outcome but isn't required; a `user.interrupt` pauses the
current outcome (marking the result `interrupted`) so a new one can start.

## Evaluation results

`span.outcome_evaluation_end.result` tells you what happens next. The `iteration` field is a 0-indexed
revision counter (0 = first evaluation, 1 = re-evaluation after the first revision, …).

| Result | What it means / next |
|--------|----------------------|
| `satisfied` | Rubric met. Session transitions to `idle`. |
| `needs_revision` | Agent starts a new iteration cycle. |
| `max_iterations_reached` | No further evaluation cycles. The agent may run one final revision, then the session goes `idle`. |
| `failed` | The rubric fundamentally doesn't match the task — e.g. description and rubric contradict each other. Session goes `idle`. |
| `interrupted` | Only emitted if evaluation had already started before the interrupt. |

The `failed` row is why the description↔rubric self-check matters: a contradiction doesn't get a retry,
it gets a hard failure.

## Handoff: this skill stops at the payload

Authoring the outcome is this skill's job. **Sending** it is not. Creating the session, streaming the
events, polling `outcome_evaluations[].result`, and downloading deliverables from `/mnt/session/outputs/`
belong to the available Managed Agents API client or SDK workflow. Emit the
payload here, then hand off to the configured API tool.
