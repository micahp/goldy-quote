# GoldyQuote Email Style Guide (App-Derived)

## Purpose
This file defines the operational email style system for GoldyQuote transactional messages, derived from current app UI patterns and constrained for reliable rendering in Gmail, Outlook, and mobile clients.

## Source of Truth in App Code
- Brand maroon from UI components: `#7A0019`
  - `src/components/layout/Header.tsx`
  - `src/components/common/Button.tsx`
- Brand gold accent from UI components: `#FFCC33`
  - `src/components/layout/Header.tsx`
  - `src/components/common/Button.tsx`
- Neutral white cards / simple borders / practical layout patterns:
  - `src/components/common/Card.tsx`
- Practical form-forward UX and progressive flow:
  - `src/components/quotes/MultiCarrierQuoteForm.tsx`
  - `src/components/quotes/formSteps.ts`

## Design Principles (Email)
- Prioritize **decision speed** over aesthetics.
- Put **who / urgency / contact / next action** above the fold.
- Keep visual hierarchy explicit and predictable.
- Use deterministic field ordering to reduce cognitive load.
- Never rely on JavaScript or interactive-only UI controls.

## Brand Tokens

### Core Colors
- `--gq-brand-primary: #7A0019` (header, section title emphasis)
- `--gq-brand-accent: #FFCC33` (small accent usage only)
- `--gq-text-primary: #111827` (body values)
- `--gq-text-secondary: #4B5563` (labels, support copy)
- `--gq-border: #D1D5DB` (row/section separation)
- `--gq-bg-subtle: #F9FAFB` (section headers)
- `--gq-bg-canvas: #F3F4F6` (outer email background)

### Priority / Risk Colors
- `--gq-risk-high: #B91C1C`
- `--gq-risk-medium: #B45309`
- `--gq-risk-low: #166534`

Use risk color chips with text labels so urgency is not communicated by color alone.

## Typography
- Font stack: `Arial, Helvetica, sans-serif`
- Heading text: 16px bold
- Section title text: 13px bold uppercase
- Data row text: 13px
- Supporting text: 11px to 12px
- Recommended line-height:
  - 1.2 for dense headings
  - 1.4 to 1.5 for body/action copy

## Spacing and Layout
- Max content width: `640px`
- Outer padding: `20px 12px`
- Card/section spacing: `14px` vertical gaps
- Section header padding: `10px 12px`
- Data cell padding: `6px 10px`
- Border style: `1px solid #D1D5DB`
- Corner radius: optional; default to square edges for cross-client consistency

## Email Structure Pattern
Use this section order in all lead-handoff operational emails:
1. Header
2. Lead Summary
3. Priority Flags
4. Action Block
5. Quick Triage
6. Detailed Sections (grouped)
7. Footer note (missing-value policy)

## Content Semantics

### Lead Summary (Required)
- Priority
- Applicant name
- Task ID
- Insurance type
- ZIP code
- Requested carriers

### Priority Flags (Required)
- Include explicit label and one-line detail.
- Keep to short, operational copy.

### Action Block (Required)
- One explicit recommendation sentence.
- Contact phone
- Contact email

### Detailed Data Grouping
- Contact
- Location
- Vehicle
- Driver
- Coverage
- Additional Intake Data (unknown fields)

## Formatting Rules
- Missing, null, undefined, or empty values display as: `Not provided`
- Preserve deterministic field order (do not reorder alphabetically in rendering)
- Unknown keys should not be dropped; humanize key and place in Additional Intake Data
- Sanitize all values before output (no raw line breaks)

## Accessibility and Readability Constraints
- Minimum core body size: 13px
- High-contrast body text against white background
- Avoid low-contrast gray-on-gray combinations
- Use text labels with any visual indicators (chips, badges)
- Keep sections short and clearly separated for mobile scanning

## Technical Constraints for Rendering Reliability
- Use table-based HTML layout
- Inline styles only for critical presentation
- No JavaScript
- No dependency on custom fonts
- Include robust plain-text fallback with same hierarchy

## Voice and Copy Tone
- Professional, practical, concise
- Operational language for insurance agents (triage/action-oriented)
- Avoid marketing fluff
- Use direct verbs: “Call”, “Verify”, “Route”, “Follow up”

## Versioning Guidance
- Default template for rollout: **minimal triage**
- Secondary template: **detailed**
- Store variants behind deterministic config flags, not heuristic toggles

## File Usage
- Reference this style guide when updating:
  - `server/src/services/emailService.ts`
  - any future transactional handoff templates
