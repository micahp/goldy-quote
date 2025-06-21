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
  private globalSessionId: string | null = null; // for creating new tabs
  private taskSessions: Map<string, string> = new Map(); // taskId -> sessionId
  private connectionRetries = 0;
  private maxRetries = 3;

  constructor(fallbackBrowserManager?: BrowserManager) {
    this.fallbackBrowserManager = fallbackBrowserManager || null;
  }

  /**
   * Inject / replace the BrowserManager used for local Playwright fallbacks.
   * This is primarily used by the application bootstrap code so it can pass
   * the already-configured singleton `browserManager` to the pre-created
   * `mcpBrowserService` instance.  Without this step `fallbackNavigate` (and
   * friends) would early-exit with “No browser manager available” resulting
   * in pages never leaving about:blank.
   */
  public setFallbackBrowserManager(manager: BrowserManager) {
    this.fallbackBrowserManager = manager;
  }
  
  async initialize(mcpServerUrl?: string): Promise<void> {
    /**
     * When a server URL is supplied we attempt to establish an SSE connection to the
     * remote MCP automation service. If no URL is provided (which will be the new
     * default behaviour) we immediately fall back to the built-in Playwright
     * implementation – effectively disabling MCP without requiring further changes
     * to the calling code.
     */

    if (mcpServerUrl) {
      this.mcpServerUrl = mcpServerUrl;

      try {
        await this.initializeSSEConnection();
        console.log('[MCP] Browser Service initialised with SSE connection');
      } catch (error) {
        console.warn('[MCP] Remote server not available, falling back to direct Playwright:', error instanceof Error ? error.message : error);
        this.mcpServerUrl = null;
      }
    } else {
      // Explicitly disable MCP and rely solely on Playwright.
      this.mcpServerUrl = null;
      console.log('[MCP] MCP disabled – using direct Playwright only');
    }

    console.log('[MCP] Browser Service initialised successfully');
  }

  private async initializeSSEConnection(): Promise<void> {
    if (!this.mcpServerUrl) throw new Error('No MCP server URL');
    
    return new Promise((resolve, reject) => {
      try {
        this.sseConnection = new EventSource(this.mcpServerUrl!);
        
        this.sseConnection.onopen = async () => {
          console.log('Connected to MCP server via SSE');
          this.connectionRetries = 0;
          console.log('[MCP] Connected, waiting for server to provide global session ID...');
          resolve();
        };
        
        this.sseConnection.onmessage = (event) => {
          try {
            if (event.type === 'message' && event.data.includes('sessionId=')) {
              const match = event.data.match(/sessionId=([^&\s]+)/);
              if (match && !this.globalSessionId) {
                this.globalSessionId = match[1];
                console.log('[MCP] Global Session ID received:', this.globalSessionId);
                this.initializeBrowserSession();
              }
            } else {
                 console.log('[MCP] Received SSE data:', event.data);
            }
          } catch (error) {
            console.warn('[MCP] Failed to process SSE message:', error);
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
    try {
      const result = await this.sendSSECommand('browser_install', {}, null);
      console.log('[MCP] Browser installation result:', result.success);
    } catch (error) {
      console.warn('[MCP] Browser install failed:', error);
    }
  }

  private getSessionIdForTask(taskId: string | null): string | null {
      if (taskId) {
          return this.taskSessions.get(taskId) || null;
      }
      return this.globalSessionId;
  }

  private async sendSSECommand(method: string, params: any, taskId: string | null): Promise<MCPBrowserResponse> {
    if (!this.mcpServerUrl) {
      throw new Error('MCP server URL not available');
    }

    const sessionId = this.getSessionIdForTask(taskId);

    // Creating a new tab is a special case that uses the global session
    const sessionForUrl = method === 'browser_tab_new' ? this.globalSessionId : sessionId;

    if (!sessionForUrl) {
      throw new Error(`MCP command '${method}' requires a session ID, but none was available for task '${taskId}' (global session: ${this.globalSessionId})`);
    }

    const baseHttpUrl = this.mcpServerUrl.replace('/sse', '');
    const httpUrl = `${baseHttpUrl}?sessionId=${sessionForUrl}`;
    const id = ++this.requestId;
    
    console.log(`[MCP] Sending command: ${method}, TaskID: ${taskId}, SessionID: ${sessionForUrl}`);

    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    try {
      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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

      return { success: true, data: result.result };
    } catch (error) {
      console.error(`[MCP] Error sending command ${method} for task ${taskId}:`, error);
      throw error;
    }
  }
  
  async createSession(taskId: string): Promise<string | null> {
    console.log(`[MCP] Creating new tab session for task: ${taskId}`);
    if (!this.globalSessionId) {
        console.error(`[MCP] Cannot create new tab session for ${taskId}, global session ID not available.`);
        return null;
    }
    try {
      const response = await this.sendSSECommand('browser_tab_new', {}, null); // uses global session
      if (response.success && typeof response.data === 'string') {
        const newSessionId = response.data;
        this.taskSessions.set(taskId, newSessionId);
        console.log(`[MCP] New tab session created for task ${taskId}: ${newSessionId}`);
        return newSessionId;
      }
      console.error(`[MCP] Failed to create new tab session for task ${taskId}. Response:`, response);
      return null;
    } catch (error) {
      console.error(`[MCP] Error creating tab session for task ${taskId}:`, error);
      return null;
    }
  }

  async cleanupSession(taskId: string): Promise<void> {
    const sessionId = this.taskSessions.get(taskId);
    if (sessionId) {
      console.log(`[MCP] Cleaning up session for task ${taskId}: ${sessionId}`);
      try {
        await this.sendSSECommand('browser_tab_close', {}, taskId);
        this.taskSessions.delete(taskId);
      } catch (error) {
        console.error(`[MCP] Error closing session for task ${taskId}:`, error);
      }
    }
  }

  // Wrapper methods for browser actions
  async navigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_navigate', { url }, taskId);
      } catch (error) {
        console.warn(`[MCP] Navigation failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackNavigate(taskId, url);
  }

  async click(taskId: string, element: string, selector: string): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_click', { element, ref: selector }, taskId);
      } catch (error) {
        console.warn(`[MCP] Click failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackClick(taskId, element, selector);
  }

  async type(taskId: string, element: string, selector: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<MCPBrowserResponse> {
      if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
          try {
              return await this.sendSSECommand('browser_type', { element, ref: selector, text, ...options }, taskId);
          } catch (error) {
              console.warn(`[MCP] Type failed for ${taskId}, using fallback: ${error}`);
              // Fallthrough to local implementation
          }
      }
      return this.fallbackType(taskId, element, selector, text, options);
  }
  
  async selectOption(taskId: string, element: string, selector: string, values: string[]): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_select_option', { element, ref: selector, values }, taskId);
      } catch (error) {
        console.warn(`[MCP] Select Option failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackSelectOption(taskId, element, selector, values);
  }

  async snapshot(taskId: string): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_snapshot', {}, taskId);
      } catch (error) {
        console.warn(`[MCP] Snapshot failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackSnapshot(taskId);
  }

  async waitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_wait', options, taskId);
      } catch (error) {
        console.warn(`[MCP] Wait failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackWaitFor(taskId, options);
  }

  async takeScreenshot(taskId: string, filename?: string): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_take_screenshot', { filename }, taskId);
      } catch (error) {
        console.warn(`[MCP] Screenshot failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackTakeScreenshot(taskId, filename);
  }

  async extractText(taskId: string, selector: string): Promise<MCPBrowserResponse> {
    if (this.taskSessions.has(taskId) && this.mcpServerUrl) {
      try {
        return await this.sendSSECommand('browser_extract_text', { selector }, taskId);
      } catch (error) {
        console.warn(`[MCP] Extract text failed for ${taskId}, using fallback: ${error}`);
        // Fallthrough to local implementation
      }
    }
    return this.fallbackExtractText(taskId, selector);
  }

  // Fallback methods using direct Playwright
  private async fallbackNavigate(taskId: string, url: string): Promise<MCPBrowserResponse> {
    if (!this.fallbackBrowserManager) {
      return { success: false, error: 'No browser manager available' };
    }

    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);

      /*
       * Using `networkidle` can be overly-strict for modern marketing-heavy sites
       * (there is often at least one analytics or tracking request that holds
       * the network open indefinitely).  This results in Playwright timing-out
       * and the page never leaving `about:blank`, even though the main
       * document was already delivered.  Swapping to `domcontentloaded` gives
       * us a reliable signal that the initial HTML is ready without waiting
       * for every tracking pixel to settle.
       */
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000, // 60s – overridable via BrowserManager config if needed
      });

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

  getStatus() {
    return {
      mcpConnected: this.sseConnection?.readyState === EventSource.OPEN,
      globalSessionId: this.globalSessionId,
      taskSessions: Object.fromEntries(this.taskSessions),
      serverUrl: this.mcpServerUrl,
      fallbackAvailable: !!this.fallbackBrowserManager,
    };
  }

  /**
   * Gracefully dispose of any open resources (SSE connections, cached sessions
   * etc.).  This is primarily invoked during process shutdown so we don’t
   * leave hanging network connections that might prevent a clean exit.
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.sseConnection) {
        console.log('[MCP] Closing SSE connection');
        this.sseConnection.close();
        this.sseConnection = null;
      }
      this.taskSessions.clear();
    } catch (err) {
      console.warn('[MCP] Error during cleanup:', err);
    }
  }
  
  // ... rest of the file ...
}

// Export singleton instance
export const mcpBrowserService = new MCPBrowserService(); 