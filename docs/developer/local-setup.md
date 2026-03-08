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

## Local Infrastructure (Postgres + S3 Mock)

Start dependencies:

- `docker compose up -d`

If default ports are already in use, set overrides before startup:

- PowerShell: `$env:POSTGRES_PORT='5433'; $env:LOCALSTACK_PORT='4567'; docker compose up -d`

Stop dependencies:

- `docker compose down`

Connection defaults:

- Postgres host: `localhost`
- Postgres port: `${POSTGRES_PORT:-5432}`
- Postgres database: `split_bill`
- Postgres username: `split_bill`
- Postgres password: `split_bill`
- LocalStack endpoint: `http://localhost:${LOCALSTACK_PORT:-4566}`
- LocalStack region: `us-east-1`
- LocalStack bucket: `split-bill-local` (override with `S3_BUCKET_NAME`)
- LocalStack access key: `test`
- LocalStack secret key: `test`

## Start Backend Only

From repository root:

- `cd apps/backend && ./gradlew bootRun`

From backend workspace:

- `./gradlew bootRun`

## CI Parity

The PR quality gate runs the same local validation commands:

1. `npm run bootstrap`
2. `npm run lint`
3. `npm run contracts:check`
4. `npm run format:check`
5. `npm test`

See `docs/developer/ci-quality-gates.md` for workflow and required check details.
