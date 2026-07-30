---
name: visual-code-review
description: Build an interactive, reviewer-facing visual code review for a branch or worktree. Use when the user asks for a visual review, split-screen review, PR walkthrough, code-to-UI review, architecture walkthrough, or an artifact that groups changed backend and frontend files by feature and pairs them with real product screenshots. Produce collapsible per-file before/diff/after code views, searchable inventory, UML-style backend and database diagrams, and an external artifact that can optionally be published with Sites.
---

# Visual Code Review

Create a review that helps a human understand what changed, why it exists, and what the resulting UI actually looks like.

## Workflow

1. Inspect repository instructions and the live worktree. Preserve dirty state.
2. Build the change set from an alternate Git index so modified and untracked files are included without staging the user's files.
   Reject changed symbolic links from the generated artifact and require manual
   review so external targets cannot leak local file contents or paths.
3. Group changes into a small number of product flows. Prefer feature or user-flow groupings over folders.
4. For every flow, pair:
   - backend and policy files on the left;
   - frontend files on the left;
   - representative real UI screenshots on the right;
   - a short explanation of the behavior and review risk.
5. Add architecture diagrams wherever the flow has meaningful server, policy, state, or persistence behavior:
   - use a sequence diagram for request and mutation paths;
   - use an entity or class diagram for database relationships;
   - use a state diagram when workflow precedence or transitions matter.
   Keep each diagram beside the feature files it explains. Derive every node, edge, multiplicity, and transition from the live code or schema.
6. Put every file reference in a collapsed `<details>` element. Expanding it must offer three deterministic code views:
   - **Before:** exact file content from the base commit;
   - **Diff:** exact unified diff against the base commit;
   - **After:** exact current working-tree content.
   Default to Diff. Do not reconstruct source from diff hunks.
7. Include a searchable complete file inventory. Each inventory entry must use the same Before, Diff, and After control.
8. Keep the artifact outside the repository unless the user explicitly requests a repo file.
9. Validate the finished artifact at desktop width:
   - all intended feature sections render;
   - every changed file appears in the inventory;
   - file references are collapsed by default;
   - Before, Diff, and After show the correct source for modified, added, and deleted files;
   - architecture diagrams match the implementation;
   - filtering and theme controls work;
   - screenshots open when clicked;
   - there is no horizontal page overflow or browser console error.
10. If the user requests sharing, scan the complete embedded artifact for
    secrets, credentials, personal data, customer data, internal URLs, and files
    outside the approved change scope. Confirm the repository content is
    authorized for the intended audience, then publish with the requested
    visibility. Do not publish by default.

## Architecture Diagrams

Prefer Mermaid syntax when the delivery surface renders it reliably. Otherwise, pre-render the diagram or build it with accessible HTML and CSS. Do not depend on a diagram runtime that fails offline.

Choose the smallest diagram that explains the behavior:

- **Sequence:** actor or UI → server action → authorization/policy → transaction or service → event/audit.
- **Entity/class:** primary models, important fields, foreign keys, ownership, and one-to-many or optional relationships.
- **State:** ordered workflow stages, terminal states, reversible transitions, and blocked or canceled branches.

Use business names first and code identifiers second. Link or label the source files that prove the diagram. Avoid decorative diagrams that merely repeat the file list.

## UI Before and After

Code Before/Diff/After is deterministic and should be included by default. UI before/after is different:

- Capture the real base version and changed version only when both can run safely.
- Use two worktrees or equivalent isolated builds. Do not recreate the old UI from memory or by hiding new elements.
- Put matched screenshots side by side or provide a scrubber when viewport, seed data, and state are equivalent.
- A short before/after video is optional when motion or a multi-step interaction is the material change.
- If the base version cannot run with equivalent data, show only verified current UI and state the limitation.

## Diff Injection

Use `scripts/inject-collapsible-diffs.mjs` after the review HTML exists:

```bash
node scripts/inject-collapsible-diffs.mjs \
  --repo /absolute/path/to/worktree \
  --input /absolute/path/to/review.html \
  --output /absolute/path/to/review.html \
  --base origin/main
```

Pass the actual integration branch to `--base`. If omitted, the script uses the
single discoverable remote default branch and fails rather than guessing when
the target is ambiguous.

The HTML should use the established review structure:

- feature file references use `.file-line` with a `<code>` label and `.delta`;
- the full inventory uses rows with `data-search` and a file path in a `<code>` cell;
- the inventory section has `id="inventory"`.

The script resolves short feature labels to changed paths, embeds exact base, diff, and working-tree text once as JSON, renders views lazily, and leaves all details collapsed by default. It fails on ambiguous or unresolved labels instead of silently showing the wrong file.

## Evidence Rules

- Treat screenshots as UI evidence, not proof that backend behavior is correct.
- Distinguish changed code, local checks, visible UI behavior, and production proof.
- Use live branch metrics rather than copying counts from an older review.
- Show exact source and changed lines on demand, but keep the default reading experience compact.
- Do not label a reconstructed UI as Before. Only a running base revision counts.
- Never stage, commit, push, or modify product code as part of producing the review unless the user separately authorizes it.
- Treat Before and After views as full source disclosure. Never publish them
  outside the repository's authorized audience without explicit approval.
