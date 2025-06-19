# Insurance Carrier Quote Flow Analysis

This document analyzes the actual quote flows for major insurance carriers to improve our agent implementations.

## Key Insights

### Universal Patterns
1. **Multi-stage navigation**: All carriers use multi-page flows, not single-page forms
2. **Dynamic script loading**: Pages load JavaScript that modifies the DOM after initial load
3. **URL changes**: Many carriers redirect through multiple URLs during the quote process
4. **Timing-sensitive**: Need to wait for scripts to load and DOM updates to complete
5. **Session-based**: Quote data is stored in sessions, not just form submissions

### GEICO Flow Analysis
**Based on**: https://geico.com/ → https://sales.geico.com/quote

#### Stage 1: Homepage (geico.com)
- **Initial landing**: ZIP code entry field prominently displayed
- **Key elements**: 
  - ZIP input field: `Enter your ZIP code:`
  - "Go" button to start quote
  - Insurance type selection (Auto, Home, etc.)
- **Navigation**: Clicking "START MY QUOTE" redirects to `sales.geico.com`

#### Stage 2: Quote Portal (sales.geico.com/quote)
- **URL transition**: Homepage → sales.geico.com (different subdomain)
- **Expected elements**: ZIP code form, vehicle selection
- **Script loading**: Multiple JavaScript libraries load asynchronously
- **Timing**: May need 2-3 seconds for full page interactivity

### Progressive Flow Analysis
**Based on**: https://autoinsurance5.progressivedirect.com/0/UQA/Quote/NameEdit

#### Notable Features
- **Complex URL structure**: Uses session-based URLs with tokens
- **Multi-subdomain**: Uses `autoinsurance5.progressivedirect.com`
- **State management**: `/0/UQA/Quote/` suggests URL-based state tracking
- **Direct to name entry**: This URL shows they jump straight to personal info collection

### State Farm Flow Analysis
**Based on**: https://auto.statefarm.com/quote/applicant-info?dataKey=...

#### Key Characteristics
- **Subdomain**: Uses `auto.statefarm.com` (not main site)
- **Query parameters**: Uses `dataKey` for session management
- **Direct to applicant info**: URL suggests this is mid-flow, not entry point

### Liberty Mutual Flow Analysis
**Based on**: https://buy.libertymutual.com/shop/quote-interview/...

#### Unique Features
- **Separate domain**: Uses `buy.libertymutual.com` (not main site)
- **Interview-style**: URL path `/quote-interview/` suggests guided process
- **Location-aware**: URL contains `city=Austin&jurisdiction=TX&zipCode=78753`
- **Campaign tracking**: Multiple campaign parameters

## Implementation Recommendations

### 1. Multi-Stage Navigation Strategy
```typescript
// Instead of single page analysis, implement stage detection
const stages = {
  'landing': ['geico.com', 'progressive.com/auto'],
  'zipCode': ['zip', 'postal', 'location'],
  'redirect': ['sales.geico.com', 'autoinsurance'],
  'personalInfo': ['first', 'last', 'name'],
  'vehicle': ['year', 'make', 'model'],
  'quote': ['premium', 'price', 'monthly']
};
```

### 2. Enhanced Timing Controls
```typescript
// Wait for dynamic content loading
await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000); // Allow for script execution
await page.waitForSelector('input[name*="zip"]', { timeout: 10000 });
```

### 3. Flexible URL Handling
```typescript
// Track URL changes and adapt behavior
const currentUrl = page.url();
if (currentUrl.includes('sales.geico.com')) {
  // Handle GEICO quote portal
} else if (currentUrl.includes('autoinsurance')) {
  // Handle Progressive flow
}
```

### 4. Improved Element Detection
```typescript
// Multiple selector strategies for the same field
const zipSelectors = [
  'input[name*="zip"]',
  'input[placeholder*="ZIP"]',
  'input[id*="postal"]',
  '.zip-input input',
  '[data-testid*="zip"]'
];
```

## Carrier-Specific Implementations

### GEICO Agent Updates Needed
1. **Start at homepage**: Begin at `geico.com`, not auto insurance page
2. **Handle ZIP entry**: Look for prominent ZIP input on homepage
3. **Follow redirects**: Expect redirect to `sales.geico.com`
4. **Wait for scripts**: Allow extra time for page interactivity

### Progressive Agent Updates Needed
1. **Handle subdomains**: Expect `autoinsurance.progressivedirect.com`
2. **Session URLs**: Work with dynamic URL parameters
3. **Multi-step flow**: Plan for name → address → vehicle → quote progression

### State Farm Agent Updates Needed
1. **Subdomain navigation**: Start with `auto.statefarm.com`
2. **Data key tracking**: Handle session-based navigation
3. **Mid-flow entry**: May start directly at applicant info stage

### Liberty Mutual Agent Updates Needed
1. **Separate domain**: Navigate to `buy.libertymutual.com`
2. **Interview flow**: Expect guided step-by-step process
3. **Location parameters**: Utilize ZIP/location data in URLs

## Testing Strategy

### Timing Tests
- Measure script loading times for each carrier
- Test with different network speeds
- Validate element availability after page loads

### Flow Validation
- Map complete user journeys for each carrier
- Identify all possible redirect paths
- Test with different ZIP codes/locations

### Error Handling
- Plan for timeout scenarios
- Handle unexpected redirects
- Graceful degradation when elements aren't found

## Next Steps

1. **Update BaseCarrierAgent**: Implement enhanced timing and navigation logic
2. **Carrier-specific overrides**: Create specialized logic for each carrier's unique flow
3. **Enhanced selectors**: Update locator helpers with carrier-specific selectors
4. **Flow state management**: Track progression through multi-stage flows
5. **Real-world testing**: Test with actual quote submissions to validate flows

## Technical Notes

### Script Dependencies
- All carriers load extensive JavaScript after initial page load
- DOM manipulation happens asynchronously
- Form elements may not be immediately interactable

### Session Management
- Most carriers use server-side session tracking
- URL parameters often contain session identifiers
- Cookie-based authentication may be required

### Rate Limiting
- Carriers may have bot detection
- Implement delays between actions
- Vary interaction patterns to appear more human-like 