# AGENTS.md

This file defines default operating rules for any agent session in this repository.

## 1) Session Intent
- Build production-ready increments.
- Prefer small, verifiable changes over large risky batches.
- Keep decisions explicit in code, tests, and docs.

## 2) Unified Queue Mode
Queue mode uses a single queue across disciplines.

Activation convention:
- User explicitly says `Start queue`.
- Run continuously until blocked by missing requirements or non-recoverable tooling errors.

Shared cycle (every iteration):
1. PR maintenance first.
2. Issue hygiene.
3. Review comment triage.
4. Pick and execute next issue batch.
5. Run mandatory checks.
6. Publish cycle summary.

### 2.1 Issue Selection Strategy
- Source of truth for scope is issue labels.
- Eligible queue labels are `backend`, `frontend`, and `contracts`.
- If an issue has more than one discipline label, it is cross-cutting and must be split into discipline-specific issues, or blocked behind an explicit `contracts` issue when contract alignment is required.
- No priority labels are used in this repository. Pick order is:
1. Dependency-ready issues first (parse `Depends On` section in issue body; all dependencies must be closed).
2. Earliest milestone first (`M1` -> `M2` -> `M3` -> `M4` -> no milestone).
3. Oldest issue number first.

### 2.2 PR Maintenance Rules
- Check open PRs in active discipline scope at the start of each cycle.
- Auto-merge PR only when:
- required approvals are present;
- required checks are green;
- PR is mergeable and conflict-free.
- For conflicting PRs:
- sync branch with PR base branch (never hardcode `main`);
- resolve conflicts preserving issue intent and base branch invariants;
- run scope checks;
- push conflict-resolution commit;
- re-check mergeability.

### 2.3 Issue Hygiene Rules
- Auto-close issues when:
- linked PR merged with closing keywords (`Fixes #<id>`, `Closes #<id>`); or
- acceptance criteria are fully delivered and validated.
- Keep issue status and PR links synchronized after every cycle.

### 2.4 Comment Triage Rules
- Before new implementation work, process unanswered review comments in open PRs for the active discipline scope.
- For valid comments:
- implement fix;
- run relevant checks;
- push update.
- Do not post self-review comments.

### 2.5 Discipline-Specific Rules
- Exactly one discipline is active per cycle or batch: `backend`, `frontend`, or `contracts`.
- Batch runs are allowed only for very small-scope issues and must remain single-discipline.
- If the next queued issue is a different discipline, close the current batch and start a new cycle.

Backend discipline:
- Scope boundary: edit `apps/backend/**` only.
- Allowed shared edits: root docs/config only when strictly required by backend change.
- If API contract changes are needed:
- require/update corresponding `contracts` issue first;
- stop backend flow until contract alignment is explicit.
- Mandatory checks:
- `cd apps/backend`
- `./gradlew test`

Frontend discipline:
- Scope boundary: edit `apps/frontend/**` only.
- Allowed shared edits: root docs/config only when strictly required by frontend change.
- If BE/API contract changes are needed:
- require/update corresponding `contracts` issue first;
- pause frontend flow until contract alignment is explicit.
- Mandatory UX governance pre-check (before implementation and before PR update):
- read `/docs/frontend/ux-guidelines-v1.md` completely;
- read `/docs/frontend/ux-render-prompts-v1.md` and identify applicable screen prompts;
- ensure all FE work strictly follows the UX guideline; guideline rules override personal/team preference.
- Mandatory visual implementation reference:
- generate/review the relevant prompt-based render(s) and use them as the required visual target during implementation;
- if implementation differs from render guidance, document deviation with justification and follow-up issue.
- FE baseline is mandatory:
- MUI as UI foundation;
- React Hook Form for forms;
- Zod for validation.
- Every delivered FE screen must be production-ready (no POC mode).
- Mandatory checks:
- `cd apps/frontend`
- `npm run lint`
- `npm run test:run`
- `npm run build`

Contracts discipline:
- Scope boundary: edit `packages/contracts/**` only.
- Allowed shared edits: generated artifacts and root docs/config only when strictly required by contract change.
- If backend/frontend implementation is needed after contract updates:
- create or update corresponding discipline issues and stop contracts-only implementation at contract boundary.
- Mandatory checks:
- `npm run contracts:check`

### 2.6 Testing Depth Requirement (all disciplines)
- Every change must include matrix-oriented coverage:
- happy paths;
- edge cases;
- permission/user-state variants;
- validation failures;
- error paths;
- regression checks.
- Backend must include controller-level integration coverage for affected endpoints.

### 2.7 Cycle Output Format
- Discipline per picked issue or batch (`backend`, `frontend`, or `contracts`).
- Issues picked.
- Changes made.
- Tests run with results.
- PR links created/updated.
- Merge actions performed.
- Issue close actions performed.

### 2.8 Governance
- Never use destructive git actions (`reset --hard`, forced history rewrite) unless explicitly requested.
- Keep one active delivery PR per scope unless grouped issue batch requires a shared PR.
- Stop only for true blockers and report blocker + concrete next options.

## 3) Programming Guidelines

### 3.1 General
- Follow clean architecture boundaries (domain, application, infrastructure, UI).
- Keep modules cohesive and dependencies directional (inward to domain).
- Optimize for readability and maintainability before micro-optimizations.
- Avoid hidden magic; prefer explicit configuration and typed contracts.

### 3.2 Backend (Kotlin/Spring)
- Target architecture is Domain-Driven Design (DDD), with clear bounded contexts and ubiquitous language.
- Use immutable DTOs and explicit validation at API boundaries.
- Treat money as fixed-scale decimal plus currency code.
- Keep business rules in domain/services, not controllers.
- Make financial calculations deterministic and repeatable.
- Add migration scripts for every schema change.

### 3.3 Frontend (React/TypeScript)
- Every screen delivered in a frontend ticket must be production-ready; there is no POC-only mode for FE work.
- Use typed API contracts; avoid ad-hoc request shapes.
- Use React Hook Form + Zod for all form validation.
- Keep UI components presentational when possible; isolate data logic.
- Reuse form input sizing/style tokens to keep visual consistency.

## 4) Testing Requirements
- Every feature change must include tests.
- Backend:
- Unit tests for domain/application logic.
- Integration tests for controllers (HTTP -> service -> persistence).
- Frontend:
- Component and integration tests for views/forms.
- E2E tests for critical user journeys.
- Financial logic changes must include matrix-based scenario coverage.

## 5) Documentation Requirements
- Update architecture decisions (ADR) when technical direction changes.
- Update business decisions (BDR) when product rules change.
- Keep API documentation generated from source contracts.
- Update user-facing wiki pages when behavior/UI changes.

## 6) Delivery and Git Workflow
- One issue-focused branch/PR at a time.
- Keep PRs scoped; avoid mixing unrelated concerns.
- Do not merge without passing CI checks.
- Include test evidence and docs impact in PR description.

## 7) Security and Reliability
- Validate all external input.
- Use least privilege for credentials and integrations.
- Protect uploads with type/size checks.
- Never log secrets or sensitive tokens.

## 8) Agent Operating Rules
- Start by inspecting current repo state and constraints.
- If requirements are ambiguous, ask targeted clarification early.
- Report blockers immediately with concrete options.
- Do not perform destructive actions without explicit instruction.

## 9) Definition of Done
- Code implemented.
- Tests added/updated and passing.
- Documentation updated (as applicable).
- CI green.
- Issue/PR traceability preserved.

## 10) Full-Access Safety Guardrails
- These guardrails apply when the agent runs with full filesystem/command access.
- Safety-first default: if a command is potentially destructive, stop and require explicit user approval.

### 10.1 Hard Denylist
- Never run destructive filesystem commands by default:
- `rm -rf`
- `del /f /s /q`
- `rmdir /s /q`
- `Remove-Item -Recurse -Force`
- Never run disk/system-destructive commands:
- `mkfs*`
- `format`
- `diskpart`
- `dd`
- `bcdedit`
- mass registry edits
- Never run destructive git history/data wipe commands by default:
- `git reset --hard`
- `git clean -fdx`
- forced history rewrite pushes.

### 10.2 Workspace Boundary
- Only read/write inside repository root unless the user explicitly approves a one-off command outside it.
- Never modify OS-level configuration, startup items, shell profiles, or global toolchain state unless explicitly requested and approved.

### 10.3 Two-Step Confirmation for Risky Actions
- For risky operations (history rewrite, mass delete, data wipe, uninstall, infra teardown):
- show the exact command and impacted paths first;
- wait for explicit user confirmation phrase: `APPROVE RISKY COMMAND`;
- execute only that approved command.

### 10.4 Delete and Overwrite Safety
- No recursive delete and no wildcard delete without explicit approval.
- Before any delete/overwrite, list exact target files/paths.
- Prefer reversible actions first (rename, backup, stash, or move to trash where available).

### 10.5 Git Safety Defaults
- Prefer additive commits and non-destructive merges.
- Never rewrite published history unless explicitly requested.
- Always show current branch and `git status --short` before and after risky git operations.

### 10.6 Execution Controls
- Prefer non-interactive commands with explicit flags.
- Use bounded timeouts for long-running commands.
- If an unexpected prompt/conflict appears, stop and ask before proceeding.

### 10.7 Secret and Credential Protection
- Never print secret files or full credential values in logs/output.
- Redact tokens, passwords, and keys in any surfaced command output.
- Never post secrets to PRs, issues, comments, or commit messages.

### 10.8 Safety Checkpoint
- Before large or high-impact changes, create a reversible checkpoint (for example stash or safety branch) and report it.

### 10.9 Network and Install Constraints
- Do not run remote script pipes (for example `curl ... | sh`) without explicit approval.
- Do not perform global installs or system package-manager changes unless explicitly requested and approved.

### 10.10 Incident Rule
- If unexpected filesystem changes or suspicious command effects are detected, stop immediately and ask the user how to proceed.
