# Page Object Refactor Demonstration

This document demonstrates how the upgraded page objects with `BaseHomePage` interface enable significant agent simplification.

## Before: Agent with Inline Selectors (100+ LOC)

```typescript
// OLD: ProgressiveAgent.start() - 100+ lines of home page logic
async start(context: QuoteContext): Promise<void> {
  // Navigate to Progressive
  await this.page.goto('https://www.progressive.com/', {
    waitUntil: 'domcontentloaded',
  });

  // Click auto insurance link
  const autoSelectors = [
    'a[href*="/auto/"]',
    'a:has-text("Auto")',
    '[data-product="auto"]',
    'button:has-text("Auto")',
    'button:has-text("Auto Insurance")',
  ];
  for (const selector of autoSelectors) {
    // ... 20+ lines of click logic
  }

  // Enter ZIP code
  const zipSelectors = [
    'input[name="ZipCode"]#zipCode_mma',
    'input[name="ZipCode"]#zipCode_overlay', 
    'input[name="zipCode"]',
  ];
  for (const selector of zipSelectors) {
    // ... 20+ lines of fill logic
  }

  // Submit quote
  const submitSelectors = [
    'input[name="qsButton"]#qsButton_mma',
    'input[name="qsButton"]#qsButton_overlay',
    'button:has-text("Get a quote")',
    'input[name="qsButton"]',
    'button:has-text("Get a Quote")',
    'input[type="submit"]',
  ];
  for (const selector of submitSelectors) {
    // ... 20+ lines of click logic
  }

  // Wait for navigation
  await this.page.waitForURL(/autoinsurance5\.progressivedirect\.com/, {
    timeout: 8000,
  });
}
```

## After: Agent with Page Object (3 LOC)

```typescript
// NEW: ProgressiveAgent.start() - 3 lines total
async start(context: QuoteContext): Promise<void> {
  const home = new ProgressiveHomePage(this.page);
  await home.startQuote(context.userData.zipCode);
}
```

## Benefits Achieved

### 1. **Dramatic LOC Reduction**
- **Before**: 100+ lines per agent for home page logic
- **After**: 3 lines per agent
- **Reduction**: ~97% fewer lines

### 2. **Selector Centralization**
- **Before**: Selectors duplicated across 4 agent files
- **After**: Selectors centralized in page objects
- **Maintenance**: Update selectors in 1 place instead of 4

### 3. **Consistent API**
All carriers now support the same interface:
```typescript
const home = new ProgressiveHomePage(page);
await home.startQuote(zip);

const home = new StateFarmHomePage(page);
await home.startQuote(zip);

const home = new GeicoHomePage(page);
await home.startQuote(zip);

const home = new LibertyMutualHomePage(page);
await home.startQuote(zip);
```

### 4. **Type Safety**
```typescript
// All page objects implement BaseHomePage
function startQuoteForAnyCarrier(home: BaseHomePage, zip: string) {
  return home.startQuote(zip);
}
```

### 5. **Improved Testability**
- Page objects can be unit tested independently
- Agents become thin state machines
- Easier to mock and stub for testing

## Implementation Status

✅ **Completed (First Pass)**:
- BaseHomePage interface created
- All 4 carrier page objects upgraded
- Selector parity achieved
- Unit tests added

🔄 **Next Steps**:
1. Refactor agent `start()` methods to use page objects
2. Create page objects for subsequent form steps
3. Add integration tests for page object workflows

## Selector Parity Details

### Progressive
- **Added**: `[data-product="auto"]`, `button:has-text("Auto")`, `button:has-text("Auto Insurance")`
- **Added**: `input[name="qsButton"]`, `button:has-text("Get a Quote")`, `input[type="submit"]`

### State Farm  
- **Added**: `button[data-action="get-quote"]` (fast path)

### Geico
- **Status**: Already feature-complete with comprehensive selectors

### Liberty Mutual
- **Status**: Already feature-complete with resilient container search

## Next Phase: Multi-Step Page Objects

After agent refactoring, we'll extend this pattern to all form steps:

```typescript
// Future: Complete multi-step page object workflow
const home = new ProgressiveHomePage(page);
await home.startQuote(zip);

const personalInfo = new ProgressivePersonalInfoPage(page);
await personalInfo.fillForm(context.userData);

const address = new ProgressiveAddressPage(page);
await address.fillForm(context.userData);

const vehicle = new ProgressiveVehiclePage(page);
await vehicle.fillForm(context.vehicleData);
```

This will reduce agent files from 600-700 LOC to 100-200 LOC total. 