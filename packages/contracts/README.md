# Contracts Workspace

OpenAPI v1 source of truth:

- `packages/contracts/openapi/openapi.v1.yaml`

Change-control policy:

- `packages/contracts/CHANGE_CONTROL.md`

Validation command (from repository root):

- `npm run contracts:check`

TypeScript client generation (from repository root):

- `npm run generate:ts-client --workspace @split-bill/contracts`

Generation details:

- Generator is pinned to Docker image `openapitools/openapi-generator-cli:v7.13.0`.
- Output path is `packages/contracts/generated/typescript-fetch`.
- Metadata file `packages/contracts/generated/typescript-fetch/.contract-generation.json`
  records source spec hash and generator image for reproducibility.
