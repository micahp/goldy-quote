# GoldyQuote – Core User Stories

> These stories define the baseline experience and system behaviour for multi-carrier quote retrieval as of **June 2025**.  They are living documentation; update when flows or requirements change.

## 1. Zip-Only Quick Start
*As a visitor, I want to enter my ZIP code on the home page and click "Get Quotes," so that I'm taken directly to carrier selection without re-entering data.*

## 2. Carrier Selection
*As a shopper, I want to pick one or more carriers (e.g., GEICO, Progressive) and click "Start," so that the system begins retrieving quotes only from the companies I chose.*

## 3. Step-by-Step Data Collection
*As a shopper, I want the system to autofill everything it already knows and then pause to ask me only for the fields required on the **next** carrier page (e.g., Date of Birth for GEICO Step 2).  When I submit those fields, automation should resume for **all** selected carriers until new inputs are needed.*

## 4. Live Progress & Snapshots
*As a shopper, I want to see real-time status cards for each carrier (e.g., "GEICO – Step 2/6, waiting for DOB") **and** thumbnail snapshots of every new page the bot reaches, so that I can understand what's happening and quickly spot errors.*

## 5. Error Surfacing
*As a shopper, if a carrier page fails to load an expected input or button, the app should flag that carrier with an error message (e.g., "Address field not found – selector mismatch") **without** crashing automation for the others.*

## 6. Minimal Testing Overhead
*As a developer, I want one focused Playwright test per carrier **step** that launches a single browser, verifies selectors for that step, and exits, so CI stays fast and stable.*

---

### Change Log
| Date | Author | Notes |
|------|--------|-------|
| 2025-06-27 | Initial draft | Added six foundational user stories based on planning session | 