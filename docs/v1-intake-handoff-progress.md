# V1 Intake Handoff Progress

Last updated: 2026-04-01

## Goal

Implement a simplified v1 fallback flow that collects customer information,
emails it to a configured recipient (`HANDOFF_EMAIL_TO`, fallback to Megan), and
confirms submission with the `info-received.mp4` video instead of running live quote automation.

## Todo Status

| Todo ID | Status | Notes |
|---|---|---|
| `frontend-handoff-submit` | Completed | Final submit now calls handoff endpoint and shows confirmation UI with video. |
| `backend-handoff-endpoint` | Completed | `POST /api/quotes/:taskId/handoff` validates required contact fields and sends handoff email. |
| `smtp-email-service` | Completed | `server/src/services/emailService.ts` added and wired using `nodemailer`. |
| `video-asset-serving` | Completed | Frontend now uses `/api/media/info-received.mp4`; backend serves root video file via media route. |
| `manual-mcp-validation` | In Progress | Ready to run browser validation flow. |

## Change Log

- Added intake handoff submit flow in `src/components/quotes/MultiCarrierQuoteForm.tsx`.
- Added SMTP email service in `server/src/services/emailService.ts`.
- Added `POST /api/quotes/:taskId/handoff` endpoint in `server/src/index.ts`.
- Added video serving route `GET /api/media/info-received.mp4` in `server/src/index.ts`.
- Installed `nodemailer` in backend via `pnpm add nodemailer`.
- Installed `@types/nodemailer` in backend via `pnpm add -D @types/nodemailer`.
- Frontend production build passes; backend build still has pre-existing `server/src/schemas/unifiedSchema.ts` type errors unrelated to this change.
- Added v1 intake-only start endpoint `POST /api/intake/start` and updated home flow to skip carrier comparison.
- Updated v1-facing titles/copy to remove compare-quotes language and focus on agent handoff.
- Updated quote form page heading to "Get Your Quote".
- Updated testimonials, how-it-works final step, and footer messaging to align with intake + agent follow-up positioning.
- Made handoff recipient configurable with `HANDOFF_EMAIL_TO` (defaults to Megan) and documented Gmail SMTP setup in `server/.env.example`.
- Added MailHog-first local SMTP setup guidance in `server/.env.example`.
- Added `npm run dev:mailhog` and `npm run dev:mailhog:stop` helper scripts (Docker MailHog with Homebrew Mailpit fallback).
- Added local SMTP testing runbook at `docs/mailhog-local-smtp-testing.md`.
- Updated `.cursor/rules/rule.mdc` to enforce manual Playwright MCP testing and self-hosted/free-tier vendor preference.

## Validation Log

- Lint diagnostics pass on updated frontend + backend files.
- Manual Playwright MCP flow confirms:
  - Home now starts intake directly (no carrier-selection page).
  - Quote form route loads from intake start endpoint and supports full multi-step submission.
  - Final submit returns Gmail auth error (`EAUTH 535 BadCredentials`) with current SMTP credentials, confirming handoff path is reached and SMTP auth is now the blocker.
  - MailHog-based local SMTP path is now documented for zero-cost testing.
