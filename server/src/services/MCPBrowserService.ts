import { WebSocket } from 'ws';
import { Page } from 'playwright';
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
  private mcpConnection: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private fallbackBrowserManager: BrowserManager | null = null;

  constructor(fallbackBrowserManager?: BrowserManager) {
    this.fallbackBrowserManager = fallbackBrowserManager || null;
  }

  async initialize(mcpServerUrl?: string): Promise<void> {
    if (mcpServerUrl) {
      try {
        await this.connectToMCP(mcpServerUrl);
        console.log('MCP Browser Service initialized with MCP server');
      } catch (error) {
        console.warn('Failed to connect to MCP server, falling back to direct Playwright:', error);
        this.mcpConnection = null;
      }
    } else {
      console.log('MCP Browser Service initialized with direct Playwright fallback');
    }
  }

  private async connectToMCP(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mcpConnection = new WebSocket(serverUrl);

      this.mcpConnection.on('open', () => {
        console.log('Connected to MCP server');
        resolve();
      });

      this.mcpConnection.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          const request = this.pendingRequests.get(response.id);
          if (request) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              request.reject(new Error(response.error));
            } else {
              request.resolve(response.result);
            }
          }
        } catch (error) {
          console.error('Error parsing MCP response:', error);
        }
      });

      this.mcpConnection.on('error', (error) => {
        console.error('MCP connection error:', error);
        reject(error);
      });

      this.mcpConnection.on('close', () => {
        console.log('MCP connection closed');
        this.mcpConnection = null;
      });
    });
  }

  async navigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_navigate', { url });
    }
    return this.fallbackNavigate(taskId, url);
  }

  async click(taskId: string, element: string, ref: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_click', { element, ref });
    }
    return this.fallbackClick(taskId, element, ref);
  }

  async type(taskId: string, element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_type', { element, ref, text, ...options });
    }
    return this.fallbackType(taskId, element, ref, text, options);
  }

  async selectOption(taskId: string, element: string, ref: string, values: string[]): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_select_option', { element, ref, values });
    }
    return this.fallbackSelectOption(taskId, element, ref, values);
  }

  async snapshot(taskId: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_snapshot', { random_string: 'snapshot' });
    }
    return this.fallbackSnapshot(taskId);
  }

  async waitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_wait_for', options);
    }
    return this.fallbackWaitFor(taskId, options);
  }

  async takeScreenshot(taskId: string, filename?: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('mcp_playwright_browser_take_screenshot', { filename });
    }
    return this.fallbackTakeScreenshot(taskId, filename);
  }

  async extractText(taskId: string, selector: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      // MCP doesn't have direct text extraction, so we'll use snapshot and parse
      const snapshot = await this.snapshot(taskId);
      return snapshot;
    }
    return this.fallbackExtractText(taskId, selector);
  }

  private async sendMCPRequest(method: string, params: any): Promise<MCPBrowserResponse> {
    if (!this.mcpConnection) {
      throw new Error('MCP connection not available');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.mcpConnection!.send(JSON.stringify(request));
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    }).then((result: any) => ({
      success: true,
      data: result,
    })).catch((error: Error) => ({
      success: false,
      error: error.message,
    }));
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
      // Use ref as CSS selector or fallback to element description
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
          content: content.substring(0, 5000), // Truncate for performance
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
    if (this.mcpConnection) {
      this.mcpConnection.close();
      this.mcpConnection = null;
    }
    this.pendingRequests.clear();
  }

  getStatus() {
    return {
      mcpConnected: !!this.mcpConnection,
      pendingRequests: this.pendingRequests.size,
      fallbackAvailable: !!this.fallbackBrowserManager,
    };
  }
}

// Export singleton instance
export const mcpBrowserService = new MCPBrowserService(); 