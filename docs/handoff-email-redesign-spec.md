# GoldyQuote Intake Handoff Email Redesign

## Purpose
Redesign the intake handoff email for independent insurance agents who need to triage, prioritize, and act on leads in under 30 seconds across desktop and mobile inboxes.

## App-Derived Style Guide (Operational Email)

### Brand Tokens
- Primary brand color: `#7A0019` (GoldyQuote maroon)
- Accent color: `#FFCC33` (GoldyQuote gold)
- Base text: `#111827` (high contrast neutral)
- Supporting text: `#4B5563`
- Border/background neutrals: `#D1D5DB`, `#F3F4F6`, `#F9FAFB`

### Type and Spacing
- Font stack: `Arial, Helvetica, sans-serif` for broad Gmail/Outlook rendering reliability.
- Section title: 13px bold uppercase.
- Data row labels/values: 13px.
- Supporting text: 11-12px.
- Vertical rhythm: 10-14px block padding; 6px row padding.
- Layout width: max 640px centered container.

### UI Behavior in Email Context
- Table-based structure only; no JavaScript.
- No hover/interactive dependence.
- Deterministic field ordering to reduce scanning variance.
- Status chips are text-based with high-contrast backgrounds for quick parsing.

## UX Critique of Previous Plain-Text Dump
- No visual hierarchy: critical triage fields (contact, risk, urgency) compete equally with low-value details.
- No prioritization model: agent cannot decide call order without mentally parsing all values.
- Inconsistent scan path: raw key-value alphabetical dump breaks operational workflow (Who is this? Is this urgent? How do I contact?).
- No “next action” guidance: forces each agent to infer workflow and increases handling time.
- Weak mobile usability: long ungrouped text creates excessive scrolling and cognitive load between calls.
- No deterministic formatting semantics for missing fields; blank values are ambiguous.

## Proposed Information Architecture (Speed-Scan First)

1. **Header**
   - GoldyQuote handoff title
   - Micro-purpose line (“Designed for 30-second agent triage”)
2. **Lead Summary (Above the Fold)**
   - Priority, applicant name, task ID, insurance type, ZIP, requested carriers
3. **Priority Flags / Risk Markers**
   - Explicit chips: Coverage Gap, Driver Incident History, etc.
4. **Action Block**
   - Recommended next step
   - Primary contact channels (call/email)
5. **Quick Triage Snapshot**
   - Highest-value underwriting and contact fields
6. **Detail Sections**
   - Contact, Location, Vehicle, Driver, Coverage, Additional Intake Data
7. **Footer Rule**
   - Deterministic ordering and missing-value policy

## Subject Line and Preheader Spec

### Subject Format
`GoldyQuote Lead <P0|P1|P2> | <Applicant Name> | ZIP <ZIP> | <Task ID>`

### Preheader
`<Priority> lead from <Applicant> in ZIP <ZIP> - <one-line urgency guidance>`

## Priority Logic and Risk Markers
- **P0**
  - Coverage appears lapsed / never insured
- **P1**
  - 1+ accidents or violations
  - No selected carriers (manual routing needed)
- **P2**
  - No immediate risk markers

Markers are deterministic and generated from intake values so two agents reading the same lead see the same urgency signals.

## Action Block Rules
- Always include:
  - Recommended next step sentence based on priority
  - Phone
  - Email
- Wording is imperative and brief to reduce decision latency.

## Copy Variants

### Version A: Quick Triage (Minimal)
Use when inbox load is high and agents need fastest sort/act behavior.

- Keeps full top blocks + compact quick triage and selective detail rows.
- Shows only highest-value fields in lower sections.
- Best for mobile between calls.

### Version B: Full Detail (Comprehensive)
Use when lead ownership is lower-volume and deeper pre-call context matters.

- Includes all grouped sections and all known fields.
- Better for desk review and pre-underwriting preparation.

## Plain-Text Fallback Structure
- Mirrors the same hierarchy:
  1) Lead summary
  2) Priority flags
  3) Action
  4) Quick triage
  5) Grouped details
- Keeps deterministic section ordering and missing-value labels.

## Mapping Table: `userData` Field -> Label -> Section -> Display Format

| userData field | Human-friendly label | Section | Display format |
|---|---|---|---|
| `firstName` | First Name | Contact | Text |
| `lastName` | Last Name | Contact | Text |
| `dateOfBirth` | Date of Birth | Contact | Date (`MM/DD/YYYY` when ISO-like) |
| `email` | Email | Contact | Email text |
| `phone` | Phone | Contact | Phone (`(XXX) XXX-XXXX` when 10 digits) |
| `maritalStatus` | Marital Status | Contact | Text |
| `gender` | Gender | Contact | Text |
| `streetAddress` | Street Address | Location | Text |
| `apt` | Unit / Apt | Location | Text |
| `city` | City | Location | Text |
| `state` | State | Location | Text |
| `zipCode` | ZIP Code | Location | Text |
| `housingType` | Housing Type | Location | Text |
| `vehicleYear` | Vehicle Year | Vehicle | Text |
| `vehicleMake` | Vehicle Make | Vehicle | Text |
| `vehicleModel` | Vehicle Model | Vehicle | Text |
| `vehicleTrim` | Vehicle Trim | Vehicle | Text |
| `ownership` | Vehicle Ownership | Vehicle | Text |
| `primaryUse` | Primary Use | Vehicle | Text |
| `annualMileage` | Annual Mileage | Vehicle | Text |
| `commuteMiles` | Commute Miles (One-way) | Vehicle | Text |
| `antiTheftDevice` | Anti-Theft Device | Vehicle | Boolean (`Yes/No`) |
| `education` | Education Level | Driver | Text |
| `employmentStatus` | Employment Status | Driver | Text |
| `occupation` | Occupation | Driver | Text |
| `licenseAge` | Age First Licensed | Driver | Text |
| `accidents` | At-Fault Accidents (5 yrs) | Driver | Text |
| `violations` | Moving Violations (5 yrs) | Driver | Text |
| `continuousCoverage` | Continuous Coverage | Driver | Text |
| `liabilityLimit` | Liability Coverage | Coverage | Text |
| `collisionDeductible` | Collision Deductible | Coverage | Text |
| `comprehensiveDeductible` | Comprehensive Deductible | Coverage | Text |
| `medicalPayments` | Medical Payments | Coverage | Text |
| `roadsideAssistance` | Roadside Assistance | Coverage | Boolean (`Yes/No`) |
| *(unknown key)* | Humanized key (e.g., `driverScore` -> `Driver Score`) | Additional Intake Data | Text |

## Missing / Unknown Value Rules
- Missing, null, undefined, or empty string -> `Not provided`
- Unknown keys are included (never silently dropped) under **Additional Intake Data**
- All values are sanitized to prevent line breaks and injection-like formatting issues

## Accessibility and Readability Constraints
- Minimum primary content size: 13px.
- Color contrast stays high (dark text on white; white on maroon headings).
- Avoid dense text walls: section cards and row dividers create clear scan lanes.
- No decorative graphics required for comprehension.
- Information communicated in text, not color alone.

## Why This Is Faster for Agents
- Above-the-fold concentration of high-value triage data (priority, contact, ZIP, risk).
- Explicit priority and action recommendation remove interpretation overhead.
- Deterministic field order improves pattern memory over repeated lead handling.
- Grouped details reduce scroll-and-hunt behavior versus raw dumps.

## What to De-Emphasize
- Secondary profile data that rarely changes initial call strategy (e.g., education, occupation) is moved below the action block.
- Full field exhaust remains available but not allowed to compete with triage-critical cues.

## Implementation Notes
- Implemented in `server/src/services/emailService.ts`.
- Sends both `html` and `text` via Nodemailer.
- Environment toggle: `HANDOFF_EMAIL_VARIANT=minimal|detailed` (defaults to `minimal`).
- Priority appears in subject line and response message metadata for verification.

## Ship Recommendation
- **Ship first:** Version A (minimal).
- **Why:** It aligns to the explicit goal (sub-30-second triage), minimizes mobile cognitive load, and still preserves full context through grouped sections.
- **When to use Version B:** If agents request deeper pre-call context in email and report low inbox pressure.
