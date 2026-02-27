# Split-Bill v1 Delivery Plan (Complete Replacement: Data Model + Flat GitHub Issues + Test Matrix + Documentation)

## Summary
Deliver a modern bill-splitting web app with:
- Guest stateless one-off split (no persistence).
- Registered users with dashboard and persistent events.
- Event collaboration via signed invite links and "Join as Person".
- Expense/Income entries with even and uneven splits.
- Event balances and settlement with per-event selectable algorithm (default `MIN_TRANSFER`, extensible).
- Analytics for daily spend and category spend with filters.
- Mandatory BE+FE test coverage and required BE controller integration tests.
- Generated documentation, ADR/BDR decision docs, and GitHub Wiki with screenshots.

## Confirmed Decisions
- Stack: Kotlin + Spring Boot (BE), React + TypeScript + Vite + Tailwind + MUI + React Hook Form + Zod (FE), PostgreSQL, Docker deployment.
- Money: decimal fixed-scale representation.
- Currency: event base currency; entry currency allowed; conversion uses entry-date FX snapshot.
- Recompute: immediate on entry create/update/delete.
- Guest mode: strict one-off only.
- Auth: email/password; verification required before create/join event.
- Collaboration: owner invites via signed token; joiner maps account to existing event person.
- Permissions: full edit for all collaborators in v1.
- Time: timestamps stored UTC; analytics day buckets in fixed event timezone.
- Uploads: object storage with signed URLs.
- Rounding: largest remainder.
- Categories: system defaults + custom per event.
- Planning depth: full feature set now.
- Issue tracking format: flat GitHub issues only.

## Public APIs / Interfaces
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me/preferences`
- `GET /events`
- `POST /events`
- `GET /events/{eventId}`
- `PATCH /events/{eventId}`
- `DELETE /events/{eventId}`
- `POST /events/{eventId}/people`
- `PATCH /events/{eventId}/people/{personId}`
- `POST /events/{eventId}/entries`
- `PATCH /events/{eventId}/entries/{entryId}`
- `DELETE /events/{eventId}/entries/{entryId}`
- `POST /events/{eventId}/invites`
- `POST /invites/{token}/join`
- `GET /events/{eventId}/balances?algorithm=MIN_TRANSFER|PAIRWISE`
- `GET /events/{eventId}/analytics/daily-spend`
- `GET /events/{eventId}/analytics/category-spend`
- `POST /uploads/presign`
- `POST /guest/split/calculate`

Key DTOs:
- `MoneyDto { amount: string, currency: string }`
- `EntryDto { id, eventId, type, name, categoryId|categoryName, amount, currency, eventAmount, payerPersonId, participantSplits[], occurredAtUtc, receiptUrls[] }`
- `ParticipantSplitDto { personId, mode: EVEN|PERCENT|AMOUNT, percent?, amount? }`
- `BalanceDto { personId, netAmountInEventCurrency, owes[], owedBy[] }`
- `AnalyticsDailyPointDto { date, total, byPerson[] }`
- `AnalyticsCategoryPointDto { category, total, dateRange }`

## Authoritative Data Model

### `accounts`
- Purpose: registered user identity and preferences.
- Fields: `id (UUID PK)`, `email (unique)`, `password_hash`, `name`, `preferred_currency`, `email_verified_at (nullable)`, `created_at`, `updated_at`.
- Constraints: unique email; verified required by policy for create/join event endpoints.

### `events`
- Purpose: top-level collaboration and accounting scope.
- Fields: `id`, `owner_account_id (FK accounts)`, `name`, `base_currency`, `timezone`, `default_settlement_algorithm`, `created_at`, `updated_at`, `archived_at (nullable)`.
- Constraints: owner required; timezone required; algorithm enum extensible.

### `event_collaborators`
- Purpose: account membership in an event.
- Fields: `id`, `event_id (FK events)`, `account_id (FK accounts)`, `role`, `joined_at`.
- Constraints: unique `(event_id, account_id)`; role currently full-edit for all collaborators.

### `event_people`
- Purpose: logical persons used in splits/balances (can map to accounts).
- Fields: `id`, `event_id (FK events)`, `display_name`, `linked_account_id (nullable FK accounts)`, `created_by_account_id`, `created_at`, `updated_at`.
- Constraints: person belongs to one event; mapping to account optional; one account may map to one person per event.

### `event_categories`
- Purpose: analytics grouping categories.
- Fields: `id`, `event_id (nullable for global defaults)`, `name`, `is_default`, `created_at`.
- Constraints: unique name within `(event_id)` scope; defaults immutable policy optional.

### `invite_tokens`
- Purpose: secure event sharing and onboarding.
- Fields: `id`, `event_id (FK events)`, `token_hash`, `created_by_account_id`, `expires_at (nullable)`, `revoked_at (nullable)`, `created_at`.
- Constraints: token validity = not revoked and not expired.

### `entries`
- Purpose: ledger record for Expense/Income.
- Fields: `id`, `event_id (FK events)`, `type (EXPENSE|INCOME)`, `name`, `category_id (FK event_categories)`, `amount`, `currency`, `event_amount`, `payer_person_id (FK event_people)`, `occurred_at_utc`, `fx_rate_snapshot`, `fx_source`, `note (nullable)`, `created_by_account_id`, `created_at`, `updated_at`, `deleted_at (nullable)`.
- Constraints: payer must belong to event; `event_amount` deterministic from amount+rate.

### `entry_participants`
- Purpose: selected participants and split details for each entry.
- Fields: `id`, `entry_id (FK entries)`, `person_id (FK event_people)`, `split_mode`, `split_percent (nullable)`, `split_amount (nullable)`, `resolved_event_amount`, `created_at`.
- Constraints: unique `(entry_id, person_id)`; total resolved equals entry event amount; largest-remainder policy for residual minor units.

### `entry_receipts`
- Purpose: uploaded image metadata.
- Fields: `id`, `entry_id (FK entries)`, `storage_key`, `file_name`, `mime_type`, `size_bytes`, `checksum`, `uploaded_at`.
- Constraints: whitelist mime types and max size; object storage key immutable post-upload.

### `fx_rates`
- Purpose: cached provider rates used for snapshots.
- Fields: `id`, `provider`, `base_currency`, `quote_currency`, `rate`, `rate_date`, `fetched_at`.
- Constraints: unique `(provider, base_currency, quote_currency, rate_date)`.

### `balance_snapshots` (optional optimization, not source of truth)
- Purpose: fast reads if needed at scale.
- Fields: `id`, `event_id`, `person_id`, `net_amount`, `computed_at`.
- Constraints: may be rebuilt from entries.

### `audit_log` (recommended)
- Purpose: traceability for financial mutations.
- Fields: `id`, `actor_account_id`, `event_id`, `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, `created_at`.
- Constraints: append-only.

## Parallelization and Merge-Conflict Strategy
- Contract-first: OpenAPI frozen before feature code.
- Generated client: FE consumes generated TS client only; no manual edits in generated files.
- Area ownership: `backend`, `frontend`, `contracts`, `infra`, `docs`, `tests`.
- Flat issues with strict single-scope PRs.
- Daily API sync window; breaking changes only during sync.
- ADR required for cross-cutting changes (auth, money, settlement, analytics).

## Phased Delivery
1. Foundations and contracts.
2. Core domain and CRUD.
3. Auth and collaboration.
4. Currency, uploads, analytics.
5. Hardening, docs completion, release readiness.

## Mandatory Testing Plan

### BE tests
- Unit: split engine, rounding, income/expense semantics, FX conversion, settlement strategies, permission checks.
- Integration (required): controllers tested end-to-end via HTTP + service + repository + Postgres Testcontainers.
- Integration coverage includes success, validation errors, auth errors, permission errors, invite token invalid cases.

### FE tests
- Component tests for all shared/form/chart components.
- Route/integration tests for all pages and key user flows.
- E2E tests for full journeys.

### Test Matrix (must be covered)
- Entry type: Expense, Income.
- Split mode: Even, Uneven Percent, Uneven Amount.
- Participant scope: single, subset, all.
- Currency: same as base, foreign with FX.
- Rounding: exact, fractional residual.
- Mutation: create, update, delete entry.
- Auth state: guest, registered verified, registered unverified blocked.
- Collaboration: owner, collaborator, join-as-person mapping.
- Invite token: valid, expired, revoked.
- Analytics window: single day, range, full event.
- Analytics person filter: individual, subset, all.
- Category: default and custom.

CI gates:
- BE unit + controller integration mandatory.
- FE unit/integration + E2E mandatory.
- Coverage threshold enforced for BE and FE.
- No merge on red checks.

## Documentation Plan (Tracked Work)
- Generated API docs from OpenAPI on main branch.
- ADRs in repo with numbering and status.
- BDRs in repo documenting product rules.
- Developer docs: setup, local run, testing strategy, deployment runbook.
- GitHub Wiki user guide with screenshots:
1. App overview and concepts.
2. Guest one-off split.
3. Register/login/verify.
4. Create event/add people.
5. Add entries and split modes.
6. Balances and settlements.
7. Analytics filters and interpretation.
8. Invite/join-as-person collaboration.
- Screenshot generation approach: seeded demo dataset + scripted capture checklist.

## Flat GitHub Issues Backlog (Plan Output)

| ID | Title | Scope | Depends On | Labels | Milestone |
|---|---|---|---|---|---|
| SB-001 | Monorepo bootstrap and coding standards | Repo layout, scripts, lint/format/test commands | none | infra | M1 |
| SB-002 | CI baseline with required quality gates | Build/test workflows, branch protection, coverage gates | SB-001 | infra, tests | M1 |
| SB-003 | OpenAPI v1 contract freeze | All endpoint schemas, errors, enums, pagination/filter conventions | SB-001 | contracts | M1 |
| SB-004 | Generated TypeScript API client workflow | Client generation/publish and consumer integration | SB-003 | contracts, frontend | M1 |
| SB-005 | PostgreSQL schema migrations v1 | Create authoritative tables and constraints from data model | SB-003 | backend, db | M1 |
| SB-006 | Auth backend and verification policy enforcement | Register/login/refresh/logout/verify and gate create/join | SB-005 | backend, security | M2 |
| SB-007 | Profile and preferences endpoints | Name/email/preferred currency management | SB-006 | backend | M2 |
| SB-008 | Event, people, collaborators backend CRUD | Event lifecycle, person management, memberships | SB-005 | backend | M2 |
| SB-009 | Split engine domain implementation | Even/percent/amount, rounding, validation | SB-005 | backend, domain | M2 |
| SB-010 | Entry backend CRUD + immediate recomputation | Expense/income persistence and balance recompute | SB-008, SB-009 | backend, domain | M2 |
| SB-011 | Settlement strategy abstraction | Default `MIN_TRANSFER` + pluggable strategy interface | SB-010 | backend, domain | M2 |
| SB-012 | Invite token and join-as-person backend | Signed token create/revoke/expire, mapping flow | SB-008, SB-006 | backend, security | M3 |
| SB-013 | FX snapshot subsystem | Provider adapter, rate caching, entry-date snapshot binding | SB-010 | backend, domain | M3 |
| SB-014 | Receipt upload backend | Presigned uploads, metadata persistence, validation limits | SB-010 | backend | M3 |
| SB-015 | Analytics backend | Daily/category aggregations + person/date filters | SB-010, SB-013 | backend, analytics | M3 |
| SB-016 | Frontend app shell and route guards | Base layout, auth-aware navigation, protected routes | SB-004 | frontend | M2 |
| SB-017 | Frontend auth and dashboard | Sign up/login/verify, list owned/joined events | SB-016, SB-006 | frontend | M2 |
| SB-018 | Frontend event and people management | Event creation/settings, people and category management | SB-016, SB-008 | frontend | M2 |
| SB-019 | Frontend entry form and split UI | Expense/income forms, split modes, upload UI | SB-018, SB-010, SB-014 | frontend | M3 |
| SB-020 | Frontend balances and settlement UI | Net balances, owes/owed views, algorithm selection | SB-019, SB-011 | frontend | M3 |
| SB-021 | Frontend collaboration join flow | Invite creation/use, join-as-person mapping | SB-017, SB-012 | frontend | M3 |
| SB-022 | Frontend analytics pages | Daily/category charts, filters, timezone display behavior | SB-020, SB-015 | frontend, analytics | M3 |
| SB-023 | Guest one-off split feature | Stateless calculator and dedicated endpoint integration | SB-016, SB-009 | frontend, backend | M2 |
| SB-024 | BE unit test suite from matrix | Domain/service/unit tests across all matrix axes | SB-009, SB-013 | backend, tests | M3 |
| SB-025 | BE controller integration tests (required) | End-to-end controller tests for every endpoint and error path | SB-006, SB-015 | backend, tests | M3 |
| SB-026 | FE component and integration tests | All FE components/routes and matrix-driven UI behavior | SB-017, SB-022 | frontend, tests | M3 |
| SB-027 | FE end-to-end journey tests | Guest/auth/event/collab/analytics critical flows | SB-021, SB-022, SB-023 | frontend, tests | M4 |
| SB-028 | Generated documentation pipeline | Publish API docs, coverage reports, test reports | SB-002, SB-003 | docs, infra | M2 |
| SB-029 | ADR and BDR baseline docs | Templates + initial records for architecture/business decisions | SB-003 | docs | M1 |
| SB-030 | GitHub Wiki user guide with screenshots | End-user walkthrough content and screenshots | SB-022, SB-027 | docs, frontend | M4 |
| SB-031 | Security hardening and abuse controls | Rate limits, token hardening, upload safety, audit log | SB-012, SB-014 | backend, security | M4 |
| SB-032 | Release readiness and production runbook | Staging validation, rollback, operational checklist | SB-025, SB-027, SB-030, SB-031 | release, infra, docs | M4 |

## Definition of Done (All Issues)
- Implementation merged.
- Required tests added/updated and passing in CI.
- Relevant docs updated (ADR/BDR/API/wiki/developer docs).
- PR links issue and includes validation evidence.
- No unresolved critical defects in changed scope.

## Assumptions and Defaults
- Decimal precision and rounding behavior are consistent between BE calculations and FE rendering.
- Invite tokens are revocable and may expire.
- Collaborator roles remain full-edit in v1; finer roles are post-v1.
- Soft-delete is preferred for financial records requiring auditability.
- Flat issue model is maintained via labels, milestones, and dependencies in descriptions.
