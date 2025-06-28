import { browserManager } from '../browser/BrowserManager.js';
import { BrowserManager as IBrowserManager } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Page } from 'playwright';
import { config } from '../config.js';

export interface BrowserActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string;
  snapshot?: any;
}

/**
 * Thin wrapper around the shared `browserManager` that exposes the handful of
 * convenience helpers previously offered by `MCPBrowserService`. All remote
 * MCP-specific code has been removed – every call now executes directly inside
 * the local Playwright browser instance.
 */
export class BrowserActions {
  private fallbackBrowserManager: IBrowserManager;
  // Track the last successfully loaded URL per task so we can restore it if we
  // need to recycle a poisoned context.
  private lastUrl: Map<string, string> = new Map();

  constructor(manager: IBrowserManager = browserManager) {
    this.fallbackBrowserManager = manager;
  }

  /**
   * Public setter for the last known URL for a task. This is useful for
   * actions that don't trigger a standard `click` event but still cause
   * navigation (e.g., keyboard submissions).
   */
  public setLastUrl(taskId: string, url: string): void {
    this.lastUrl.set(taskId, url);
  }

  /**
   * Allows the application bootstrap to inject the already-configured
   * `browserManager` singleton. Kept for backwards-compatibility with existing
   * wiring in `server/src/index.ts`.
   */
  public setFallbackBrowserManager(manager: IBrowserManager) {
    this.fallbackBrowserManager = manager;
  }

  /**
   * Placeholder initialise method so callers don't have to change. We simply
   * ensure the underlying browser is launched.
   */
  public async initialize(): Promise<void> {
    if (typeof (this.fallbackBrowserManager as any).initialize === 'function') {
      // Best-effort: swallow errors so the app can continue starting up.
      try {
        await (this.fallbackBrowserManager as any).initialize();
      } catch (err) {
        console.warn('[BrowserActions] Browser manager failed to initialise:', err);
      }
    }
  }

  /** No-op – kept so existing shutdown hooks compile. */
  public async cleanup(): Promise<void> {
    // Nothing to do – browserManager owns the real resources
    return;
  }

  /**
   * Minimal status helper so legacy checks (`getStatus().mcpConnected`) resolve
   * to `false`.
   */
  public getStatus() {
    return {
      mcpConnected: false,
      fallbackAvailable: true,
    } as const;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Ensures the page for a given task is still operational.  If the page was
   * closed or throws on a simple call we assume the context is poisoned.  We
   * then dispose it and recreate a brand-new context so the caller can
   * continue transparently. */
  private async _ensureHealthyPage(taskId: string): Promise<Page> {
    try {
      const ctx = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const { page } = ctx;

      // Fast path – page open and a title() call succeeds
      if (!page.isClosed()) {
        await page.title();
        return page;
      }
      throw new Error('Page is closed');
    } catch (err) {
      console.warn('[BrowserActions] Detected poisoned context for', taskId, '– recycling…');
      // Force-cleanup and create a new context
      await this.fallbackBrowserManager.cleanupContext(taskId);
      const { page: newPage } = await this.fallbackBrowserManager.getBrowserContext(taskId);

      // Attempt to restore previous URL if we have one
      const url = this.lastUrl.get(taskId);
      if (url) {
        try {
          await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        } catch (navErr) {
          console.warn('[BrowserActions] Failed to restore URL after context recycle:', navErr);
        }
      }
      return newPage;
    }
  }

  // ---------------------------------------------------------------------------
  // Core helpers – direct Playwright implementations
  // ---------------------------------------------------------------------------

  public async navigate(taskId: string, url: string): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      });
      this.lastUrl.set(taskId, page.url());
      return { success: true, data: { url: page.url() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Navigation failed' };
    }
  }

  public async click(taskId: string, element: string, ref: string): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      const selector = ref.startsWith('e') ? `[data-testid="${ref}"]` : ref;
      await page.locator(selector).first().click();
      // Record the current URL after the click so we can restore it if the
      // context becomes poisoned later on. We purposefully grab the URL *after*
      // the click in case the action triggered a navigation.
      this.lastUrl.set(taskId, page.url());
      return { success: true, data: { clicked: element } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Click failed' };
    }
  }

  /**
   * OPTIMIZED: Fast click method for performance-critical buttons
   * Uses shorter timeouts and no waiting for network idle states
   */
  public async fastClick(taskId: string, element: string, selector: string): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      
      // Use shorter timeout for faster failure
      const locator = page.locator(selector).first();
      await locator.click({ timeout: 800 }); // Reduced from default 30s
      
      // Record URL immediately without waiting
      this.lastUrl.set(taskId, page.url());
      
      return { success: true, data: { clicked: element } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Fast click failed' };
    }
  }

  public async type(
    taskId: string,
    element: string,
    selector: string,
    text: string,
    options?: { slowly?: boolean; submit?: boolean },
  ): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      const locator = page.locator(selector).first();
      await locator.fill(text);

      if (options?.slowly) {
        // Optionally type one char at a time – useful for inputs with onKeyPress
        await locator.fill('');
        for (const char of text) {
          await locator.type(char);
        }
      }

      if (options?.submit) {
        await page.keyboard.press('Enter');
      }
      this.lastUrl.set(taskId, page.url());
      return { success: true, data: { typed: element } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Type failed' };
    }
  }

  public async selectOption(
    taskId: string,
    element: string,
    selector: string,
    values: string[],
  ): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      await page.locator(selector).first().selectOption(values);
      this.lastUrl.set(taskId, page.url());
      return { success: true, data: { selected: values } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Select option failed' };
    }
  }

  public async snapshot(taskId: string): Promise<BrowserActionResponse> {
    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      // Collect high-level document info
      const url = page.url();
      const title = await page.title();

      /*
       * Extract a *minimal* representation of all interactive elements on the
       * page (inputs, selects, buttons, anchors).  We purposefully avoid
       * serialising large text content or child nodes – only attributes that
       * assist with selector generation / matching are required by
       * `BaseCarrierAgent.discoverFields()`.
       */
      const elements = await page.evaluate(() => {
        const allowedTags = ['input', 'select', 'textarea', 'button', 'a'];

        const serializeEl = (el: any, idx: number) => {
          const attrs: Record<string, string> = {};
          if (el && typeof el.getAttributeNames === 'function') {
            for (const attr of el.getAttributeNames()) {
              const value = el.getAttribute(attr);
              if (value !== null) {
                attrs[attr] = value;
              }
            }
          }

          const fallbackRef = `e${idx}`;

          return {
            tag: (el.tagName || '').toLowerCase(),
            text: (el.innerText || '').trim(),
            attributes: attrs,
            ref: attrs['data-testid'] || attrs['id'] || fallbackRef,
          };
        };

        const doc = (globalThis as any).document;
        if (!doc) return [];

        const nodeList = Array.from(doc.querySelectorAll(allowedTags.join(',')));
        return nodeList.slice(0, 2000).map((el, idx) => serializeEl(el, idx));
      });

      return {
        success: true,
        snapshot: {
          url,
          title,
          timestamp: new Date().toISOString(),
          elements,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Snapshot failed' };
    }
  }

  public async waitFor(
    taskId: string,
    options: { text?: string; textGone?: string; time?: number },
  ): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      if (options.time) {
        await page.waitForTimeout(options.time * 1000);
      } else if (options.text) {
        await page.waitForSelector(`text=${options.text}`, { timeout: 30_000 });
      } else if (options.textGone) {
        await page.waitForSelector(`text=${options.textGone}`, { state: 'hidden', timeout: 30_000 });
      }
      return { success: true, data: { waited: true } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Wait failed' };
    }
  }

  public async takeScreenshot(taskId: string, filename?: string): Promise<BrowserActionResponse> {
    try {
      const page = await this._ensureHealthyPage(taskId);
      const dir = path.join(config.screenshotsDir, taskId);
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, filename || `manual-${Date.now()}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      return { success: true, screenshot: filePath };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Screenshot failed' };
    }
  }

  public async extractText(taskId: string, selector: string): Promise<BrowserActionResponse> {
    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const text = await page.locator(selector).first().innerText();
      return { success: true, data: { text } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Extract text failed' };
    }
  }

  // Stub for legacy cleanup call – does nothing
  public async cleanupSession(_taskId: string): Promise<void> {
    return;
  }
}

// Export a shared singleton so callers don't accidentally create their own
export const browserActions = new BrowserActions(); 