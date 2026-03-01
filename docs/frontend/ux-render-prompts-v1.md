# Split-Bill UX Render Prompts v1

Status: Mandatory visual reference for frontend implementation.
Usage rule: Generate the relevant screen render before implementing or modifying a screen. Keep generated outputs attached to PR evidence.

## Shared Prompt Preface (reference)
Use this exact preface in every prompt:

```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.
```

## Shared Prompt Epilogue (reference)
Use this exact epilogue in every prompt:

```text
Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 01 - Landing / Welcome
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create a public landing page (no sidebar, no authenticated top bar).
Structure top to bottom:
1) Header with logo "Split-Bill", links "Features", "How it works", "Security", and text link "Sign in".
2) Hero section:
- Title: "Split-Bill keeps your shared expenses organized."
- Subtitle: "Sign in to access your events, entries, balances, and history in one friendly workspace."
- Primary CTA (dominant): "Sign in"
- Secondary CTA: "Create account"
- Supporting link text: "New here? Create account"
- Supporting line: "Sign in to see your events and history."
- Contextual helper bubble: "Welcome back. Your events are waiting for you."
3) Feature cards:
- "Track event expenses" with text about adding multiple entries over time.
- "See fair balances" with text about transparent per-person outcomes.
- "Invite collaborators" with text about shared editing in the same event.
4) Proof strip:
- "Used for trips, shared homes, and group dinners across Europe."
5) Footer with links: "Privacy", "Terms", "Contact".
Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 02 - Sign In
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create a sign-in screen centered on page with two-column desktop layout:
- Left column: brand and trust copy.
- Right column: sign-in card.
Sign-in card content:
- Title: "Sign in"
- Subtitle: "Access your events and split history."
- Email field label: "Email"
- Placeholder: "name@example.com"
- Password field label: "Password"
- Placeholder: "Enter your password"
- Link: "Forgot password?"
- Checkbox: "Keep me signed in"
- Primary button: "Sign in"
- Secondary text: "New to Split-Bill? Create an account"
Include error example below email field:
- "Enter a valid email address"
Include inline warning alert example at top of form:
- "Email not verified. Verify your email before joining events."

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 03 - Register + Verify Email
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create a two-step registration + verify-email screen shown in a single render as stepper card.
Stepper items:
1) "Account details"
2) "Verify email"
Step 1 fields:
- Full name
- Email
- Password
- Confirm password
- Checkbox: "I agree to Terms and Privacy"
- Primary button: "Create account"
Validation examples:
- "Password must have at least 8 characters"
- "Passwords do not match"
Step 2 confirmation panel:
- Title: "Verify your email"
- Body: "We sent a verification link to name@example.com"
- Buttons: "Resend email" and "I verified my email"
- Helper: "You must verify your email before creating or joining events."

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 04 - Event List Dashboard
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create authenticated dashboard screen with:
- Left sidebar items: "Dashboard", "Events", "Balances", "Analytics", "Settings".
- Top context bar: selected workspace "Personal", timezone "CET (Europe/Paris)", profile avatar.
Page zones:
1) Title: "Your events"
2) Primary action button: "Create event"
3) Filters row: search field "Search events", status filter (All/Active/Archived), currency filter.
4) Primary content: event cards grid (at least 4 cards) showing:
- Event name
- Participant count
- Last updated date
- Net status badge ("You'll get back" / "You'll send" / "All square")
- Quick action "Open"
5) Secondary content right panel: "Recent activity" list with 5 rows.
Include empty state variant card at bottom:
- Title: "No archived events"
- Body: "Archived events appear here once you archive an event."
- CTA: "View active events"

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 05 - Create Event
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create "Create event" form screen using strict field structure (label, helper, input, error area).
Fields:
- Event name (placeholder: "Summer Trip 2026")
- Base currency (dropdown default "EUR")
- Timezone (dropdown default "Europe/Paris")
- Default settlement algorithm (radio): "Min transfer" (default) and "Pairwise"
- Optional description (textarea)
Participants quick-add section:
- Input "Add person" + add button
- Added chips list with remove icons
Validation examples visible:
- Event name error: "Event name is required"
- Participant duplicate error: "This person is already added"
Footer actions:
- Secondary: "Cancel"
- Primary: "Create event"

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 06 - Event Detail (People + Categories)
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create event detail admin screen for event "Summer Trip 2026".
Page header:
- Title: "Summer Trip 2026"
- Subtitle: "Base currency EUR - Timezone Europe/Paris"
- Actions: "Edit event", "Invite people"
Main content two cards side-by-side on desktop (stacked on mobile):
Card A: "People"
- Table columns: Name, Linked account, Role, Actions
- Rows with realistic data: Ana, Bruno, Carla, Diego
- Row action menu includes "Edit" and "Remove"
- Primary action button: "Add person"
Card B: "Categories"
- Section "Default categories" chips: Food, Transport, Lodging
- Section "Custom categories" list with add/remove
- Input placeholder: "Add category"
- Button: "Add"
Show inline info alert:
- "Changes here affect entry forms and analytics grouping."

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 07 - Add/Edit Entry (Expense/Income + Split Modes)
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create an "Add entry" screen with tabs for "Expense" and "Income".
Header:
- Title: "Add entry"
- Secondary action: "Cancel"
Form card sections:
Section 1: Basic details
- Entry name
- Category dropdown
- Date/time picker
- Amount input + currency dropdown
Section 2: Payer and participants
- Payer dropdown
- Participant multi-select chips
Section 3: Split mode
- Segmented control: Even (default), Percent, Amount
- Dynamic participant table with columns Name and Share
- Even mode example text: "Each participant pays €25,00"
- Percent mode validation error shown: "Percent total must equal 100"
- Amount mode validation error shown: "Split total must equal €100,00"
Section 4: Notes and receipt
- Notes textarea
- Upload control with hint "PNG, JPG, PDF up to 10MB"
Footer actions:
- Secondary button: "Save draft"
- Primary button: "Add entry"

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 08 - Receipt Upload State
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create a focused receipt upload panel screen tied to entry form.
Panel title: "Receipt uploads"
Subtext: "Attach receipts for reference. Files are optional."
Include three states in one cohesive composition:
1) Upload dropzone idle:
- Label "Drop files here or browse"
- Hint "Accepted: PNG, JPG, PDF up to 10MB"
2) Upload in progress row:
- File "receipt-lunch.png"
- Progress bar at 62%
- Status text "Uploading..."
3) Upload error row:
- File "hotel-bill.tiff"
- Error "File type not supported"
- Action "Try again"
4) Upload success row:
- File "taxi-receipt.pdf"
- Status badge "Uploaded"
- Action "Remove"
Bottom actions:
- Secondary "Back to entry"
- Primary "Done"

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 09 - Balances + Settlement Selector
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create balances screen for event "Summer Trip 2026".
Header:
- Title: "Balances"
- Algorithm selector dropdown label: "Settlement algorithm"
- Options shown: "Min transfer" (selected), "Pairwise"
Summary cards (3):
- "You'll get back" value "€120,40"
- "You'll send" value "€42,10"
- "Net" value "€78,30"
Main section left: "Who sends to whom"
- List settlement instructions like:
  - "Bruno pays Ana €22,50"
  - "Diego pays Carla €14,80"
Main section right: person net table columns:
- Person
- Net amount
- Status badge
Use clear labels: "You'll send", "You'll get back", "All square".
Include simple destructive confirm modal preview for "Reset draft settlements" with buttons "Cancel" and "Reset".

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 10 - Analytics Daily Spend
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create analytics page focused on daily spend.
Header:
- Title: "Daily spend"
- Subtitle: "Timezone: Europe/Paris"
Filters row:
- Date range picker showing "01/03/2026 - 10/03/2026"
- Person multi-select chip filter showing "Ana", "Bruno"
- Category filter "All categories"
Primary content:
- Large line chart titled "Daily spend trend"
- Y-axis currency in EUR
- X-axis daily dates
- Tooltip example: "05/03/2026 - €84,30"
- Legend items: "Total", "Ana", "Bruno"
Secondary content:
- Drilldown table titled "Daily totals"
- Columns: Date, Total, Ana, Bruno
- 8 realistic rows
Textual accessibility summary below chart:
- "Spend peaked on 05/03/2026 at €84,30 and was lowest on 02/03/2026 at €19,20."
Include helper note when short range:
- "Trend view is limited for short ranges."

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 11 - Analytics Category Spend
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create analytics page focused on category spend.
Header:
- Title: "Category spend"
- Subtitle: "Date range: 01/03/2026 - 10/03/2026"
Filter row:
- Person filter "All people"
- Category type toggle "Default + Custom"
Primary content:
- Donut chart titled "Spend by category"
- Categories and values:
  - Food €240,00
  - Lodging €180,00
  - Transport €95,00
  - Activities €130,00
- Center value: "€645,00"
- Legend with percentages and colors (high contrast)
Secondary content:
- Table titled "Category breakdown"
- Columns: Category, Total, % of total, Entries count
- Include realistic 6 rows
- Sort indicator active on "Total"
Accessibility summary text below chart:
- "Food is the largest category at 37.2% of total spend."

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```

## Prompt 12 - Invite + Join-as-Person Mapping
```text
Act as a senior product designer creating a production-ready SaaS web app screen for Split-Bill.
Design language is strict and must not drift:
- Playful buddy helper UX: warm, supportive, and lightweight while staying clear and reliable.
- Soft colorful card UI with a warm multi-accent palette and accessible contrast.
- Typography: Public Sans, clear hierarchy, no decorative typography.
- Layout: Left sidebar navigation + top context bar for authenticated screens.
- Accessibility: WCAG 2.2 AA, visible focus states, clear labels, color never as sole signal.
- Data density: progressive disclosure.
- Interaction style: predictable, explicit labels, no vague copy.
- Assistant presence: contextual helper cues only in setup, empty, error, and help contexts.
Visual tokens (must follow exactly):
- Page background #FFF9F4, card background #FFFFFF, subtle surface #FFF1E7.
- Text primary #1F2937, secondary #475467, muted #667085.
- Primary accent coral #FF6B4A for main actions, secondary accent teal #2BB8A5 for active/support states, tertiary accent sun #F6B73C for helper highlights.
- Success #1F9D55, warning #D97706, error #DC2626, info #2563EB.
- Border default #E7D7CC, subtle #F3E4DA.
- Radius: input/chip 8px, cards 12px, modal/panel 16px.
- Shadows: subtle only (0 4px 12px rgba(20,18,30,0.10)).
Spacing and sizing (must follow):
- Base unit 4px.
- Desktop content max width 1280px, padding 32px.
- Top bar height 64px, sidebar width 272px.
- Section gaps 24px, card padding 20px.
Copy style:
- Supportive, simple, and direct.
- Friendly tone is default; errors must stay clear and actionable.
- Never use placeholders like lorem ipsum or generic gibberish.
Output must include realistic UI text, labels, values, helper text, and button captions.

Screen body:
Create combined invite management + join mapping screen.
Left panel "Invite people":
- Input label "Invite by email"
- Placeholder "friend@example.com"
- Role display "Collaborator (full edit)"
- Invite button "Send invite"
- Active invite list table columns: Email, Sent on, Expires, Status, Actions
- Status examples: Active, Revoked, Expired
- Row action: "Revoke"
Right panel "Join as person":
- Title: "Map your account to a person"
- Body: "Choose the person that represents you in this event."
- Radio list options: Ana, Bruno, Carla, Diego
- Selected option preview card with details
- Primary button: "Confirm mapping"
Friendly helper text allowed:
- "Invite links make collaboration easier for everyone."
Security note must be explicit:
- "Invites can expire or be revoked by event owners."

Render requirements:
- Provide one high-fidelity UI render for desktop (1440x1024) and one for mobile (390x844) of the same screen.
- Keep section order, labels, and spacing rhythm deterministic.
- Do not invent extra modules outside the described scope.
- Use contextual helper presence only where explicitly requested by the screen body.
- Ensure all text is legible and final-quality.
- If regenerated, preserve the same structure, labels, and hierarchy unless prompt body changes.
```



