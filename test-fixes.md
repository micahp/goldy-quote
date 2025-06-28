# Testing the DynamicStepForm Fixes

## Issues Fixed

1. **Liberty Mutual Navigation Timeout**: Changed from `networkidle` (15s) to `domcontentloaded` (45s) to prevent early timeout
2. **WebSocket Hook Field Preservation**: Use nullish coalescing (`??`) instead of logical OR (`||`) to preserve existing requiredFields when error messages arrive without fields
3. **DynamicStepForm Error Handling**: Show error message when status is 'error' and no requiredFields are available

## Test Steps

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
npm run dev
```

### 2. Test the Quote Form
1. Navigate to http://localhost:5173
2. Go to the quote form page
3. Enter a ZIP code (e.g., 78753)
4. Click "Get Quotes"

### Expected Behavior BEFORE Fixes:
- Form would show "Connecting to server..." or "Waiting for required fields..." indefinitely
- Liberty Mutual would timeout after 15 seconds
- Error messages would clear any valid schemas from working carriers

### Expected Behavior AFTER Fixes:
- Form should render Step 1 (personal info) fields within a few seconds
- Progressive should work and provide form fields
- Even if Liberty Mutual fails, the form should still show fields from working carriers
- Error carriers should show "Carrier error – please continue with the other providers."

### 3. Verify in Browser Console
Check for these log messages:
- `🔗 RequiredFields WebSocket connected`
- `📡 Subscribed to task: [taskId]`
- `📋 Received carrier status for [carrier]: { status: 'waiting_for_input', ... }`

### 4. Test Error Resilience
1. Stop the server while the form is running
2. Restart the server
3. The form should reconnect automatically and preserve any existing fields

## Verification Checklist

- [ ] WebSocket connects successfully
- [ ] Form renders Step 1 fields (firstName, lastName, etc.)
- [ ] Form doesn't get stuck in "Connecting..." state
- [ ] Error carriers don't break the form for working carriers
- [ ] Liberty Mutual navigation doesn't timeout immediately
- [ ] Tests pass: `npx vitest run src/hooks/__tests__/useRequiredFieldsWebSocket.test.tsx` 