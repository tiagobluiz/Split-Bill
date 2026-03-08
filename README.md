# Split-Bill

Split-Bill is a frontend-only single-page application for splitting supermarket
receipts quickly. One person pays the bill, everyone adds the items they
consumed, and the app calculates who should reimburse the payer.

## Product Focus

- One receipt, one payer, many participants.
- Item-by-item allocation with default even splits plus shares and percentages.
- Fast entry with drag-and-drop reordering for items.
- Browser-local draft restore so a refresh does not lose the split.

## Stack

- React 19
- TypeScript
- Vite
- MUI
- React Hook Form
- Zod
- Vitest
- Playwright

## Commands

- `npm run dev`: start the local app at `http://localhost:5173`
- `npm run build`: create a production build
- `npm run lint`: run ESLint
- `npm run test:run`: run unit and integration tests
- `npm run test:e2e`: run Playwright end-to-end tests

## Getting Started

1. Install dependencies with `npm install`
2. Start the app with `npm run dev`

## Documentation

- Product plan: `docs/main-spa-plan.md`

## Notes

- `.editorconfig` and `.gitattributes` still define repository formatting rules.
- Drafts are stored locally in the browser only.
