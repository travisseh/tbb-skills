# Rubric Craft — Reference

How to write a rubric whose criteria an evaluator can actually score. This is the universal core of the
skill, independent of who consumes the outcome. Read it before drafting your first rubric.

## Contents

- [What makes a rubric gradeable](#what-makes-a-rubric-gradeable)
- [Rubric-writing principles](#rubric-writing-principles)
- [The known-good-example technique](#the-known-good-example-technique)
- [Worked example: DCF model rubric](#worked-example-dcf-model-rubric)

## What makes a rubric gradeable

A rubric is "gradeable" when an evaluator who sees **only the finished artifact** — not the task
history, not how it was built — can mark each criterion pass or fail without guessing what you meant.

The evaluator might be a human reviewer reading a PR, an automated eval harness, an LLM judge, or the
Managed Agents grader. The strong ones share two properties worth designing for:

- **Per-criterion independence.** Each criterion is scored on its own, so one fuzzy line doesn't drag
  down the rest. Write each as a standalone, checkable fact.
- **Separation from the producer.** A good evaluator runs in a separate context (or is a different
  person/model) so it isn't biased by the producer's choices. You can't lean on shared context to make
  a vague criterion legible — assume the grader knows nothing but the artifact and the rubric.

The practical consequence: an evaluator can only check what you make checkable. Every adjective you
leave unquantified is a coin flip at grading time.

## Rubric-writing principles

1. **Make every criterion independently gradeable.** Structure each as an explicit, checkable fact
   about the artifact — "The CSV contains a `price` column with numeric values," not "The data looks
   good." Vague criteria produce noisy evaluations.
2. **Group criteria under `##` sections.** Mirror the natural decomposition of the artifact (for a
   financial model: revenue, costs, discount rate, terminal value, output quality). Sections keep
   per-criterion scoring legible and make gaps obvious.
3. **Always pin output quality.** Include a section that fixes the file format, the file count, and the
   internal structure/labeling (sheet names, section headings, column headers, where things live).
   Otherwise the producer can deliver the right content in the wrong container.
4. **Keep the description and rubric consistent.** If the description says `.xlsx` and the rubric
   demands a PDF, no evaluator can reconcile them. Reconcile the two before emitting. (In the Managed
   Agents API this specific contradiction returns a hard `failed`, not a retry.)
5. **Prefer thresholds and presence checks over adjectives.** "Terminal growth rate does not exceed
   long-term GDP growth" and "Projects revenue for at least 5 years forward" are gradeable; "reasonable
   assumptions" alone is not — pair any judgment word with a concrete test.

## The known-good-example technique

If you don't have a rubric on hand, don't write criteria from a blank page. Take a **known-good
artifact** — an example of the deliverable done well — give it to Claude, and ask it to analyze what
makes that artifact good. Then turn that analysis into criteria. This middle-ground approach often
produces a better rubric than writing criteria from scratch, because it grounds the criteria in a real
standard instead of guesses. In interactive mode, actively ask whether such an example exists.

## Worked example: DCF model rubric

This is the shape to mirror — grouped sections, concrete per-criterion checks, an explicit output-quality
section at the end.

```markdown
# DCF Model Rubric

## Revenue Projections
- Uses historical revenue data from the last 5 fiscal years
- Projects revenue for at least 5 years forward
- Growth rate assumptions are explicitly stated and reasonable

## Cost Structure
- COGS and operating expenses are modeled separately
- Margins are consistent with historical trends or deviations are justified

## Discount Rate
- WACC is calculated with stated assumptions for cost of equity and cost of debt
- Beta, risk-free rate, and equity risk premium are sourced or justified

## Terminal Value
- Uses either perpetuity growth or exit multiple method (stated which)
- Terminal growth rate does not exceed long-term GDP growth

## Output Quality
- All figures are in a single .xlsx file with clearly labeled sheets
- Key assumptions are on a separate "Assumptions" sheet
- Sensitivity analysis on WACC and terminal growth rate is included
```

Notice every line is something an evaluator can confirm by inspecting the file: a count ("last 5 fiscal
years"), a presence check ("on a separate 'Assumptions' sheet"), or a threshold ("does not exceed
long-term GDP growth"). That's the bar each criterion you write should clear.
