import fetch from 'node-fetch';
import { BrowserManager } from '../types/index.js';

export interface MCPBrowserAction {
  type: 'navigate' | 'click' | 'type' | 'select' | 'snapshot' | 'wait' | 'extract';
  params: Record<string, any>;
}

export interface MCPBrowserResponse {
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string;
  snapshot?: any;
}

export class MCPBrowserService {
  private mcpServerUrl: string | null = null;
  private requestId = 0;
  private fallbackBrowserManager: BrowserManager | null = null;
  private taskSessions = new Map<string, string>();

  constructor(fallbackBrowserManager?: BrowserManager) {
    this.fallbackBrowserManager = fallbackBrowserManager || null;
  }

  async initialize(mcpServerUrl?: string): Promise<void> {
    // Use JSON-RPC endpoint instead of SSE
    this.mcpServerUrl = mcpServerUrl?.replace('/sse', '/mcp') || 'http://localhost:8080/mcp';
    
    try {
      // Test the connection with a simple request
      await this.testConnection();
      console.log('[1] MCP Browser Service initialized with JSON-RPC server');
    } catch (error) {
      console.warn('[1] MCP server not available, falling back to direct Playwright:', error instanceof Error ? error.message : error);
      this.mcpServerUrl = null;
    }
    console.log('[1] MCP Browser Service initialized successfully');
  }

  private async testConnection(): Promise<void> {
    if (!this.mcpServerUrl) throw new Error('No MCP server URL');
    
    const response = await fetch(this.mcpServerUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'browser_install',
        params: {}
      }),
    });
    
    if (!response.ok) {
      throw new Error(`MCP server test failed: ${response.status}`);
    }
  }

  async navigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_navigate', { url });
      } catch (error) {
        console.warn(`[MCP] Navigation failed, using fallback: ${error}`);
        return await this.fallbackNavigate(taskId, url);
      }
    }
    return this.fallbackNavigate(taskId, url);
  }

  async click(taskId: string, element: string, ref: string): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_click', { element, ref });
      } catch (error) {
        console.warn(`[MCP] Click failed, using fallback: ${error}`);
        return await this.fallbackClick(taskId, element, ref);
      }
    }
    return this.fallbackClick(taskId, element, ref);
  }

  async type(taskId: string, element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_type', { element, ref, text, ...options });
      } catch (error) {
        console.warn(`[MCP] Type failed, using fallback: ${error}`);
        return await this.fallbackType(taskId, element, ref, text, options);
      }
    }
    return this.fallbackType(taskId, element, ref, text, options);
  }

  async selectOption(taskId: string, element: string, ref: string, values: string[]): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_select_option', { element, ref, values });
      } catch (error) {
        console.warn(`[MCP] Select failed, using fallback: ${error}`);
        return await this.fallbackSelectOption(taskId, element, ref, values);
      }
    }
    return this.fallbackSelectOption(taskId, element, ref, values);
  }

  async snapshot(taskId: string): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_snapshot', {});
      } catch (error) {
        console.warn(`[MCP] Snapshot failed, using fallback: ${error}`);
        return await this.fallbackSnapshot(taskId);
      }
    }
    return this.fallbackSnapshot(taskId);
  }

  async waitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_wait_for', options);
      } catch (error) {
        console.warn(`[MCP] Wait failed, using fallback: ${error}`);
        return await this.fallbackWaitFor(taskId, options);
      }
    }
    return this.fallbackWaitFor(taskId, options);
  }

  async takeScreenshot(taskId: string, filename?: string): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        return await this.sendJSONRPCRequest('browser_take_screenshot', { filename });
      } catch (error) {
        console.warn(`[MCP] Screenshot failed, using fallback: ${error}`);
        return await this.fallbackTakeScreenshot(taskId, filename);
      }
    }
    return this.fallbackTakeScreenshot(taskId, filename);
  }

  async extractText(taskId: string, selector: string): Promise<MCPBrowserResponse> {
    if (this.mcpServerUrl) {
      try {
        const snapshot = await this.snapshot(taskId);
        return snapshot;
      } catch (error) {
        console.warn(`[MCP] Extract text failed, using fallback: ${error}`);
        return await this.fallbackExtractText(taskId, selector);
      }
    }
    return this.fallbackExtractText(taskId, selector);
  }

  private async sendJSONRPCRequest(method: string, params: any): Promise<MCPBrowserResponse> {
    if (!this.mcpServerUrl) {
      throw new Error('MCP server URL not available');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    try {
      const response = await fetch(this.mcpServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      const result = await response.json() as any;
      
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message || result.error}`);
      }

      return {
        success: true,
        data: result.result,
      };
    } catch (error) {
      console.error('Error sending MCP JSON-RPC request:', error);
      throw error;
    }
  }

  // Fallback methods using direct Playwright
  private async fallbackNavigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      await page.goto(url, { waitUntil: 'networkidle' });
      return { success: true, data: { url: page.url() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Navigation failed' };
    }
  }

  private async fallbackClick(taskId: string, element: string, ref: string): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const selector = ref.startsWith('e') ? `[data-testid="${ref}"]` : ref;
      await page.locator(selector).first().click();
      return { success: true, data: { clicked: element } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Click failed' };
    }
  }

  private async fallbackType(taskId: string, element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const selector = ref.startsWith('e') ? `[data-testid="${ref}"]` : ref;
      const locator = page.locator(selector).first();
      
      if (options?.slowly) {
        await locator.type(text, { delay: 100 });
      } else {
        await locator.fill(text);
      }
      
      if (options?.submit) {
        await page.keyboard.press('Enter');
      }
      
      return { success: true, data: { typed: text } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Type failed' };
    }
  }

  private async fallbackSelectOption(taskId: string, element: string, ref: string, values: string[]): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const selector = ref.startsWith('e') ? `[data-testid="${ref}"]` : ref;
      await page.locator(selector).first().selectOption(values[0]);
      return { success: true, data: { selected: values[0] } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Select failed' };
    }
  }

  private async fallbackSnapshot(taskId: string): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const content = await page.content();
      const url = page.url();
      const title = await page.title();
      
      return {
        success: true,
        snapshot: {
          url,
          title,
          content: content.substring(0, 5000),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Snapshot failed' };
    }
  }

  private async fallbackWaitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      
      if (options.time) {
        await page.waitForTimeout(options.time * 1000);
      } else if (options.text) {
        await page.waitForSelector(`text=${options.text}`, { timeout: 30000 });
      } else if (options.textGone) {
        await page.waitForSelector(`text=${options.textGone}`, { state: 'hidden', timeout: 30000 });
      }
      
      return { success: true, data: { waited: true } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Wait failed' };
    }
  }

  private async fallbackTakeScreenshot(taskId: string, filename?: string): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const screenshotPath = filename || `screenshot-${taskId}-${Date.now()}.png`;
      await page.screenshot({ path: `screenshots/${screenshotPath}` });
      return { success: true, data: { screenshot: screenshotPath } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Screenshot failed' };
    }
  }

  private async fallbackExtractText(taskId: string, selector: string): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const text = await page.locator(selector).first().textContent();
      return { success: true, data: { text } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Text extraction failed' };
    }
  }

  async cleanup(): Promise<void> {
    this.mcpServerUrl = null;
    if (this.fallbackBrowserManager) {
      await this.fallbackBrowserManager.cleanup();
    }
  }

  getStatus() {
    return {
      mcpConnected: !!this.mcpServerUrl,
      serverUrl: this.mcpServerUrl,
    };
  }

  async createSession(taskId: string): Promise<string | null> {
    // JSON-RPC doesn't require explicit session creation
    // Each request is independent
    return taskId;
  }

  private getTabInfo(taskId: string): string | null {
    return this.taskSessions.get(taskId) || null;
  }

  async cleanupSession(taskId: string): Promise<void> {
    this.taskSessions.delete(taskId);
    
    if (this.mcpServerUrl) {
      try {
        await this.sendJSONRPCRequest('browser_close', {});
      } catch (error) {
        console.warn('Failed to close MCP browser session:', error);
      }
    }
  }
}

// Export singleton instance
export const mcpBrowserService = new MCPBrowserService(); 