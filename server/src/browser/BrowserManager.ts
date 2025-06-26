import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { config } from '../config.js';
import { BrowserManager as IBrowserManager } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

const SESSION_STATE_DIR = './session-states';
const SESSION_TTL_HOURS = 24;

export class BrowserManager implements IBrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, { context: BrowserContext; page: Page }> = new Map();
  private initPromise: Promise<void> | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

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
        // executablePath: '/Users/micah/Downloads/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        channel: 'chrome',
        headless: false,
        // Enhanced stealth args - hide automation and match real browser behavior
        args: [
          '--disable-http2',
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
          // Additional stealth arguments
          '--disable-blink-features=AutomationControlled',
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
      });

      console.log('Browser launched successfully');

      // Start periodic cleanup of old session files
      this.cleanupInterval = setInterval(() => this.cleanupOldSessions(), 60 * 60 * 1000); // Every hour
      this.cleanupOldSessions(); // Initial cleanup

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
      const sessionStatePath = path.join(SESSION_STATE_DIR, `${taskId}-state.json`);
      
      const contextOptions: any = {
        viewport: { width: 1280, height: 720 },
        // Updated to match real Chrome 137 from HAR file
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: [],
        // Complete headers that match real browser behavior from HAR analysis
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
        },
        // Disable TLS/SSL errors – useful for local dev/self-signed certs.
        // Note: we *no longer* force HTTP/1.1; HTTP/2 remains enabled unless
        // DISABLE_HTTP2=1 is set at launch (see launch args above).
        ignoreHTTPSErrors: true,
      };

      // Try to load existing session state if available
      try {
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
        // Filter noisy console logs from carrier sites (analytics, tracking, etc.)
        page.on('console', (msg) => {
          if (config.nodeEnv !== 'development') return;

          const text = msg.text();
          const type = msg.type();

          // Ignore routine noise from analytics libraries and debug pings
          const ignorePatterns = [
            /Tealium/i,
            /LMIG/i, // Liberty Mutual internal logging
            /OneTrust/i,
            /Mouseflow/i,
            /_satellite/i,
            /__webpack_hmr/i,
            /progressive-direct/i,
          ];

          if (ignorePatterns.some((re) => re.test(text))) {
            return;
          }

          if (type === 'error' || type === 'warning') {
            console.log(`[Browser ${type}] ${text}`);
          }
        });

        page.on('pageerror', (error) => {
          console.error(`[Browser Error] ${error.message}`);
        });
      });

      const page = await context.newPage();
      
      // Remove automation detection markers and inject proper browser properties
      await page.addInitScript(() => {
        // Remove webdriver property
        delete (navigator as any).webdriver;
        
        // Override plugins to look like a real browser
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {
                type: "application/x-google-chrome-pdf",
                suffixes: "pdf",
                description: "Portable Document Format",
              },
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin",
            },
            {
              0: {
                type: "application/pdf",
                suffixes: "pdf",
                description: "",
              },
              description: "",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer",
            },
            {
              0: {
                type: "application/x-nacl",
                suffixes: "",
                description: "Native Client Executable",
              },
              1: {
                type: "application/x-pnacl",
                suffixes: "",
                description: "Portable Native Client Executable",
              },
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

        // Override permissions to look normal
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission, name: 'notifications', onchange: null } as any) :
            originalQuery(parameters)
        );

        // Override chrome runtime to look like real Chrome
        (window as any).chrome = {
          runtime: {
            onConnect: undefined,
            onMessage: undefined,
          },
          loadTimes: () => ({}),
          csi: () => ({}),
        };

        // Override screen properties to look normal
        Object.defineProperty(window.screen, 'colorDepth', {
          get: () => 24,
        });
        
        Object.defineProperty(window.screen, 'pixelDepth', {
          get: () => 24,
        });
      });
      
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
      // Create session-states directory if it doesn't exist
      await fs.mkdir(SESSION_STATE_DIR, { recursive: true });

      const sessionStatePath = path.join(SESSION_STATE_DIR, `${taskId}-state.json`);
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

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.initPromise = null;
  }

  async cleanupOldSessions(): Promise<void> {
    console.log('Running cleanup for old session files...');
    try {
      await fs.mkdir(SESSION_STATE_DIR, { recursive: true });
      const files = await fs.readdir(SESSION_STATE_DIR);
      const now = Date.now();
      const ttl = SESSION_TTL_HOURS * 60 * 60 * 1000;

      for (const file of files) {
        if (path.extname(file) !== '.json') continue;

        const filePath = path.join(SESSION_STATE_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > ttl) {
          console.log(`Deleting stale session file: ${filePath}`);
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Error during old session cleanup:', error);
    }
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