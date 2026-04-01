# GoldyQuote Reliability Task Tracker

Last updated: 2026-03-31

## Active Workstream: Browser-Agent Reliability

- [x] Add backend transition verification guard in `BaseCarrierAgent`
- [x] Wire guarded advancement for GEICO step transitions
- [x] Wire guarded advancement for Progressive step transitions
- [x] Add backend `carrier_stalled` WebSocket payload type
- [x] Surface stalled state in frontend WebSocket hook + status card UI
- [x] Manually validate baseline flow via MCP browser (landing -> carriers -> quote form step progression)
- [x] Update handoff summary in `docs/context_summary_2026-03-31.md`
- [x] Extend transition-verified advancement to deterministic State Farm and Liberty transitions
- [x] Sync carrier card status/progress from live `carrier_status` messages in quote form
- [x] Fix status-card update gate to process status updates even when `currentStepLabel` is absent
- [x] Stabilize WebSocket hook connection by decoupling callback identity from reconnect lifecycle
- [x] Extract + test carrier ID normalization utility to prevent backend/frontend key drift

## In Progress

- [x] Add/refresh automated tests for `carrier_stalled` handling in frontend hook tests
- [x] Add/refresh backend WebSocket compatibility test coverage for `carrier_stalled` payload contract
- [x] Run focused test pass for touched frontend/backend test files

## Verification Log

- 2026-03-31: `npm run test:client -- src/hooks/__tests__/useRequiredFieldsWebSocket.test.tsx` (pass, 9 tests)
- 2026-03-31: `npx vitest run src/tests/websocket-compatibility.test.ts` in `server/` (pass, 9 tests)
- 2026-03-31: Added UI guard to hide backend-required field hints while any carrier is `outOfSync` or `stalled`
- 2026-03-31: Lint diagnostics on updated State Farm + Liberty agent files (no new issues)
- 2026-03-31: `npm run test:client -- src/components/quotes/__tests__/CarrierStatusCard.test.tsx` (pass, stalled badge render)
- 2026-03-31: `npm run test:client -- src/components/quotes/__tests__/CarrierStatusCard.test.tsx src/hooks/__tests__/useRequiredFieldsWebSocket.test.tsx` (pass, 10 tests)
- 2026-03-31: Patched `handleCarrierStatusUpdate` to update status/progress without requiring `currentStepLabel`
- 2026-03-31: Updated `useRequiredFieldsWebSocket` to use callback refs (prevents unnecessary reconnect churn)
- 2026-03-31: Added `carrierUtils.normalizeCarrierId()` with tests; integrated into quote form status/stalled handlers
- 2026-03-31: `npm run test:client -- src/components/quotes/__tests__/carrierUtils.test.ts src/components/quotes/__tests__/CarrierStatusCard.test.tsx src/hooks/__tests__/useRequiredFieldsWebSocket.test.tsx` (pass, 12 tests)
- 2026-04-01: Manual MCP deterministic run with `STEP_TIMEOUT=300` reached quote form (`task_1775004311146_nhl3wqg`) and live card progression to `42% complete` / `Filling application forms...`, but no visible `Stalled` badge after repeated timed checks.
- 2026-04-01: Manual MCP retry with `STEP_TIMEOUT=150` (`task_1775004396188_yxk217q`) also showed live progression (`26%` -> `42%`) without a visible `Stalled` badge; browser console showed repeated RequiredFields WebSocket reconnect churn and carrier status updates arriving as `processing` at step `0`.

## Manual Validation Notes

- Attempted deterministic low-timeout (`STEP_TIMEOUT=300`) manual MCP run to force visible `Stalled` badge.
- Flow now reaches quote form with live card states (e.g., "Error occurred", "Starting quote process...") after status routing fixes.
- Additional deterministic retry performed with `STEP_TIMEOUT=150`; still no visible `Stalled` badge captured.
- Current blocker observed during low-timeout retries: repeated WebSocket reconnect churn in frontend hooks can interrupt/obscure stable stalled-state observation in the quote-progress panel.
- A visible `Stalled` badge has still not been conclusively captured in manual UI yet; this remains pending and now includes concrete reproduction evidence/task IDs from both low-timeout attempts.
- Automated/UI-unit coverage for stalled indicator is now in place; manual badge confirmation remains pending and should be retried with a longer live carrier processing run.

## Backlog / Next

- [x] Extend guarded transitions to additional carriers beyond GEICO/Progressive
- [ ] Add deterministic stalled-state E2E scenario for regression prevention
- [x] Align stale required-fields rendering with current step labels to avoid stale UI hints
