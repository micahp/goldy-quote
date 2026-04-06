# GoldyQuote Manual UI Testing Guide (Playwright MCP)

> **Scope**: This document is written for LLM-powered agents (Cursor, Taskmaster, ChatGPT, etc.) that interact with the GoldyQuote project via the **Playwright MCP** toolset.  Follow these rules when validating carrier quote flows or the React front-end.  
> **Absolutely no programmatic/unit/e2e test commands** (`playwright test`, `vitest`, etc.) may be executed from here.

---

## 1. Environment Setup

1. Launch both the **React client** (`vite`) and **Express + Playwright backend** with:
   ```bash
   pnpm run dev:all   # or npm run dev:all
   ```
   This starts:
   - React @ `http://localhost:5173`
   - Backend + WebSocket @ `http://localhost:3001`

2. All subsequent browser actions **must** use MCP calls (`mcp_playwright_browser_*`).  Example to open the home page:
   ```json
   { "recipient_name": "mcp_playwright_browser_navigate", "parameters": { "url": "http://localhost:5173" } }
   ```

---

## 2. General Workflow

| Step | MCP Call | Purpose |
|------|----------|---------|
| 1 | `browser_navigate` → `/` | Reset session & clear stale state. |
| 2 | `browser_type` – ZIP textbox | Enter *ZIP Code* (e.g., `73301`). |
| 3 | *(optional)* `browser_select_option` – Insurance Type | Ensure **Auto Insurance** is selected. |
| 4 | `browser_click` – **Get Quotes** | Go to carrier-selection page. |
| 5 | `browser_click` – Carrier cards / checkboxes | Enable/disable desired carriers. |
| 6 | `browser_click` – **Continue with N Carriers** | Open multi-step quote form. |
| 7 | Complete form steps (manual typing/selecting) | Use `browser_type`, `browser_select_option`, `browser_click`. |
| 8 | Observe right-hand **Quote Progress** panel | Each agent sends snapshots & status via WebSocket. |

### Restarting After an Error
If the flow freezes (e.g., WebSocket disconnect) or an invalid state occurs:
1. Use `browser_navigate` back to `http://localhost:5173/` (homepage).  
2. Optionally call `browser_wait_for` (2–3 s) to allow full reload.  
3. Begin the workflow again from **Step 1**.

> **Do not** refresh the quote form directly—many carriers block refreshes; always return to the landing page.

---

## 3. Diagnostics & Observability

* **Page Snapshots**: The backend automatically attaches carrier screenshots to each `carrier_status` message.  Use the Quote Progress thumbnails to understand where the remote page is.
* **Console Logs**: Call `mcp_playwright_browser_console_messages` to print recent `console.log`, `warning`, `error` events for troubleshooting.
* **Network Issues**: If WebSocket thrashing is detected, inspect the backend logs printed in the running server shell.

---

## 4. Data Entry Conventions

| Field | Test Value | Notes |
|-------|------------|-------|
| First Name | `John` | Simple ASCII |
| Last Name | `Doe`  | |
| Date of Birth | `1985-01-01` | Use ISO `yyyy-mm-dd` to satisfy HTML `<input type="date">`. |
| Email | `john.doe+test@goldyquote.io` | Unique per run if needed. |
| Phone | `5125550101` | 10-digit US format (no dashes). |
| VIN / Plate (if asked) | `1HGCM82633A004352` | Any valid-length dummy. |

---

## 5. Prohibited Actions

1. **`playwright test`, `playwright test --ui`, `vitest`, or any Jest/Mocha runner** – banned for manual runs.
2. Deleting DB rows or issuing destructive migrations without a prior backup.
3. Hard-coding secrets in source files.

Follow this guide exactly.  If a step is uncertain, prefix your chat with **“⚠️ Uncertain:”** and ask a clarifying question before proceeding. 

---

## 6. Deterministic Stalled-State Regression Scenario

Use this scenario to force and verify `carrier_stalled` behavior in the UI.

1. Start the stack with a very low backend timeout:
   ```bash
   STEP_TIMEOUT=300 npm run dev:all
   ```
2. Navigate with MCP to `http://localhost:5173`, enter ZIP, select carriers, continue to quote form.
3. Fill step 1 quickly and click **Next Step**.
4. Watch **Quote Progress** cards:
   - Expected result: at least one card shows a **Stalled** badge.
   - Optional detail: stalled reason text should mention expected vs detected step labels.
5. Confirm recovery behavior:
   - Continue interacting until a later healthy `carrier_status` update arrives.
   - Expected result: `Stalled` badge clears when carrier resumes normal step progression.

If no stalled badge appears after 1-2 attempts, lower timeout further (e.g., `STEP_TIMEOUT=150`) and retry from landing page.