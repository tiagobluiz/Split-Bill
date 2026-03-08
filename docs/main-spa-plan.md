# Split-Bill Main SPA Plan

## Summary

- Replace the monorepo with a single root frontend app on `main-spa`.
- Delete backend, contracts, infra, repo-level UX governance docs, and any
  tooling or configuration that only exists to support a multi-app setup.
- Build one production-ready SPA at `/` focused on the fastest possible grocery
  bill split: add participants and payer, add items, assign consumption, and
  view settlement.
- Keep drafts local in the browser and restore them after refresh or reopen.

## Repo And App Shape

- Promote the frontend stack to the repository root with React 19, Vite,
  TypeScript, MUI, React Hook Form, Zod, Vitest, and Playwright.
- Remove `apps/backend`, `apps/frontend`, `packages/contracts`, `infra`, and
  the root tooling that only existed for the monorepo workflow.
- Remove the old frontend UX governance documents and prompt renders.
- Keep a single set of root scripts for `dev`, `build`, `lint`, `test:run`, and
  `test:e2e`.
- Add an accessible drag-and-drop library with `@dnd-kit/*`.

## Product And Interaction Model

- `/` is the only product surface.
- Step 1 collects the full participant set, including the payer.
- Minimum total participant count is 2, including the payer.
- Exactly 1 participant is marked as payer in Step 1.
- Step 2 collects items only, with `item name` and `price`.
- Step 2 and Step 3 both support drag-and-drop reordering for items.
- Step 3 supports `Even`, `Shares`, and `Percent` row modes.
- Step 4 shows settlement instructions and per-person totals for consumed,
  paid, and net values.
- Because the app has one payer, settlement always resolves to reimbursements
  toward that payer.

## Calculation Rules

- Store money in integer cents.
- Support discounts as negative-price rows.
- Default every new row to an even split across all participants.
- Preserve row-level input when switching between split modes.
- When rounding leaves an extra cent to allocate, favor the payer by assigning
  the extra cent burden to non-payers first.

## Validation And Persistence

- Participant names must be non-empty and unique after trimming.
- Step 2 requires at least one valid item.
- `Even` requires at least one included participant.
- `Shares` requires a total greater than zero.
- `Percent` requires a total of exactly `100`.
- Persist the active draft to `localStorage` and offer restore or reset on
  app load.

## Test Coverage

- Unit tests for split math, rounding, discounts, and validation failures.
- Integration tests for the wizard flow and draft restore.
- End-to-end coverage for the full bill-splitting journey.
