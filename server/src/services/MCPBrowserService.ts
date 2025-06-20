import { EventSource } from 'eventsource';
import { Page } from 'playwright';
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
  private mcpConnection: EventSource | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private fallbackBrowserManager: BrowserManager | null = null;
  private taskSessions = new Map<string, string>();

  constructor(fallbackBrowserManager?: BrowserManager) {
    this.fallbackBrowserManager = fallbackBrowserManager || null;
  }

  async initialize(mcpServerUrl?: string): Promise<void> {
    const serverUrl = mcpServerUrl || 'http://localhost:8080/sse';
    try {
      await this.connectToMCP(serverUrl);
      console.log('[1] MCP Browser Service initialized with MCP server');
    } catch (error) {
      console.warn('[1] MCP server not available, falling back to direct Playwright:', error instanceof Error ? error.message : error);
    }
    console.log('[1] MCP Browser Service initialized successfully');
  }

  private async connectToMCP(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mcpConnection = new EventSource(serverUrl);

      this.mcpConnection.onopen = () => {
        console.log('Connected to MCP server via SSE');
        resolve();
      };

      this.mcpConnection.onmessage = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);
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
      };

      this.mcpConnection.onerror = (error: Event) => {
        console.error('MCP connection error:', error);
        if (!this.mcpConnection || this.mcpConnection.readyState === EventSource.CLOSED) {
           reject(error);
        }
      };
    });
  }

  async navigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      try {
        // Ensure browser tab exists  
        let tabInfo = this.getTabInfo(taskId);
        if (!tabInfo) {
          tabInfo = await this.createSession(taskId);
          if (!tabInfo) {
            throw new Error('Failed to create MCP browser tab');
          }
        }
        
        return await this.sendMCPRequest('browser_navigate', { 
          url
        });
      } catch (error) {
        console.warn(`[MCP] Navigation failed, using fallback: ${error}`);
        return await this.fallbackNavigate(taskId, url);
      }
    }
    return this.fallbackNavigate(taskId, url);
  }

  async click(taskId: string, element: string, ref: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      try {
        // Browser tab should already exist from navigate
        const tabInfo = this.getTabInfo(taskId);
        if (!tabInfo) {
          throw new Error('No MCP browser tab available');
        }
        
        return await this.sendMCPRequest('browser_click', { element, ref });
      } catch (error) {
        console.warn(`[MCP] Click failed, using fallback: ${error}`);
        return await this.fallbackClick(taskId, element, ref);
      }
    }
    return this.fallbackClick(taskId, element, ref);
  }

  async type(taskId: string, element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      try {
        const tabInfo = this.getTabInfo(taskId);
        if (!tabInfo) {
          throw new Error('No MCP browser tab available');
        }
        
        return await this.sendMCPRequest('browser_type', { element, ref, text, ...options });
      } catch (error) {
        console.warn(`[MCP] Type failed, using fallback: ${error}`);
        return await this.fallbackType(taskId, element, ref, text, options);
      }
    }
    return this.fallbackType(taskId, element, ref, text, options);
  }

  async selectOption(taskId: string, element: string, ref: string, values: string[]): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('browser_select_option', { element, ref, values });
    }
    return this.fallbackSelectOption(taskId, element, ref, values);
  }

  async snapshot(taskId: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('browser_snapshot', { random_string: 'snapshot' });
    }
    return this.fallbackSnapshot(taskId);
  }

  async waitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('browser_wait_for', options);
    }
    return this.fallbackWaitFor(taskId, options);
  }

  async takeScreenshot(taskId: string, filename?: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
      return this.sendMCPRequest('browser_take_screenshot', { filename });
    }
    return this.fallbackTakeScreenshot(taskId, filename);
  }

  async extractText(taskId: string, selector: string): Promise<MCPBrowserResponse> {
    if (this.mcpConnection) {
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
      
      this.sendHttpRequest(id, method, params).catch(reject);

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

  private async sendHttpRequest(id: number, method: string, params: any): Promise<void> {
    const serverUrl = this.mcpConnection?.url.replace('/sse', '');
    if (!serverUrl) {
      throw new Error("MCP Server URL not available");
    }

    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };
    
    try {
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }
    } catch (error) {
       console.error('Error sending MCP HTTP request:', error);
       const pending = this.pendingRequests.get(id);
       if (pending) {
         this.pendingRequests.delete(id);
         pending.reject(error);
       }
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
    if (this.mcpConnection) {
      this.mcpConnection.close();
      this.mcpConnection = null;
    }
    if (this.fallbackBrowserManager) {
      await this.fallbackBrowserManager.cleanup();
    }
    // Clear any pending requests on cleanup
    this.pendingRequests.forEach(p => p.reject(new Error('MCP service shutting down')));
    this.pendingRequests.clear();
  }

  getStatus() {
    return {
      mcpConnected: !!this.mcpConnection,
      pendingRequests: this.pendingRequests.size,
      fallbackAvailable: !!this.fallbackBrowserManager,
    };
  }

  async createSession(taskId: string): Promise<string | null> {
    try {
      console.log(`Creating MCP browser tab for task: ${taskId}`);
      const result = await this.sendMCPRequest('browser_tab_new', {});
      if (result.success && result.data?.index !== undefined) {
        const tabIndex = result.data.index;
        this.taskSessions.set(taskId, `tab_${tabIndex}`);
        console.log(`✅ MCP browser tab created: tab_${tabIndex} for task: ${taskId}`);
        return `tab_${tabIndex}`;
      }
    } catch (error) {
      console.warn(`❌ Failed to create MCP browser tab for task ${taskId}:`, error);
    }
    return null;
  }

  private getTabInfo(taskId: string): string | null {
    return this.taskSessions.get(taskId) || null;
  }

  async cleanupSession(taskId: string): Promise<void> {
    const tabInfo = this.taskSessions.get(taskId);
    if (tabInfo) {
      try {
        // Extract tab index from tab info
        const tabIndex = parseInt(tabInfo.replace('tab_', ''));
        await this.sendMCPRequest('browser_tab_close', { index: tabIndex });
        console.log(`✅ MCP browser tab cleaned up: ${tabInfo}`);
      } catch (error) {
        console.warn(`❌ Failed to cleanup MCP browser tab ${tabInfo}:`, error);
      } finally {
        this.taskSessions.delete(taskId);
      }
    }
  }
}

// Export singleton instance
export const mcpBrowserService = new MCPBrowserService(); 