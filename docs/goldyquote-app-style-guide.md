# GoldyQuote App Style Guide

## Purpose
This guide defines the visual and UX system for the GoldyQuote web app, based on the current
frontend implementation. It is the canonical reference for building consistent pages and
components across marketing, intake, carrier selection, and quote comparison flows.

## 1) Product UX Direction
- **Primary goal:** move users from landing to completed intake quickly.
- **Tone:** trustworthy, fast, practical, agent-assisted.
- **Interaction model:** guided flow with clear next actions, low-friction forms, and strong
  progress cues.
- **Visual personality:** high-contrast brand palette with practical cards/forms and restrained
  motion.

## 2) Core Design Tokens

### Brand Palette
- **Primary Maroon:** `#7A0019`
- **Primary Maroon (dark):** `#630014`
- **Brand Gold:** `#FFCC33`
- **Brand Gold alt:** `#F7B538`
- **Deep Blue support:** `#1A3A63`
- **Teal accent:** `#00A6A6`

### Neutral Palette
- **Text primary:** `#111827` (or Tailwind `gray-900` equivalent)
- **Text secondary:** `#4B5563` / `gray-600`
- **Muted text:** `#777677` / `gray-500`
- **Surface base:** `#FFFFFF`
- **Surface subtle:** `#F9FAFB` / `gray-50`
- **Border:** `#D1D5DB` / `gray-300`

### Semantic Colors
- **Success:** `#4CAF50` / `green-500`
- **Warning/attention:** use gold scale (`#FFCC33`, `#F7B538`)
- **Error:** `red-500` family

## 3) Typography
- **Font family:** system sans stack (Tailwind default; no custom web font currently).
- **Hero heading:** `text-4xl` to `text-6xl`, `font-bold`, tight leading.
- **Section heading:** `text-3xl`, `font-bold`.
- **Card heading:** `text-xl`, `font-semibold`.
- **Body:** `text-base` or `text-lg` for marketing copy; `text-sm` for metadata/supporting UI.
- **Label text:** `text-sm font-medium` on forms and controls.

## 4) Layout and Spacing System
- **Page shell:** `min-h-screen flex flex-col`, with header/footer framing.
- **Main container:** `container mx-auto px-4 md:px-6`.
- **Section rhythm:** typically `py-16` for major homepage sections.
- **Card spacing:** default card padding around `p-4` to `p-6`.
- **Grid patterns:**
  - Features: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - Quotes: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - Carrier cards: `grid-cols-1 md:grid-cols-2`

## 5) Component Style Rules

### Buttons (`src/components/common/Button.tsx`)
- Variants:
  - `primary`: gold background, maroon text
  - `secondary`: maroon background, white text
  - `outline`: gold border/text
  - `text`: subtle text action
- Shapes: medium rounding (`rounded-md`)
- States:
  - clear hover color shift
  - focus ring always visible
  - disabled handled via native button props

### Cards (`src/components/common/Card.tsx`)
- Base: white surface, rounded corners (`rounded-lg`), optional shadow and border.
- Elevation levels: none / sm / md / lg.
- Used as primary container for forms, feature blocks, and quote cards.

### Header (`src/components/layout/Header.tsx`)
- Fixed top header, transparent over hero then switches to white + shadow on scroll.
- Branding always uses maroon/gold when on light background.
- Navigation uses direct, task-oriented labels.

### Forms (Hero and Quote Flow)
- Inputs are large-touch targets in high-intent steps (`py-3`, readable sizing).
- Focus state emphasizes gold ring.
- Error state uses red border/ring and concise helper text.
- Required fields are explicitly marked.

## 6) Page-Level Visual Patterns

### Home
- Hero uses maroon gradient (`#7A0019` -> `#630014`) with gold highlights.
- Trust/value proof appears near CTA (savings, speed, follow-up).
- Supporting sections alternate white and soft neutral backgrounds for scan separation.

### Carrier Selection
- Card-based multi-select pattern with strong selected state:
  - selected: gold border + subtle yellow background
  - unselected: gray border with gold hover affordance
- Progress indicator clearly communicates step position.

### Quotes Listing
- Filter bar appears before card grid.
- Quote cards emphasize monthly price and provider trust markers.
- Expanded details are progressive disclosure, not default clutter.

## 7) Interaction and Motion
- Motion is subtle and purposeful:
  - `transition-all duration-200` or `duration-300`
  - small hover lift for interactive cards (`hover:-translate-y-1`)
  - avoid large movement or flashy animation during form-heavy tasks
- Expanded/collapsed detail sections use gentle fade behavior.

## 8) Content and Microcopy Rules
- Prefer direct operational copy:
  - "Get My Quote", "Continue", "Select Quote"
- Keep labels concrete and user-facing (no internal jargon).
- Keep helper/error text concise and immediately actionable.
- Maintain confidence + clarity over clever wording.

## 9) Accessibility and Readability Baseline
- Ensure color contrast remains strong on all foreground/background pairs.
- Preserve visible focus styles for all interactive controls.
- Maintain touch-friendly controls in mobile layouts.
- Use semantic labels for form inputs; keep `sr-only` labels where visual labels are omitted.
- Never communicate state by color alone (combine with text/iconography).

## 10) Responsive Behavior
- Mobile-first classes with breakpoint enhancement (`md`, `lg`).
- Hero and form stacks vertically on small screens.
- Grids collapse to single column on small viewports.
- Critical actions stay within thumb reach and are not hidden behind hover-only UI.

## 11) Do / Do Not

### Do
- Reuse existing maroon/gold palette and current component variants.
- Keep key actions and progress cues above the fold.
- Use cards and section spacing to chunk content logically.
- Favor predictable interaction over novelty in intake flows.

### Do Not
- Introduce new brand colors without design review.
- Add heavy effects that reduce readability or performance.
- Hide required business context behind deep interaction layers.
- Mix multiple CTA styles in the same decision block.

## 12) Implementation References
- `src/components/common/Button.tsx`
- `src/components/common/Card.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/home/HeroSection.tsx`
- `src/components/home/FeaturesSection.tsx`
- `src/components/home/HowItWorksSection.tsx`
- `src/pages/CarrierSelectionPage.tsx`
- `src/pages/QuotesPage.tsx`

## 13) Change Management
- If a new UI pattern is introduced in 3+ places, add it to this guide.
- Keep this guide app-focused (email styles belong in separate docs).
