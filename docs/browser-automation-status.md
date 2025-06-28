# Browser Automation Status

_Last updated: {{DATE}}_

This document tracks how far our Playwright automation gets through each carrier's quote flow, relative to the total number of steps documented.

| Carrier | Total Steps | Current Automation Progress | Notes |
|---------|-------------|-----------------------------|-------|
| GEICO | 6 | **Step 2 / 6** – Personal Information (Date of Birth sub-step) | Successfully navigates homepage ZIP → "Start My Quote" → bundle modal → sales subdomain. Currently fills DOB and waits for name. |
| Progressive | 5 | **Step 2 / 5** – Address Information | Automation completes ZIP entry & Personal Information page, now waiting on address fields. |
| State Farm | 8 | **Step 2 / 8** – Cars (Vehicle Selection 2a) | Passed ZIP entry; automation reaches Add Car dialog. |
| Liberty Mutual | 6 | **Step 2 / 6** – Vehicles | Completed About You (personal + address); automation reaches vehicle discovery screen. |

## How to Update
1. Run the end-to-end quote flow via `npm run test:e2e` or the frontend UI.
2. Note the furthest page reached for each carrier.
3. Update the **Current Automation Progress** column and add any relevant notes (errors, selector issues, etc.).

> **Tip:** Keep this file in sync with `docs/browser-automation-antipatterns.md` so we can correlate failures with progress. If progress regresses, check for recently introduced anti-patterns. 