# Local Setup

## Requirements

- Node.js 20+

## First Run

1. `npm install`
2. `npm run bootstrap`
3. `npm run lint`
4. `npm run contracts:check`
5. `npm run format:check`
6. `npm test`

## Start Local Workspaces

- `npm run dev`

Expected endpoints:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/health`

## CI Parity

The PR quality gate runs the same local validation commands:

1. `npm run bootstrap`
2. `npm run lint`
3. `npm run contracts:check`
4. `npm run format:check`
5. `npm test`

See `docs/developer/ci-quality-gates.md` for workflow and required check details.
