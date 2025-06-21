import { browserManager } from '../browser/BrowserManager.js';
import { BrowserManager as IBrowserManager } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

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

  constructor(manager: IBrowserManager = browserManager) {
    this.fallbackBrowserManager = manager;
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
   * Placeholder initialise method so callers don’t have to change. We simply
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
  // Core helpers – direct Playwright implementations
  // ---------------------------------------------------------------------------

  public async navigate(taskId: string, url: string): Promise<BrowserActionResponse> {
    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      return { success: true, data: { url: page.url() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Navigation failed' };
    }
  }

  public async click(taskId: string, element: string, ref: string): Promise<BrowserActionResponse> {
    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const selector = ref.startsWith('e') ? `[data-testid="${ref}"]` : ref;
      await page.locator(selector).first().click();
      return { success: true, data: { clicked: element } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Click failed' };
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
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
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
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      await page.locator(selector).first().selectOption(values);
      return { success: true, data: { selected: values } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Select option failed' };
    }
  }

  public async snapshot(taskId: string): Promise<BrowserActionResponse> {
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

  public async waitFor(
    taskId: string,
    options: { text?: string; textGone?: string; time?: number },
  ): Promise<BrowserActionResponse> {
    try {
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
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
      const { page } = await this.fallbackBrowserManager.getBrowserContext(taskId);
      const screenshotsDir = './screenshots';
      await fs.mkdir(screenshotsDir, { recursive: true });
      const filePath = path.join(screenshotsDir, filename || `screenshot-${Date.now()}.png`);
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

// Export a shared singleton so callers don’t accidentally create their own
export const browserActions = new BrowserActions(); 