# AGENTS.md

This file defines default operating rules for any agent session in this repository.

## 1) Session Intent
- Build production-ready increments.
- Prefer small, verifiable changes over large risky batches.
- Keep decisions explicit in code, tests, and docs.

## 2) Execution Queue Mode
Queue mode supports two profiles:
- Backend queue profile.
- Frontend queue profile.

Activation convention:
- User explicitly says `Start BE queue` or `Start FE queue`.
- Run continuously until blocked by missing requirements or non-recoverable tooling errors.

Shared cycle (every iteration):
1. PR maintenance first.
2. Issue hygiene.
3. Review comment triage.
4. Pick and execute next issue batch.
5. Run mandatory checks.
6. Publish cycle summary.

### 2.1 Issue Selection Strategy
- Source of truth for scope is issue labels:
- Backend queue picks issues labeled `backend`.
- Frontend queue picks issues labeled `frontend`.
- If an issue has both labels, it is cross-cutting and must be split or blocked behind a `contracts` issue.
- No priority labels are used in this repository. Pick order is:
1. Dependency-ready issues first (parse `Depends On` section in issue body; all dependencies must be closed).
2. Earliest milestone first (`M1` -> `M2` -> `M3` -> `M4` -> no milestone).
3. Oldest issue number first.

### 2.2 PR Maintenance Rules
- Check open PRs in active scope at the start of each cycle.
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
- Before new implementation work, process unanswered review comments in open PRs for the active scope.
- For valid comments:
- implement fix;
- run relevant checks;
- push update.
- Do not post self-review comments.

### 2.5 Backend Queue Profile
- Scope boundary: edit `apps/backend/**` only.
- Allowed shared edits: root docs/config only when strictly required by backend change.
- If API contract changes are needed:
- require/update corresponding `contracts` issue first;
- stop backend-only flow until contract alignment is explicit.
- Batch sizing:
- target up to 5 related issues;
- allow up to 7 only when tightly coupled and low conflict risk.
- Mandatory checks:
- `cd apps/backend`
- `./gradlew test`

### 2.6 Frontend Queue Profile
- Scope boundary: edit `apps/frontend/**` only.
- Allowed shared edits: root docs/config only when strictly required by frontend change.
- If BE/API contract changes are needed:
- require/update corresponding `contracts` issue first;
- pause FE-only flow until contract alignment is explicit.
- FE baseline is mandatory:
- MUI as UI foundation;
- React Hook Form for forms;
- Zod for validation.
- Every delivered FE screen must be production-ready (no POC mode).
- Batch sizing:
- target up to 5 related issues;
- allow up to 7 only when tightly coupled and low conflict risk.
- Mandatory checks:
- `cd apps/frontend`
- `npm run lint`
- `npm run test:run`
- `npm run build`

### 2.7 Testing Depth Requirement (both profiles)
- Every change must include matrix-oriented coverage:
- happy paths;
- edge cases;
- permission/user-state variants;
- validation failures;
- error paths;
- regression checks.
- Backend must include controller-level integration coverage for affected endpoints.

### 2.8 Cycle Output Format
- Issues picked.
- Changes made.
- Tests run with results.
- PR links created/updated.
- Merge actions performed.
- Issue close actions performed.

### 2.9 Governance
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
