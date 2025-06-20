import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { config } from '../config.js';
import { BrowserManager as IBrowserManager } from '../types/index.js';

export class BrowserManager implements IBrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, { context: BrowserContext; page: Page }> = new Map();
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    console.log('Launching Playwright browser...');
    
    try {
      this.browser = await chromium.launch({
        channel: 'chrome', // Use Google Chrome for Testing
        headless: !config.headful,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-web-security', // For testing
          '--disable-features=VizDisplayCompositor' // Stability improvement
        ],
        timeout: config.browserTimeout,
      });

      console.log('Browser launched successfully');

      // Handle browser disconnection
      this.browser.on('disconnected', () => {
        console.log('Browser disconnected, cleaning up...');
        this.browser = null;
        this.contexts.clear();
      });

    } catch (error) {
      console.error('Failed to launch browser:', error);
      this.browser = null;
      this.initPromise = null;
      throw error;
    }
  }

  async getBrowserContext(taskId: string): Promise<{ context: BrowserContext; page: Page }> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    // Return existing context if it exists
    const existing = this.contexts.get(taskId);
    if (existing) {
      return existing;
    }

    console.log(`Creating new browser context for task: ${taskId}`);

    try {
      // Check if we have stored session state for this task
      const sessionStatePath = `./session-states/${taskId}-state.json`;
      
      const contextOptions: any = {
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: [],
        // Enable stealth mode equivalent settings
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      };

      // Try to load existing session state if available
      try {
        const fs = await import('fs/promises');
        await fs.access(sessionStatePath);
        contextOptions.storageState = sessionStatePath;
        console.log(`Loading session state for task: ${taskId}`);
      } catch (error) {
        // No existing session state, continue with new context
        console.log(`Creating new session for task: ${taskId}`);
      }

      const context = await this.browser.newContext(contextOptions);

      // Set up context event handlers
      context.on('page', (page) => {
        page.on('console', (msg) => {
          if (config.nodeEnv === 'development') {
            console.log(`[Browser Console] ${msg.text()}`);
          }
        });

        page.on('pageerror', (error) => {
          console.error(`[Browser Error] ${error.message}`);
        });
      });

      const page = await context.newPage();
      
      // Set timeouts
      page.setDefaultTimeout(config.stepTimeout);
      page.setDefaultNavigationTimeout(config.browserTimeout);

      const browserInfo = { context, page };
      this.contexts.set(taskId, browserInfo);

      return browserInfo;

    } catch (error) {
      console.error(`Failed to create context for task ${taskId}:`, error);
      throw error;
    }
  }

  async saveSessionState(taskId: string): Promise<void> {
    const browserInfo = this.contexts.get(taskId);
    if (!browserInfo) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      
      // Create session-states directory if it doesn't exist
      try {
        await fs.mkdir('./session-states', { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const sessionStatePath = `./session-states/${taskId}-state.json`;
      await browserInfo.context.storageState({ path: sessionStatePath });
      console.log(`Session state saved for task: ${taskId}`);
    } catch (error) {
      console.error(`Error saving session state for task ${taskId}:`, error);
    }
  }

  async closePage(taskId: string): Promise<void> {
    const browserInfo = this.contexts.get(taskId);
    if (!browserInfo) {
      return;
    }

    console.log(`Closing page for task: ${taskId}`);

    try {
      // Save session state before closing
      await this.saveSessionState(taskId);
      
      await browserInfo.page.close();
      await browserInfo.context.close();
    } catch (error) {
      console.error(`Error closing page for task ${taskId}:`, error);
    } finally {
      this.contexts.delete(taskId);
    }
  }

  async cleanupContext(taskId: string): Promise<void> {
    await this.closePage(taskId);
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up browser manager...');

    // Close all contexts
    for (const [taskId, { context, page }] of this.contexts) {
      try {
        await page.close();
        await context.close();
      } catch (error) {
        console.error(`Error closing context for task ${taskId}:`, error);
      }
    }
    this.contexts.clear();

    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
    }

    this.initPromise = null;
  }

  // Get status information
  getStatus() {
    return {
      browserActive: !!this.browser,
      activeContexts: this.contexts.size,
      taskIds: Array.from(this.contexts.keys()),
    };
  }
}

// Singleton instance
export const browserManager = new BrowserManager();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up browser...');
  await browserManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, cleaning up browser...');
  await browserManager.cleanup();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await browserManager.cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  await browserManager.cleanup();
  process.exit(1);
}); 