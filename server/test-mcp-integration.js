#!/usr/bin/env node

// Simple test script to verify MCP integration
import { mcpBrowserService } from './dist/services/MCPBrowserService.js';
import { browserManager } from './dist/browser/BrowserManager.js';

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Browser Integration...\n');
  
  const testTaskId = 'test-mcp-' + Date.now();
  
  try {
    // Initialize MCP service (will fallback to Playwright if no MCP server)
    console.log('1. Initializing MCP service...');
    await mcpBrowserService.initialize();
    console.log('✅ MCP service initialized\n');
    
    // Test navigation
    console.log('2. Testing navigation...');
    const navResult = await mcpBrowserService.navigate(testTaskId, 'https://httpbin.org/html');
    console.log(`Navigation result: ${navResult.success ? '✅ Success' : '❌ Failed'}`);
    if (!navResult.success) {
      console.log(`Error: ${navResult.error}`);
    }
    console.log('');
    
    // Test snapshot
    console.log('3. Testing snapshot...');
    const snapshotResult = await mcpBrowserService.snapshot(testTaskId);
    console.log(`Snapshot result: ${snapshotResult.success ? '✅ Success' : '❌ Failed'}`);
    if (snapshotResult.success && snapshotResult.snapshot) {
      console.log(`Snapshot URL: ${snapshotResult.snapshot.url}`);
      console.log(`Snapshot title: ${snapshotResult.snapshot.title}`);
    }
    console.log('');
    
    // Test screenshot
    console.log('4. Testing screenshot...');
    const screenshotResult = await mcpBrowserService.takeScreenshot(testTaskId, 'mcp-test.png');
    console.log(`Screenshot result: ${screenshotResult.success ? '✅ Success' : '❌ Failed'}`);
    if (screenshotResult.success) {
      console.log(`Screenshot saved: ${screenshotResult.data?.screenshot}`);
    }
    console.log('');
    
    // Get service status
    console.log('5. Service status:');
    const status = mcpBrowserService.getStatus();
    console.log(`MCP Connected: ${status.mcpConnected ? '✅ Yes' : '❌ No'}`);
    console.log(`Fallback Available: ${status.fallbackAvailable ? '✅ Yes' : '❌ No'}`);
    console.log(`Pending Requests: ${status.pendingRequests}`);
    console.log('');
    
    console.log('🎉 MCP Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n6. Cleaning up...');
    await browserManager.closePage(testTaskId);
    await mcpBrowserService.cleanup();
    await browserManager.cleanup();
    console.log('✅ Cleanup complete');
  }
}

// Run the test
testMCPIntegration().catch(console.error); 