---
name: adversarial-review-loop
description: Route authored work to an independent reviewer and iterate to
  severity convergence — re-review while Critical/Important findings remain,
  stop once only Minor remain. Use when the user says "adversarial review",
  "review to convergence", "review until clean", "loop the review", or when
  another skill needs work hardened before a gate (e.g. before opening a PR).
  Reviewer-agnostic — uses the codex skill by default, a fresh subagent as
  fallback.
---

# Adversarial review loop

Harden authored work by routing it to an **independent** reviewer, acting on
what comes back, and **re-reviewing until it converges** — instead of trusting a
single pass or looping open-endedly. You own the severity rubric and the stop
rule; both are defined here, so this works on a clean machine with nothing else
installed.

The discipline this replaces: self-review (an author rationalizes their own
output) and ad-hoc review depth (one pass some runs, six the next, no rule for
when you're done). Independence + a severity-based stop rule fix both.

## Inputs

Determine what to review from `$ARGUMENTS` or context. The scope is always a
**change** — a diff, a branch, or a commit — never an arbitrary path, because
this skill reviews authored work, not a static tree:

1. **Explicit scope wins.** If a scope is passed in (`$ARGUMENTS`, or by a
   calling skill) — `uncommitted`, a base branch to diff against, or a commit
   sha — use it.
2. **Otherwise, default to all authored work not yet in the base** — the widest
   change set, not the narrowest. On a feature branch, that's everything between
   the integration base and your work, *including* uncommitted edits — reviewing
   the uncommitted tweak alone would let committed branch work escape review.

**Cover the whole change as one set.** The reviewed scope must include *every*
edit not yet in the base — committed branch commits and uncommitted (staged,
unstaged, untracked) work alike; reviewing the uncommitted tweak alone lets
committed branch work escape, and vice versa. What matters is that coverage, not
a fixed command — assemble it however your VCS state requires. A reliable default
on a feature branch: diff the **working tree against the merge-base** with the
integration branch (`git diff $(git merge-base <base> HEAD)`), which captures
committed and uncommitted edits in one set, plus any **untracked** files (a diff
omits them, and a brand-new file is often the entire change). Use the merge-base,
not a two-dot `base..HEAD`, so upstream commits that landed on the base after you
forked aren't reviewed as your work. Where a reviewer accepts only coarser scopes
(e.g. codex's `--base`/`--uncommitted`), shape the work to fit — see dispatch.

**Find the base.** The base is the **integration branch you'll merge into** — not
your branch's own upstream (`@{u}` resolves to `origin/<your-branch>` and drops
your pushed commits). Discover it from the remote's default head
(`git symbolic-ref --short refs/remotes/<remote>/HEAD`); don't hard-code `main` or
assume the remote is `origin` (repos use `upstream`, `master`, `trunk`). When the
integration target is genuinely ambiguous (a fork with both `origin` and
`upstream`) or undiscoverable (a local-only repo with no remote), don't guess —
diff against whatever local base is correct, or ask for an explicit one. Never
silently review an empty or wrong scope.

Lock the scope once and review the *same* scope each round, so convergence is
measured against a moving target of fixes, not a shifting target of files. If the
scope is a merge-base diff, **pin the merge-base commit sha** at the start and
diff against that fixed sha every round — recomputing `git merge-base` mid-loop
lets a rebase or an advancing base silently shift what's under review.

The scope must **reflect the fixes you make between rounds** — that's what lets
the loop converge. Any working-tree-based scope (the merge-base diff above, or a
plain `uncommitted` review) does this for free: your edits show up next round. The
exception is a scope **anchored to frozen history** — a fixed commit sha, or a
committed-only range you don't re-touch. There, fold each round's fixes back in
(commit or amend) before re-reviewing, or the next round re-reports the same
findings against a stale diff. A commit sha you can't amend is a **one-shot**
review, not a loop.

## The loop

Repeat until the stop rule fires:

1. **Dispatch an independent reviewer** (see below).
2. **Grade** every finding Critical / Important / Minor (rubric below).
3. **Act** on the findings (fix / push back / YAGNI-check).
4. **Check the stop rule.** If it fires, exit. Otherwise re-review the updated work.

### 1. Dispatch an independent reviewer

The reviewer must be a **separate context** — never grade your own work as the
reviewer. That defeats the entire point.

- **Default — codex.** Use this path only when the **`codex` CLI is actually
  runnable** (`codex` on `PATH`) — not merely when a `codex` skill file happens
  to exist in the repo, which it can without the CLI installed. When it's
  runnable, invoke it in review mode against the locked scope. Its review flags
  are **mutually exclusive** — `--base <ref>` sees only committed history,
  `--uncommitted` sees only the working tree — so codex fits cleanly only when the
  change is *already* wholly on one side: a fully-committed branch (`--base
  <integration-base>`) or a pure working-tree change (`--uncommitted`). A **mixed**
  branch (committed work *and* local WIP) can't be covered by either flag, and you
  should **not mutate history to force it** — committing or amending purely to feed
  a review is a surprising side effect. Route mixed state to the subagent fallback
  instead; it reviews the combined diff directly, no history change. (Never pick
  one flag on a mixed branch, or union two separate codex reviews — each leaves
  half the change, or the cross-half interactions, unseen.) Codex returns findings
  with its own severities; you re-grade them against the rubric below (don't
  inherit its labels verbatim). **If the codex path is unavailable or errors out,
  drop to the fallback** — never let a missing reviewer abort the loop.
- **Fallback — a fresh subagent.** If codex isn't runnable, spawn a subagent
  (`Task`) with **no prior conversation context** and this brief: *"Adversarially
  review this change. Assume it is broken and find how. Report concrete findings
  with file/line and a one-line rationale each. Do not fix anything."* Give it
  the complete change: the **diff** for the locked scope (so deletions, renames,
  and small edits inside large files are visible as *changes*, not just current
  state) **plus** the full contents of any **untracked** files only — those are
  absent from a diff against tracked history. Don't re-send added *tracked* files;
  their full content is already in the patch, and duplicating a large one can blow
  the reviewer's context. Patch alone hides untracked files; the diff alone hides
  what was removed or changed — together they cover both. A clean subagent gives
  you the independence codex would
  have.

Either way you get a list of findings to grade. Degrade gracefully — the loop
runs identically whichever reviewer answered.

### 2. Grade every finding

Assign exactly one severity. When unsure between two levels, pick the higher.

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | The change is wrong or unsafe as written — incorrect logic, data loss, security hole, crash, breaks a contract callers depend on. | Fix this round, before anything else. Blocks convergence. |
| **Important** | A real defect or quality gap that should be fixed before this work proceeds — unhandled error/edge case, missing or wrong test on changed behavior, a violated project convention, a regression risk. | Fix this round. Blocks convergence. |
| **Minor** | Nits and optional improvements — naming, style, formatting, a comment, speculative hardening, "could also." Nothing breaks if it ships. | Do **not** fix in the loop. Collect as a follow-up. Does not block. |

Only **Critical** and **Important** block convergence. Minor never does.

### 3. Act

- **Fix every Critical and Important** in the locked scope before re-reviewing.
- **Push back when the reviewer is wrong.** Respond with technical reasoning,
  not deference — reviewers produce false positives and miss context. A finding
  you refute with sound reasoning (it's a non-issue, or the reviewer
  misunderstood the design) is **resolved**, not deferred: record the one-line
  rationale and stop counting it as blocking. Don't loop on a finding you've
  correctly rebutted.
- **YAGNI-check suggested additions.** When the reviewer proposes *new* scope —
  an abstraction, a config knob, defensive code for inputs that can't occur,
  "you should also handle X" — don't accept it reflexively. If it's not needed
  for this change to be correct, downgrade it to Minor or decline with a reason.
  Hardening the loop doesn't mean inflating the diff.

### 4. Stop rule (convergence)

After acting, decide whether to re-review or exit:

- **Re-review** if any Critical or Important finding remains unresolved
  (including ones you couldn't fix this round). Run another full round on the
  locked scope.
- **Stop** the first time a round surfaces **only Minor findings, or nothing at
  all**. The work has converged.

A finding stops blocking when it is **fixed** or **refuted with reasoning** —
those are the only two exits. If you and the reviewer reach a genuine,
well-reasoned impasse on a Critical/Important finding (you can't fix it and can't
soundly refute it), stop the loop and **surface that disagreement to the user**
rather than re-reviewing forever. Open-ended looping is the failure mode this
skill exists to prevent.

## Output

When the loop exits, report:

- **Converged** — confirm no Critical/Important findings remain, and how many
  rounds it took.
- **Fixed** — the Critical/Important findings you resolved (brief list).
- **Follow-ups** — the Minor findings you deferred, as a list the caller (or the
  user) can act on later. Omit if none.
- **Open disagreements** — any unresolved Critical/Important impasse you're
  surfacing instead of looping on. Omit if none.

Don't merge, push, or declare anything done — converging the review is this
skill's whole job. Hand the result back to the caller.
