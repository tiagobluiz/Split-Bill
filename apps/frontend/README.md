# Frontend Workspace

React + TypeScript frontend workspace for Split-Bill.

## Local Dev

Run from repository root:

- `npm run dev`

Or from this directory:

- `npm run dev`

## Quality Checks

- `npm run lint`
- `npm run test:run`
- `npm run build`

## Contracts Client Usage

Frontend consumes the generated TypeScript client from:

- `packages/contracts/generated/typescript-fetch/src`

Regenerate that client whenever contract changes:

- `npm run generate:ts-client --workspace @split-bill/contracts`

## UX Render References

For this scope, implementation aligns with:

- Prompt 02 (Sign In): form field structure and validation presentation.
- Prompt 04 (Event List Dashboard): card spacing rhythm and app-surface hierarchy.
