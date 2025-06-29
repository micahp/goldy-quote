import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { config } from '../config.js';
import { BrowserManager as IBrowserManager } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import { broadcast } from '../websocket.js';

const SESSION_STATE_DIR = './session-states';
const SESSION_TTL_HOURS = 24;

// Helper to create filesystem-safe filenames from URLs
function sanitizeFileName(input: string): string {
  return input
    .replace(/https?:\/\//, '')       // remove protocol
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // replace illegal filename chars
    .slice(0, 120);                    // limit length to avoid OS limits
}

/**
 * Attach navigation listeners to a Playwright page that automatically take a
 * full-page screenshot every time the main frame commits a navigation.  The
 * screenshot is stored under <screenshotsDir>/<taskId>/ with a timestamp and
 * URL-derived filename for quick inspection.  A WebSocket `snapshot` event
 * is broadcast so the front-end can display progress in real-time.
 */
async function attachSnapshotListeners(page: Page, taskId: string) {
  let lastUrl = page.url();

  const capture = async (url: string) => {
    try {
      const dir = path.join(config.screenshotsDir, taskId);
      await fs.mkdir(dir, { recursive: true });
      const fileName = `${Date.now()}-${sanitizeFileName(url)}.png`;
      const filePath = path.join(dir, fileName);
      await page.screenshot({ path: filePath, fullPage: true });

      // Broadcast snapshot event (best-effort – ignore errors)
      broadcast?.({
        type: 'automation.snapshot',
        taskId,
        url,
        screenshot: fileName,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`[BrowserManager] Failed to capture navigation snapshot for ${taskId}:`, err);
    }
  };

  // Initial snapshot of blank/new page may not be useful, so we wait for the
  // first real navigation that changes the URL.
  page.on('framenavigated', (frame) => {
    if (frame.parentFrame() === null) {
      const newUrl = frame.url();
      if (newUrl && newUrl !== 'about:blank' && newUrl !== lastUrl) {
        lastUrl = newUrl;
        // Fire and forget – we don't await inside the event handler.
        capture(newUrl);
      }
    }
  });
}

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

    try {
      console.log('Launching Google Chrome via Playwright…');

      // Launch the locally installed Google Chrome while removing automation fingerprints.
      // `channel:"chrome"` ensures we use the system Chrome build instead of Playwright's bundled Chromium.
      this.browser = await chromium.launch({
        channel: 'chrome',
        headless: !config.headful, // respect HEADFUL=1 env
        args: [
          // Keeps navigator.webdriver undefined in modern Chrome.
          '--disable-blink-features=AutomationControlled',
        ],
        // Drop Playwright's automation extension / flag.
        ignoreDefaultArgs: ['--enable-automation'],
      });

      console.log(`Available contexts: ${this.browser.contexts().length}`);
      
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
      console.error('Failed to launch Chrome via Playwright:', error);
      this.browser = null;
      this.initPromise = null;
      throw error;
    }
  }

  async getBrowserContext(taskId: string): Promise<{ context: BrowserContext; page: Page }> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Browser not connected');
    }

    // DEBUG: Log existing contexts
    console.log(`[BrowserManager] Looking for context: ${taskId}`);
    console.log(`[BrowserManager] Existing contexts:`, Array.from(this.contexts.keys()));

    const existing = this.contexts.get(taskId);
    if (existing) {
      console.log(`[BrowserManager] Found existing context for: ${taskId}`);
      return existing;
    }

    console.log(`Creating isolated browser context for task: ${taskId}`);

    try {
      const context = await this.browser.newContext();

      // Remove navigator.webdriver and related properties before any site scripts run
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      const page = await context.newPage();

      // Automatically capture snapshots on navigation for this page and any
      // further pages spawned within the context.
      await attachSnapshotListeners(page, taskId);

      // Set up context event handlers for debugging (optional)
      context.on('page', (newPage) => {
        // Filter noisy console logs from carrier sites (analytics, tracking, etc.)
        newPage.on('console', (msg) => {
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

        newPage.on('pageerror', (error) => {
          console.error(`[Browser Error] ${error.message}`);
        });

        // Attach snapshot listeners to any additional pages opened by the site
        // (e.g., login pop-ups, redirect tabs).
        attachSnapshotListeners(newPage, taskId).catch(() => {/* ignored */});
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
      // Note: Don't close the context if it's the default context from the real browser
      // Only close if we created it ourselves
      const isDefaultContext = this.browser?.contexts()[0] === browserInfo.context;
      if (!isDefaultContext) {
        await browserInfo.context.close();
      }
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

    // Close all contexts we created
    for (const [taskId, { context, page }] of this.contexts) {
      try {
        await page.close();
        // Only close context if it's not the default context
        const isDefaultContext = this.browser?.contexts()[0] === context;
        if (!isDefaultContext) {
          await context.close();
        }
      } catch (error) {
        console.error(`Error closing context for task ${taskId}:`, error);
      }
    }
    this.contexts.clear();

    // Disconnect from browser (don't close it since it's the user's real browser)
    if (this.browser) {
      try {
        // Just disconnect, don't close the real browser
        await this.browser.close();
      } catch (error) {
        console.error('Error disconnecting from browser:', error);
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