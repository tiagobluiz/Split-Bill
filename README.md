# Split-Bill Monorepo

This repository is bootstrapped as a monorepo with shared conventions for
formatting, linting, and testing.

## Layout

- `apps/backend`: Kotlin/Spring backend app (implementation to be added in SB-005+).
- `apps/frontend`: React/TypeScript frontend app (implementation to be added in SB-016+).
- `packages/contracts`: OpenAPI and generated client artifacts (SB-003/SB-004).
- `infra/devops`: infrastructure workspace for CI/CD and deployment assets.
- `docs`: plans and developer documentation.
- `tools/standards`: repository quality scripts used by root commands.

## Prerequisites

- Node.js 20+

## Bootstrap Flow

1. `npm run bootstrap`
2. `npm run dev`

This starts both local app workspaces:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080` (`/health` available)

## Root Commands

- `npm run bootstrap`: validates local prerequisites and workspace structure.
- `npm run dev`: starts frontend and backend workspace dev servers together.
- `npm run lint`: validates monorepo structure and coding standards.
- `npm run contracts:check`: validates frozen OpenAPI v1 contract coverage.
- `npm run format:check`: checks whitespace/newline standards.
- `npm run format`: applies whitespace/newline formatting to text files.
- `npm test`: runs bootstrap verification tests.

## Local Infrastructure

Start local Postgres and LocalStack (S3):

- `docker compose up -d`

If default ports are already in use, set overrides before startup:

- PowerShell: `$env:POSTGRES_PORT='5433'; $env:LOCALSTACK_PORT='4567'; docker compose up -d`

Stop and remove containers:

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

## CI

- Pull requests run `.github/workflows/ci-quality-gates.yml`.
- Required status check for protected `main`: `quality-gates`.
- CI details: `docs/developer/ci-quality-gates.md`.

## Notes

- `.editorconfig` and `.gitattributes` define line ending and spacing policies.
- Root commands are intentionally lightweight so SB-001 can establish CI gates
  before feature code exists.
