# MCP Browser Integration Setup

This document explains how to set up and use the Model Context Protocol (MCP) browser integration in the GoldyQuote backend.

## Overview

The MCP Browser Service provides a hybrid approach to browser automation:
- **Primary**: Uses MCP Playwright tools when available (more reliable, better error handling)
- **Fallback**: Uses direct Playwright when MCP is unavailable or fails

## Configuration

### Environment Variables

Add these to your `.env` file or environment:

```bash
# MCP Configuration
MCP_ENABLED=true                    # Enable MCP integration
MCP_SERVER_URL=ws://localhost:8080/mcp  # MCP server WebSocket URL
MCP_FALLBACK=true                   # Fallback to Playwright if MCP fails
MCP_TIMEOUT=30000                   # Request timeout (ms)
MCP_RETRY_ATTEMPTS=2                # Retry attempts for failed operations
```

### Development Setup (MCP Disabled)

For development without external MCP server:

```bash
MCP_ENABLED=false
MCP_FALLBACK=true
```

## Usage in Carrier Agents

### Available Methods

The `BaseCarrierAgent` provides both direct MCP methods and hybrid methods:

#### Direct MCP Methods
```typescript
// These methods use MCP directly or fail
await this.mcpNavigate(taskId, 'https://example.com');
await this.mcpClick(taskId, 'Submit button', 'button[type="submit"]');
await this.mcpType(taskId, 'Email field', 'input[type="email"]', 'test@example.com');
await this.mcpSelectOption(taskId, 'State dropdown', 'select[name="state"]', ['CA']);
await this.mcpSnapshot(taskId);
await this.mcpWaitFor(taskId, { text: 'Quote complete' });
await this.mcpTakeScreenshot(taskId, 'final-quote.png');
```

#### Hybrid Methods (Recommended)
```typescript
// These methods try MCP first, then fallback to Playwright
await this.hybridNavigate(taskId, 'https://example.com');
await this.hybridClick(taskId, 'Submit button', 'button[type="submit"]');
await this.hybridType(taskId, 'Email field', 'input[type="email"]', 'test@example.com');
await this.hybridSelectOption(taskId, 'State dropdown', 'select[name="state"]', ['CA']);
```

### Example Usage in Progressive Agent

```typescript
// Navigate to Progressive homepage
await this.hybridNavigate(taskId, 'https://www.progressive.com/');

// Click auto insurance link
await this.hybridClick(taskId, 'Auto insurance link', 'a[href*="auto"]');

// Fill ZIP code
await this.hybridType(taskId, 'ZIP code field', 'input[name="zipCode"]', userData.zipCode);

// Take screenshot for debugging
const screenshotPath = await this.mcpTakeScreenshot(taskId, 'progressive-step-1');

// Get page snapshot for analysis
const snapshot = await this.mcpSnapshot(taskId);
```

## MCP Server Setup (Optional)

If you want to run a separate MCP server for enhanced capabilities:

### Option 1: External MCP Server
```bash
# Install and run MCP server with npx (recommended)
npx @playwright/mcp@latest --port 8080
```

This will download the latest version of the Playwright MCP server and run it on port 8080.

### Option 2: Integrated MCP (Future)
The service can be extended to include an embedded MCP server for better integration.

## Benefits of MCP Integration

### 1. Enhanced Reliability
- Better error handling and recovery
- Automatic retry mechanisms
- Graceful degradation to Playwright

### 2. Improved Debugging
- Rich snapshots with accessibility information
- Better element identification
- Enhanced screenshot capabilities

### 3. Consistent Interface
- Standardized browser automation API
- Easier testing and development
- Better abstraction over Playwright details

### 4. Future-Proof
- Ready for advanced MCP features
- Extensible architecture
- Integration with AI-powered automation

## Troubleshooting

### MCP Connection Issues

If MCP fails to connect:
1. Check MCP server is running on configured port
2. Verify WebSocket URL is correct
3. System will automatically fallback to Playwright

### Performance Considerations

- MCP adds small overhead for WebSocket communication
- Fallback to Playwright is seamless
- Screenshots and snapshots are cached locally

### Debug Logging

Enable debug logging to see MCP operations:
```bash
DEBUG=true
VERBOSE_LOGGING=true
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Carrier       │    │  MCP Browser     │    │   MCP Server    │
│   Agents        │───▶│  Service         │───▶│  (Optional)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Playwright      │
                       │  (Fallback)      │
                       └──────────────────┘
```

## Testing

The MCP integration is automatically tested through:
- Unit tests for MCPBrowserService
- Integration tests with carrier agents  
- End-to-end tests with real browser automation

## Migration Guide

### From Direct Playwright

Replace direct Playwright calls:
```typescript
// Old
const page = await this.getBrowserPage(taskId);
await page.goto(url);
await page.locator(selector).click();

// New
await this.hybridNavigate(taskId, url);
await this.hybridClick(taskId, 'Button description', selector);
```

### Configuration Migration

Update your environment configuration:
```bash
# Add MCP settings
MCP_ENABLED=true
MCP_FALLBACK=true
```

## Future Enhancements

- AI-powered element detection
- Smart retry strategies
- Advanced screenshot analysis
- Integration with testing frameworks
- Performance monitoring and analytics 