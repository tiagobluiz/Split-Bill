# CI Quality Gates

`SB-002` defines the baseline pull request quality gates for Split-Bill.

## Workflow

- Workflow file: `.github/workflows/ci-quality-gates.yml`
- Workflow name: `CI Quality Gates`
- Required check name: `quality-gates`

## What Runs

For pull requests and pushes to `main`, CI detects changed scopes first.

If code-related scopes changed (`backend`, `frontend`, `contracts`, `infra`,
`standards`), CI executes:

1. `npm ci`
2. `npm run bootstrap`
3. `npm run lint`
4. `npm run contracts:check`
5. `npm run format:check`
6. `npm test`

If only `docs` changed, the workflow records a docs-only skip message while
still reporting a successful `quality-gates` status check.

Changed scopes (`backend`, `frontend`, `contracts`, `infra`, `docs`,
`standards`) are published to the run summary so reviewers can quickly validate
impact.

## Branch Protection

To block merges when checks fail, configure GitHub branch protection/rulesets
for `main` and require status check `quality-gates`.
