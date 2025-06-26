# Liberty Mutual Browser Compatibility Fixes

## Overview

This document captures the comprehensive analysis and fixes implemented to resolve Liberty Mutual's browser detection and HTTP/2 protocol errors. The solution involved making our Playwright automation indistinguishable from a real Chrome browser.

## Problem Analysis

### Initial Issues
- `ERR_HTTP2_PROTOCOL_ERROR` on Liberty Mutual pages
- Browser automation detection preventing quote flow
- Missing modern browser headers and properties
- Unnatural interaction patterns triggering anti-bot measures

### HAR File Analysis Results

Analysis of `www.libertymutual.com.har` (11MB) revealed critical differences:

**Real Browser Headers (Chrome 137):**
```http
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Cache-Control: max-age=0
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-origin
Sec-Fetch-User: ?1
Upgrade-Insecure-Requests: 1
sec-ch-ua: "Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
```

**Our Previous Browser (Incomplete):**
```http
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Accept-Language: en-US,en;q=0.9
# Missing: Chrome Client Hints, Sec-Fetch headers, proper Accept headers
```

### Critical Missing Elements

1. **Chrome Client Hints Headers** - Modern security requirement
2. **Sec-Fetch Headers** - Cross-origin request security
3. **Updated Chrome Version** - 120 vs 137 version mismatch
4. **Complete Accept Headers** - Content negotiation capabilities
5. **Automation Detection Markers** - `navigator.webdriver`, plugins, etc.

## Solution Implementation

### 1. Browser Configuration Updates

**File: `server/src/browser/BrowserManager.ts`**

#### Updated User Agent
```typescript
userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
```

#### Complete HTTP Headers
```typescript
extraHTTPHeaders: {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'max-age=0',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  // Chrome Client Hints - critical for modern websites
  'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"'
}
```

#### Enhanced Launch Arguments
```typescript
args: [
  '--disable-http2',                                    // Prevent HTTP/2 errors
  '--disable-blink-features=AutomationControlled',     // CRITICAL: Hide automation
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-default-apps',
  '--disable-popup-blocking',
  '--disable-translate',
  '--disable-sync',
  '--disable-extensions',
  '--disable-features=VizDisplayCompositor',
  '--disable-ipc-flooding-protection',
  '--disable-background-networking',
  '--disable-component-extensions-with-background-pages',
  '--disable-client-side-phishing-detection',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-web-security',
  '--allow-running-insecure-content',
  '--disable-features=TranslateUI',
  '--disable-features=BlinkGenPropertyTrees'
]
```

### 2. JavaScript Automation Masking

**Critical stealth script injected via `page.addInitScript()`:**

```typescript
// Remove webdriver property
delete (navigator as any).webdriver;

// Override plugins to look like a real browser
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    {
      description: "Portable Document Format",
      filename: "internal-pdf-viewer",
      length: 1,
      name: "Chrome PDF Plugin",
    },
    {
      description: "",
      filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
      length: 1,
      name: "Chrome PDF Viewer",
    },
    {
      description: "",
      filename: "internal-nacl-plugin",
      length: 2,
      name: "Native Client",
    },
  ],
});

// Override languages to match real browser
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
});

// Override chrome runtime to look like real Chrome
(window as any).chrome = {
  runtime: {
    onConnect: undefined,
    onMessage: undefined,
  },
  loadTimes: () => ({}),
  csi: () => ({}),
};
```

### 3. Natural Interaction Patterns

**File: `server/src/agents/libertyMutualAgent.ts`**

#### Human-like Typing
```typescript
// Type naturally with slight delays between characters
for (const char of userData.zipCode) {
  await zipInput.type(char);
  await page.waitForTimeout(Math.random() * 50 + 25); // 25-75ms between chars
}
```

#### Natural Button Interaction
```typescript
// Human-like button interaction
await getPriceBtn.hover();
await page.waitForTimeout(Math.random() * 500 + 300); // Random hover time 300-800ms
await getPriceBtn.click({ timeout: 5000, noWaitAfter: true });
```

#### Enhanced Error Handling
```typescript
// Clear browser state more thoroughly
await page.context().clearCookies();
await page.context().clearPermissions();
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});

// Longer wait with jitter before retry
await page.waitForTimeout(Math.random() * 2000 + 2000);
```

## Key Insights

### 1. Chrome Client Hints Are Critical
Modern websites like Liberty Mutual **require** Chrome Client Hints headers:
- `sec-ch-ua`: Browser brand and version information
- `sec-ch-ua-mobile`: Mobile device indicator
- `sec-ch-ua-platform`: Operating system information

**Missing these headers is a dead giveaway of automation.**

### 2. Version Matching Matters
The HAR file showed Chrome 137, but we were using 120. Version mismatches can trigger detection algorithms.

### 3. Sec-Fetch Headers Are Security Requirements
Modern web security frameworks expect:
- `Sec-Fetch-Dest`: Request destination
- `Sec-Fetch-Mode`: Request mode
- `Sec-Fetch-Site`: Request site relationship
- `Sec-Fetch-User`: User-initiated request indicator

### 4. Automation Detection Is Sophisticated
Multiple detection vectors:
- `navigator.webdriver` property
- Missing or incorrect plugin arrays
- Unusual timing patterns
- Header fingerprinting
- JavaScript property analysis

### 5. HTTP/2 Protocol Sensitivity
Liberty Mutual's servers are sensitive to HTTP/2 implementation differences. Disabling HTTP/2 (`--disable-http2`) resolves protocol errors.

## Testing Results

### Before Fixes
- ❌ `ERR_HTTP2_PROTOCOL_ERROR` on navigation
- ❌ Quote flow blocked by automation detection
- ❌ Inconsistent page loading

### After Fixes
- ✅ Clean navigation to Liberty Mutual pages
- ✅ Successful quote flow initiation
- ✅ Natural browser fingerprint
- ✅ No automation detection

## POST Request Analysis from HAR

Found 35 POST requests, including:
1. **Analytics tracking** (Google Analytics, DataDog RUM)
2. **Form submissions** (quote data)
3. **Behavioral tracking** (Tealium, SecuredVisit)

**Key finding:** Quote initiation triggers `event=form_start` and `event=form_submit` tracking that our browser now properly supports.

## Broader Application

These fixes apply to other carriers facing similar detection:
- **Progressive**: May benefit from Client Hints headers
- **State Farm**: Sec-Fetch headers important for modern security
- **GEICO**: Natural timing patterns reduce detection risk

## Maintenance Notes

### Version Updates
- Monitor Chrome releases and update user agent accordingly
- Client Hints version numbers should match user agent
- Test quarterly for new detection methods

### Header Evolution
- Sec-Fetch headers may expand with new specifications
- Client Hints API continues evolving
- Monitor for new automation detection techniques

### Performance Impact
- Natural delays add 2-5 seconds per interaction
- JavaScript injection adds minimal overhead
- Benefits outweigh timing costs for reliability

## Files Modified

1. **`server/src/browser/BrowserManager.ts`**
   - Updated browser launch arguments
   - Enhanced HTTP headers
   - Added JavaScript stealth injection

2. **`server/src/agents/libertyMutualAgent.ts`**
   - Natural interaction timing
   - Enhanced error handling
   - Human-like behavior patterns

## References

- [Chrome Client Hints Documentation](https://web.dev/user-agent-client-hints/)
- [Sec-Fetch Headers Specification](https://w3c.github.io/webappsec-fetch-metadata/)
- [Playwright Stealth Techniques](https://playwright.dev/docs/emulation)
- Liberty Mutual HAR file analysis (11MB network trace)

---

**Last Updated:** January 2025  
**Status:** ✅ Implemented and tested  
**Next Review:** Q2 2025 (Chrome version updates) 