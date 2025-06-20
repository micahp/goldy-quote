import { EventSource } from 'eventsource';
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
  private sseConnection: EventSource | null = null;
  private mcpServerUrl: string | null = null;
  private fallbackBrowserManager: BrowserManager | null = null;
  private requestId = 0;
  private sessionId: string | null = null;
  private connectionRetries = 0;
  private maxRetries = 3;

  constructor(fallbackBrowserManager?: BrowserManager) {
    this.fallbackBrowserManager = fallbackBrowserManager || null;
  }

  async initialize(mcpServerUrl?: string): Promise<void> {
    // Use SSE endpoint (not JSON-RPC which has session issues)
    this.mcpServerUrl = mcpServerUrl || 'http://localhost:8080/sse';
    
    try {
      await this.initializeSSEConnection();
      console.log('[1] MCP Browser Service initialized with SSE connection');
    } catch (error) {
      console.warn('[1] MCP server not available, falling back to direct Playwright:', error instanceof Error ? error.message : error);
      this.mcpServerUrl = null;
    }
    console.log('[1] MCP Browser Service initialized successfully');
  }

  private async initializeSSEConnection(): Promise<void> {
    if (!this.mcpServerUrl) throw new Error('No MCP server URL');
    
    return new Promise((resolve, reject) => {
      try {
        // Connect to SSE endpoint
        this.sseConnection = new EventSource(this.mcpServerUrl!);
        
        this.sseConnection.onopen = async () => {
          console.log('Connected to MCP server via SSE');
          this.connectionRetries = 0;
          
          // Create a manual session ID since Microsoft's MCP doesn't auto-provide one
          this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('[MCP] Generated session ID:', this.sessionId);
          
          // Initialize the browser in MCP if needed
          try {
            await this.initializeBrowserSession();
          } catch (error) {
            console.warn('[MCP] Browser session initialization failed:', error);
          }
          
          resolve();
        };
        
        this.sseConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[MCP] Received:', data);
            
            // Handle any session updates from the server
            if (data.result && data.result.sessionId) {
              this.sessionId = data.result.sessionId;
              console.log('[MCP] Session ID updated:', this.sessionId);
            }
          } catch (error) {
            console.warn('[MCP] Failed to parse SSE message:', error);
          }
        };
        
        this.sseConnection.onerror = (error) => {
          console.error('[MCP] SSE connection error:', error);
          this.sseConnection?.close();
          
          if (this.connectionRetries < this.maxRetries) {
            this.connectionRetries++;
            console.log(`[MCP] Retrying connection (${this.connectionRetries}/${this.maxRetries})...`);
            setTimeout(() => this.initializeSSEConnection(), 2000);
          } else {
            reject(new Error('Max connection retries exceeded'));
          }
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.sseConnection?.readyState !== EventSource.OPEN) {
            this.sseConnection?.close();
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private async initializeBrowserSession(): Promise<void> {
    // Try to initialize the browser in MCP
    try {
      const result = await this.sendSSECommand('browser_install', {});
      console.log('[MCP] Browser installation result:', result.success);
    } catch (error) {
      console.warn('[MCP] Browser install failed:', error);
    }
  }

  async navigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_navigate', { url });
      } catch (error) {
        console.warn(`[MCP] Navigation failed, using fallback: ${error}`);
        return await this.fallbackNavigate(taskId, url);
      }
    }
    return this.fallbackNavigate(taskId, url);
  }

  async click(taskId: string, element: string, ref: string): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_click', { element, ref });
      } catch (error) {
        console.warn(`[MCP] Click failed, using fallback: ${error}`);
        return await this.fallbackClick(taskId, element, ref);
      }
    }
    return this.fallbackClick(taskId, element, ref);
  }

  async type(taskId: string, element: string, ref: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_type', { element, ref, text, ...options });
      } catch (error) {
        console.warn(`[MCP] Type failed, using fallback: ${error}`);
        return await this.fallbackType(taskId, element, ref, text, options);
      }
    }
    return this.fallbackType(taskId, element, ref, text, options);
  }

  async selectOption(taskId: string, element: string, ref: string, values: string[]): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_select_option', { element, ref, values });
      } catch (error) {
        console.warn(`[MCP] Select failed, using fallback: ${error}`);
        return await this.fallbackSelectOption(taskId, element, ref, values);
      }
    }
    return this.fallbackSelectOption(taskId, element, ref, values);
  }

  async snapshot(taskId: string): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_snapshot', {});
      } catch (error) {
        console.warn(`[MCP] Snapshot failed, using fallback: ${error}`);
        return await this.fallbackSnapshot(taskId);
      }
    }
    return this.fallbackSnapshot(taskId);
  }

  async waitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_wait_for', options);
      } catch (error) {
        console.warn(`[MCP] Wait failed, using fallback: ${error}`);
        return await this.fallbackWaitFor(taskId, options);
      }
    }
    return this.fallbackWaitFor(taskId, options);
  }

  async takeScreenshot(taskId: string, filename?: string): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
      try {
        return await this.sendSSECommand('browser_take_screenshot', { filename });
      } catch (error) {
        console.warn(`[MCP] Screenshot failed, using fallback: ${error}`);
        return await this.fallbackTakeScreenshot(taskId, filename);
      }
    }
    return this.fallbackTakeScreenshot(taskId, filename);
  }

  async extractText(taskId: string, selector: string): Promise<MCPBrowserResponse> {
    if (this.sseConnection && this.sseConnection.readyState === EventSource.OPEN) {
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

  private async sendSSECommand(method: string, params: any): Promise<MCPBrowserResponse> {
    if (!this.mcpServerUrl) {
      throw new Error('MCP server URL not available');
    }

    // Convert SSE URL to HTTP POST URL (remove /sse)
    const httpUrl = this.mcpServerUrl.replace('/sse', '');
    const id = ++this.requestId;
    
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };
      
      // Include session ID if we have one (this fixes the sessionId issue)
      if (this.sessionId) {
        headers['Mcp-Session-Id'] = this.sessionId;
      }

      const response = await fetch(httpUrl, {
        method: 'POST',
        headers,
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
      console.error('Error sending MCP SSE command:', error);
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
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }
    
    if (this.fallbackBrowserManager) {
      await this.fallbackBrowserManager.cleanup();
    }
  }

  getStatus() {
    return {
      mcpConnected: this.sseConnection?.readyState === EventSource.OPEN,
      sessionId: this.sessionId,
      serverUrl: this.mcpServerUrl,
      fallbackAvailable: !!this.fallbackBrowserManager,
    };
  }

  async createSession(taskId: string): Promise<string | null> {
    // SSE connections maintain their own session via the EventSource
    return this.sessionId || taskId;
  }

  async cleanupSession(taskId: string): Promise<void> {
    // Session cleanup is handled by SSE connection close
  }
}

// Export singleton instance
export const mcpBrowserService = new MCPBrowserService(); 