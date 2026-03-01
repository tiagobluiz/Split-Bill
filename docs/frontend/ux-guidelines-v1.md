# Split-Bill UX Guidelines v1

Status: Authoritative
Owner: Frontend scope (`apps/frontend/**`)
Last updated: 2026-02-28

## 1) Purpose and Non-Negotiables
This document is the single source of truth for frontend UX implementation in Split-Bill.

Non-negotiable rules:
- Any frontend change must conform to this document.
- When this document conflicts with personal/team preference, this document wins.
- Render prompts in `/docs/frontend/ux-render-prompts-v1.md` are mandatory visual references.
- PRs that fail the UX checklist are not mergeable.

Scope:
- Applies to all production UI under `apps/frontend/**`.
- Applies to new screens, updates, and refactors that change behavior or visuals.

Out of scope:
- Backend implementation details.
- Contract payload design (already handled by contracts docs).

## 2) Product UX Direction
Baseline direction:
- Brand feel: playful buddy helper.
- Information architecture: progressive disclosure.
- Accessibility: WCAG 2.2 AA strict.
- UI foundation: MUI components.
- Form stack: React Hook Form + Zod.

Principles translated into behavior:
1. The app does the heavy lifting for the user.
- Core actions should feel assisted, not procedural.
- Copy should guide users in plain language and confirm what the app did for them.
- Complex split logic must be explained in simple output text.

2. Auth-first access for event usage.
- The no-login landing page must prioritize authentication.
- Sign-in is the primary action for returning users.
- Create account stays visible as secondary action for new users.
- Unauthenticated users can view landing content only; event data requires login.

3. Predictability over novelty.
- Reuse layout zones and interaction patterns across pages.
- Avoid one-off controls when a documented component pattern exists.

4. Friendly by default, clear under pressure.
- Friendly tone is allowed across most surfaces.
- Errors, destructive confirms, and validation feedback stay direct/actionable.

## 3) Layout System
### 3.1 App Shell (Authenticated)
Desktop (`>= 1200px`):
- Left sidebar: fixed, width `272px`, full height.
- Top context bar: fixed within content column, height `64px`.
- Content area: max width `1280px`, horizontal padding `32px`, vertical padding `24px`.

Tablet (`900px-1199px`):
- Sidebar collapses to icon rail `80px`.
- Top bar remains `64px` height.
- Content padding `24px`.

Mobile (`< 900px`):
- Sidebar becomes bottom navigation with 4-5 primary destinations.
- Top bar height `56px`.
- Content padding `16px`.

### 3.2 Mandatory Page Zones (order is fixed)
Every screen must implement these zones in order:
1. `PageTitle`
2. `PrimaryActions`
3. `Filters`
4. `PrimaryContent`
5. `SecondaryContent`
6. `FeedbackStates`

Rules:
- Do not move `PrimaryActions` below `PrimaryContent`.
- `Filters` must be collapsible on mobile if there are more than 3 controls.
- `FeedbackStates` can visually appear inline, but must be present in DOM order.

### 3.3 Spacing and Grid
- Base unit: `4px`.
- Layout grid: 12 columns desktop, 8 tablet, 4 mobile.
- Section gap: `24px` desktop, `20px` tablet, `16px` mobile.
- Card internal padding: `20px` desktop/tablet, `16px` mobile.

### 3.4 No-Login Funnel Contract (Mandatory)
Above the fold on landing:
- Primary CTA: `Sign in`
- Secondary CTA: `Create account`
- Supporting link allowed: `New here? Create account` or `Already have an account? Sign in`

Required support copy:
- Hero support line: `Sign in to see your events and history.`

Rules:
- Unauthenticated users can access landing content only.
- Event lists, event details, balances, and analytics require authentication.
- Route guards must redirect unauthenticated users to sign-in for protected routes.

## 4) Visual System Contract
### 4.1 Token Table
#### Spacing

| Token | Value |
|---|---|
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-5` | `20px` |
| `space-6` | `24px` |
| `space-8` | `32px` |
| `space-10` | `40px` |


#### Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | `8px` | Inputs, chips |
| `radius-md` | `12px` | Cards (default) |
| `radius-lg` | `16px` | Modals, feature panels |
| `radius-pill` | `999px` | pills/tags |


#### Elevation

| Token | Value |
|---|---|
| `elevation-0` | `none` |
| `elevation-1` | `0 1px 2px rgba(20,18,30,0.06)` |
| `elevation-2` | `0 4px 12px rgba(20,18,30,0.10)` |
| `elevation-3` | `0 10px 24px rgba(20,18,30,0.14)` |


#### Borders

| Token | Value |
|---|---|
| `border-subtle` | `1px solid #F3E4DA` |
| `border-default` | `1px solid #E7D7CC` |
| `border-strong` | `1px solid #D5BFAA` |


### 4.2 Color Contract (Warm Multi-Accent)
Warm base:
- `surface-page`: `#FFF9F4`
- `surface-card`: `#FFFFFF`
- `surface-subtle`: `#FFF1E7`
- `text-primary`: `#1F2937`
- `text-secondary`: `#475467`
- `text-muted`: `#667085`
- `icon-default`: `#344054`

Multi-accent:
- `accent-primary-500`: `#FF6B4A` (main CTA)
- `accent-primary-600`: `#E85A3B`
- `accent-secondary-500`: `#2BB8A5` (active states/support)
- `accent-secondary-600`: `#229987`
- `accent-tertiary-500`: `#F6B73C` (highlight chips/helper callouts)

Semantic status (high contrast, accessibility-first):
- `success`: `#1F9D55`
- `warning`: `#D97706`
- `error`: `#DC2626`
- `info`: `#2563EB`

Usage rules:
- Primary accent is used for main call-to-action actions.
- Secondary accent is used for selected states and progress/support indicators.
- Tertiary accent is reserved for helper emphasis and low-risk highlights.
- Never use color alone to communicate state; include text and icon.

### 4.3 Typography
Family:
- Primary: `Public Sans`
- Fallback: `"Segoe UI", "Helvetica Neue", Arial, sans-serif`

Scale:

| Style | Size | Weight | Line Height |
|---|---|---|---|
| `display-md` | `36px` | `700` | `44px` |
| `h1` | `30px` | `700` | `38px` |
| `h2` | `24px` | `700` | `32px` |
| `h3` | `20px` | `600` | `28px` |
| `body-lg` | `18px` | `400` | `28px` |
| `body-md` | `16px` | `400` | `24px` |
| `body-sm` | `14px` | `400` | `20px` |
| `label-sm` | `12px` | `600` | `16px` |


Typography rules:
- Never use font size under `12px`.
- Never use pure black (`#000000`) for body text.
- Avoid text blocks wider than 75 characters for readability.

## 5) Component Rules (MUI + RHF + Zod)
### 5.1 Buttons
Variants:
- Primary (`contained`): primary accent background.
- Secondary (`outlined`): warm border with primary text.
- Tertiary (`text`): low emphasis actions.
- Destructive (`outlined` with error color): delete/cancel destructive actions.

Rules:
- One primary button per action cluster.
- Primary button placed rightmost on desktop, full-width bottom on mobile forms.
- Button min height `44px`; icon-only button min target `44x44px`.

### 5.2 Forms
Required structure per field:
1. Label
2. Optional helper text
3. Control
4. Validation message area (reserved even when empty)

Validation behavior:
- Trigger on blur.
- Re-check on submit.
- Summary banner appears on submit failure with anchor links to invalid fields.

Error text style:
- Plain, actionable, max 120 chars.
- Example: `We could not save this yet. Check the amount and try again.`

### 5.3 Tables
- Header sticky on vertical scroll.
- Numeric columns right-aligned.
- Money uses tabular numerals.
- Default row height `52px` desktop, `48px` mobile compact table.
- Include row hover state and keyboard focus state.

### 5.4 Charts
- Default mode is chart-first with drilldown table below chart.
- Always show legend + axis labels + date range context.
- Always provide accessible textual summary near chart.
- Tooltips must show raw value + currency + date.

### 5.5 Modals
- Max width `560px` standard; `720px` for complex forms.
- Title, supporting text, body, footer actions in this order.
- Destructive action always requires simple confirm modal with explicit consequence text.

### 5.6 Toasts and Inline Alerts
- Use toast for transient success only.
- Use inline alert for blocking errors or form-level failures.
- Toast duration: 4 seconds success, 6 seconds warning/info.

### 5.7 Contextual Helper Pattern (Mandatory)
- Helper element is contextual, not persistent.
- Allowed contexts:
  - setup/onboarding
  - empty states
  - error recovery
  - complex split explanation
- Helper message must be short, specific, and optional to dismiss.

### 5.8 Loading, Empty, Error States
Every data module must define:
- Loading skeleton
- Empty state
- Error state
- Success populated state

Empty state template:
- Title: what is missing
- Body: why it matters
- Primary CTA: next step
- Secondary CTA: optional docs/help
- Optional contextual helper tip

## 6) Domain-Specific UX Rules
### 6.1 Money and Currency
- Always display amount with currency code when ambiguity exists.
- Event base currency is shown in totals headers.
- Use 2-decimal formatting in UI unless backend returns fixed display precision override.
- Use minus sign for negative values; do not use parentheses.
- Default example locale for documentation and mocks is Central Europe:
  - Currency examples use EUR.
  - Number style uses European separators (for example: `€1.250,40`).
  - Date examples use day-first format (`dd/mm/yyyy`).
  - Timezone examples use `Europe/Paris` (CET/CEST).

Examples:
- `€1.250,40`
- `-€42,10`

### 6.2 Friendly Balance Label Contract
Use this mapping in user-facing cards, summaries, and prominent status labels:

| Legacy intent | Required label |
|---|---|
| Debt status | `You'll send` |
| Credit status | `You'll get back` |
| Fully resolved status | `All square` |

Rules:
- Friendly labels are mandatory in high-visibility surfaces.
- Technical wording is allowed only in low-visibility technical contexts (exports, audit views, debug tools).

### 6.3 Entry Split Modes
Modes:
- Even
- Percent
- Amount

Rules:
- Default to `Even` for new entries.
- Switching mode preserves typed data in hidden cache for return-to-mode.
- Validation examples:
  - Percent total must equal 100.
  - Amount total must equal entry total.

### 6.4 Invite and Join Flow
- Friendly microcopy is encouraged.
- Security language remains explicit (token expiration, revoke behavior).
- Join-as-person step must preview selected person before confirmation.

### 6.5 Analytics Interpretation Guardrails
- Show date range and timezone in header at all times.
- If filters applied, show filter chips above chart.
- If chart has fewer than 3 points, show helper note: `Trend view is limited for short ranges.`

## 7) Accessibility Requirements (WCAG 2.2 AA)
### 7.1 Contrast
- Text contrast minimum: `4.5:1`.
- Large text (`>= 24px` regular or `>= 18.66px` bold): `3:1`.
- Interactive control boundaries must remain visible in high contrast mode.

### 7.2 Keyboard Navigation
- All interactive controls reachable via keyboard.
- Visible focus indicator at least `2px` outline with contrast >= `3:1`.
- No keyboard trap in modals/drawers.
- Escape closes modal and returns focus to invoker.

### 7.3 Labels and Announcements
- Every input has explicit label.
- Errors announced via `aria-live="polite"`.
- Form-level blocking errors announced via `aria-live="assertive"`.
- Icon-only buttons must include accessible name.

### 7.4 Charts and Data Accessibility
- Provide textual summary below chart:
  - trend direction
  - min/max values
  - period covered
- Data table alternative must be keyboard accessible.

### 7.5 No-Merge Policy
If any mandatory accessibility item fails, PR is blocked until fixed.

## 8) Copywriting Rules
Primary style: supportive + simple + direct.

Required defaults:
- Landing primary CTA: `Sign in`
- Landing secondary CTA: `Create account`
- Landing support line: `Sign in to see your events and history.`

Approved patterns:
- `I can split that for you.`
- `Done. Your split is ready.`
- `Let me help you fix this field.`

Not allowed:
- Vague errors (`Something went wrong`).
- Overly formal finance-heavy jargon in primary UI (for example: `debtor`, `creditor`, `liability position`).
- Joke-heavy copy that weakens clarity in key actions.

Rewrite examples:
- Bad: `Processing debt allocations...`
- Good: `I split this for you. Check if each share looks right.`

- Bad: `Unable to commit transaction.`
- Good: `We could not save this split yet. Try again.`

Button text rules:
- Use verb + object where possible (`Create event`, `Add expense`, `Save changes`).
- Avoid ambiguous labels (`Continue`, `Done`) unless context makes meaning explicit.

## 9) Hard PR Gate Checklist (UX)
Every frontend PR must include this checklist and all checked items must be true.

1. Layout and structure
- [ ] Screen uses mandatory page zones in documented order.
- [ ] Responsive behavior meets desktop/tablet/mobile rules.
- [ ] No-login landing follows auth-first CTA hierarchy (`Sign in` primary, `Create account` secondary).
- [ ] Protected routes are guarded and redirect unauthenticated users to sign-in.

2. Visual system
- [ ] Uses documented spacing/radius/elevation/border/color tokens.
- [ ] Warm multi-accent usage follows token contract and accessibility rules.

3. Components and forms
- [ ] Buttons follow hierarchy and placement rules.
- [ ] Forms use RHF + Zod and validate on blur + submit.
- [ ] Error text is actionable and specific.

4. Domain behavior
- [ ] Money/currency display follows formatting contract.
- [ ] Friendly balance labels are used in user-facing summary surfaces.
- [ ] Split mode interactions follow documented behavior.

5. Accessibility
- [ ] Keyboard flow verified.
- [ ] Labels and aria announcements verified.
- [ ] Contrast verified for new/updated components.
- [ ] Chart/table accessible alternatives provided.

6. Render alignment
- [ ] Author reviewed relevant render prompts in `/docs/frontend/ux-render-prompts-v1.md`.
- [ ] Implementation aligns with generated renders or deviations are justified in PR.

7. Evidence
- [ ] Added screenshots for desktop and mobile.
- [ ] Added test evidence for impacted UI behavior.

## 10) Required Screenshot Set Per PR
For each changed screen, attach:
- Desktop full viewport state.
- Mobile viewport state.
- One interactive state (error, loading, or empty).

For form changes, also attach:
- Validation error state.
- Successful submission state confirmation.

## 11) Validation Scenarios
Use these scenarios as release criteria for UX-sensitive FE tickets.

Scenario A: Form-heavy change
- Validate blur + submit timing.
- Validate inline + summary errors.
- Validate keyboard-only completion flow.

Scenario B: Analytics-heavy change
- Validate chart-first layout.
- Validate drilldown table accuracy.
- Validate filter chip visibility and timezone label.

Scenario C: Split mode change
- Validate mode switching preserves inputs.
- Validate percent/amount totals constraints.
- Validate friendly balance status semantics.

Scenario D: Landing funnel change
- Validate auth-first CTA prominence (`Sign in` primary).
- Validate account creation remains visible but secondary.
- Validate protected routes redirect to sign-in when user is unauthenticated.

## 12) Implementation Compliance Notes
- Deviation from this guideline requires explicit PR note with justification and follow-up issue.
- "Personal preference" is not valid justification.
- If a rule blocks delivery, escalate with a concrete alternative and impact analysis.

## 13) Render Catalog (Prompt Mapping)
Use this catalog to find the render file for each prompt quickly.

Primary current renders:

| Prompt | Screen | Render File |
|---|---|---|
| Prompt 01 | Landing / Welcome | [prompt-01-landing-welcome.png](./renders/prompt-01-landing-welcome.png) |
| Prompt 02 | Sign In | [prompt-02-sign-in.png](./renders/prompt-02-sign-in.png) |
| Prompt 03 | Register + Verify Email | [prompt-03-register-verify-email.png](./renders/prompt-03-register-verify-email.png) |
| Prompt 04 | Event List Dashboard | [prompt-04-event-list-dashboard.png](./renders/prompt-04-event-list-dashboard.png) |
| Prompt 05 | Create Event | [prompt-05-create-event.png](./renders/prompt-05-create-event.png) |
| Prompt 06 | Event Detail (People + Categories) | [prompt-06-event-detail-people-categories.png](./renders/prompt-06-event-detail-people-categories.png) |
| Prompt 07 | Add/Edit Entry (Expense/Income + Split Modes) | [prompt-07-add-edit-entry-split-modes.png](./renders/prompt-07-add-edit-entry-split-modes.png) |
| Prompt 08 | Receipt Upload State | [prompt-08-receipt-upload-state.png](./renders/prompt-08-receipt-upload-state.png) |
| Prompt 09 | Balances + Settlement Selector | [prompt-09-balances-settlement-selector.png](./renders/prompt-09-balances-settlement-selector.png) |
| Prompt 10 | Analytics Daily Spend | [prompt-10-analytics-daily-spend.png](./renders/prompt-10-analytics-daily-spend.png) |
| Prompt 11 | Analytics Category Spend | [prompt-11-analytics-category-spend.png](./renders/prompt-11-analytics-category-spend.png) |
| Prompt 12 | Invite + Join-as-Person Mapping | [prompt-12-invite-join-as-person-mapping.png](./renders/prompt-12-invite-join-as-person-mapping.png) |
