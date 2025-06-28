# Testing Guide for Goldy Quote

## Overview
This project uses **Playwright** for end-to-end testing of insurance carrier automation. The tests verify that our multi-carrier quote system can successfully navigate through insurance carrier websites.

## Project Structure
- **Framework**: Playwright with TypeScript
- **Test Location**: `server/tests/e2e/`
- **Configuration**: `server/playwright.config.ts`
- **Test Artifacts**: `server/test-results/`

## Available Test Commands

### From Project Root
```bash
# Run all tests
npm run test

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests in debug mode
npm run test:debug
```

### From Server Directory
```bash
cd server

# Run all tests
npm run test
# or
npx playwright test

# Run with UI mode
npm run test:ui
# or
npx playwright test --ui

# Run in debug mode
npm run test:debug
# or
npx playwright test --debug

# Run specific test file
npx playwright test tests/e2e/multi-carrier-step2.spec.ts

# Run tests with specific options
npx playwright test --headed          # Show browser UI
npx playwright test --workers=1       # Run single worker
npx playwright test --retries=0       # No retries
```

## Test Configuration

### Key Settings
- **Timeout**: 120 seconds for long-running automation
- **Retries**: 2 retries in CI, 0 locally
- **Parallel**: Full parallelization enabled
- **Screenshots**: Only on failure
- **Video**: Retained on failure
- **Trace**: On first retry

### Web Servers
The config automatically starts:
1. **Backend server** on port 3001 (`npm run dev`)
2. **Frontend client** on port 5173 (Vite dev server)

## Current Tests

### Multi-Carrier Step 2 Test (`multi-carrier-step2.spec.ts`)
**Purpose**: Smoke test to verify all carriers can reach their personal info page (step 2)

**What it does**:
1. Starts a multi-carrier quote task via API
2. Waits 60 seconds for carrier agents to auto-navigate
3. Verifies each carrier shows expected form fields:
   - **Geico**: First name, last name, or DOB fields
   - **Progressive/Liberty Mutual/State Farm**: First name field

**Carriers tested**: Geico, Progressive, Liberty Mutual, State Farm

## Running Tests

### Prerequisites
1. Ensure server is running on port 3001
2. Chrome browser available
3. All dependencies installed (`npm install` in both root and server)

### Basic Test Run
```bash
# From project root
npm run test

# Expected output shows:
# - Server startup on ports 3001 & 5173
# - Browser automation progress
# - Test results for each carrier
```

### Debug Mode
```bash
npm run test:debug
# Opens Playwright Inspector for step-by-step debugging
```

### UI Mode
```bash
npm run test:ui
# Opens interactive test runner with real-time results
```

## Test Results

### Artifacts Location
- **HTML Report**: `server/test-results/html/`
- **JUnit XML**: `server/test-results/junit.xml`
- **Screenshots**: `server/test-results/artifacts/`
- **Videos**: `server/test-results/artifacts/`
- **Traces**: `server/test-results/artifacts/`

### Viewing Results
```bash
# Open HTML report
npx playwright show-report server/test-results/html

# Show trace for failed test
npx playwright show-trace server/test-results/artifacts/trace.zip
```

## Environment Setup

### Required Services
1. **Backend server**: Must be running on port 3001
2. **Browser**: Chrome/Chromium for Playwright
3. **Network**: Internet access for carrier websites

### Environment Variables
Create `server/.env` if needed for:
- API keys
- Debug flags
- Custom timeouts

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 3001/5173 are available
2. **Browser timeout**: Carrier sites may be slow, increase timeout if needed
3. **Selector changes**: Carrier websites change frequently, update selectors in test

### Debug Commands
```bash
# Check if servers are running
curl http://localhost:3001/api/health
curl http://localhost:5173

# Run single carrier test
npx playwright test --grep "geico"

# Verbose output
npx playwright test --reporter=list --verbose
```

## CI/CD Integration

### GitHub Actions
The project includes `.github/workflows/playwright-tests.yml` for automated testing.

### Configuration for CI
- **Workers**: 1 (sequential)
- **Retries**: 2
- **Headless**: true
- **Artifacts**: Uploaded on failure

## Adding New Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('test description', async ({ request, page }) => {
    // Test implementation
  });
});
```

### Best Practices
1. Use descriptive test names
2. Include carrier-specific selectors
3. Add proper timeouts for automation
4. Use soft assertions for multi-carrier scenarios
5. Clean up resources after tests

## Negative Examples & Anti-Patterns

### GEICO Agent - What NOT to Do

**❌ INCORRECT: Over-engineered step handlers with redundant error handling**

The following code was tested and **DOES NOT WORK** for GEICO step 1:

```typescript
private async handleDateOfBirth(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    
    // If we don't have dateOfBirth in stepData, we need to wait for it
    if (!stepData.dateOfBirth) {
      return this.createWaitingResponse(this.getDateOfBirthFields());
    }

    console.log(`[${this.name}] Attempting to fill date of birth: ${stepData.dateOfBirth}`);
    
    try {
      await this.smartType(taskId, 'Date of Birth', 'dateOfBirth', stepData.dateOfBirth);
      console.log(`[${this.name}] Date of birth filled successfully`);
      
      await this.clickNextButton(page, taskId);
      console.log(`[${this.name}] Next button clicked successfully`);
      
      // After date of birth, GEICO usually goes to name collection
      return this.createWaitingResponse(this.getNameCollectionFields());
    } catch (error) {
      console.error(`[${this.name}] Error handling date of birth:`, error);
      await this.browserActions.takeScreenshot(taskId, 'date-of-birth-error');
      return this.createErrorResponse(`Failed to handle date of birth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleNameCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    
    console.log(`[${this.name}] Attempting to fill name: ${stepData.firstName} ${stepData.lastName}`);
    
    try {
      await this.smartType(taskId, 'First Name', 'firstName', stepData.firstName);
      await this.smartType(taskId, 'Last Name', 'lastName', stepData.lastName);
      await this.clickNextButton(page, taskId);
      
      console.log(`[${this.name}] Name collection completed successfully`);
      return this.createWaitingResponse(this.getAddressCollectionFields());
    } catch (error) {
      console.error(`[${this.name}] Error handling name collection:`, error);
      await this.browserActions.takeScreenshot(taskId, 'name-collection-error');
      return this.createErrorResponse(`Failed to handle name collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleAddressCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    
    console.log(`[${this.name}] Attempting to fill address: ${stepData.streetAddress}`);
    
    try {
      await this.smartType(taskId, 'Street Address', 'address', stepData.streetAddress);
      // GEICO often auto-fills city/state from ZIP, so we just continue
      await this.clickNextButton(page, taskId);
      
      console.log(`[${this.name}] Address collection completed successfully`);
      
      // This is a guess, the flow after address is complex.
      // Returning an empty waiting response to signal the frontend to ask for the next logical step.
      return this.createWaitingResponse({});
    } catch (error) {
      console.error(`[${this.name}] Error handling address collection:`, error);
      await this.browserActions.takeScreenshot(taskId, 'address-collection-error');
      return this.createErrorResponse(`Failed to handle address collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
```

**✅ CORRECT: Simple, direct step handlers that work**

```typescript
private async handleDateOfBirth(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Date of Birth', 'dateOfBirth', stepData.dateOfBirth);
    await this.clickNextButton(page, context.taskId);
    return this.createWaitingResponse(this.getNameCollectionFields());
  }

  private async handleNameCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'First Name', 'firstName', stepData.firstName);
    await this.smartType(context.taskId, 'Last Name', 'lastName', stepData.lastName);
    await this.clickNextButton(page, context.taskId);
    return this.createWaitingResponse(this.getAddressCollectionFields());
  }

  private async handleAddressCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Street Address', 'address', stepData.streetAddress);
    // GEICO often auto-fills city/state from ZIP, so we just continue
    await this.clickNextButton(page, context.taskId);
    
    // This is a guess, the flow after address is complex.
    // Returning an empty waiting response to signal the frontend to ask for the next logical step.
    return this.createWaitingResponse({});
  }
```

**Key Anti-Pattern Lessons:**
1. **Don't add unnecessary validation** - The BaseCarrierAgent already handles missing data appropriately
2. **Don't over-engineer error handling** - Simple try/catch at the method level is sufficient
3. **Don't add redundant logging** - Keep it minimal and focused
4. **Don't extract taskId unnecessarily** - Use `context.taskId` directly
5. **Keep step handlers simple** - They should do one thing: fill fields and advance

### General Anti-Patterns for All Agents

- **Never modify working selectors** without explicit testing
- **Avoid complex conditional logic** in step handlers
- **Don't add validation that duplicates BaseCarrierAgent functionality**
- **Keep method signatures consistent** across all agents
- **Avoid unnecessary abstractions** that complicate the flow