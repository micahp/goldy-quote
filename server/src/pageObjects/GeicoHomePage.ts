import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';
import { BaseHomePage } from './BaseHomePage.js';

/**
 * GeicoHomePage implements a minimal Page-Object abstraction for the first screen
 * in the GEICO quote flow. The goal is to provide a strict locator contract so
 * agents interact with page elements through well-defined methods rather than
 * ad-hoc selectors sprinkled across the agent implementation.
 */
export class GeicoHomePage implements BaseHomePage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /* ------------------------------- Locators ------------------------------ */
  readonly zipInputSelector = '#ssp-service-zip';
  readonly zipInputLowerSelector = '#zip';
  readonly autoCardSelector = '[data-product="auto"]';
  readonly goButtonSelector = 'form#zip_service button';
  readonly startQuoteSelector = [
    'button:has-text("Start My Quote")',
    'a:has-text("Start My Quote")',
    'button:has-text("Start Quote")',
    'a:has-text("Start Quote")',
    'button:has-text("Get My Quote")',
    'a:has-text("Get My Quote")',
    'button:has-text("Get Quote")',
    'a:has-text("Get Quote")',
    'button:has-text("See My Quote")',
    'a:has-text("See My Quote")',
    'button[data-action="start-quote"]',
    'button.btn-primary[data-action="start-quote"]',
    'button.btn-primary',
    'a[data-modal-view="bundle_modal"]',
    'a[data-link-name*="Start My Quote"]',
  ].join(', ');
  readonly bundleModalZipSelector = '#bundle-modal-zip';
  readonly bundleModalContinueSelectors = [
    '#bundle_modal button:has-text("Continue")',
    '#bundle_modal input[type="submit"][value="Continue"]',
    '.modal--show button:has-text("Continue")',
    '.modal-container button:has-text("Continue")',
    'button:has-text("Continue")',
  ];

  /**
   * The GEICO homepage has gone through multiple A/B iterations. As of January 2025,
   * the current selector is input[name="user-zip"]. We keep a **priority ordered** 
   * list of selectors to make the automation resilient across redesigns.
   */
  private readonly zipSelectors = [
    'input[name="user-zip"]',    // Current 2025 selector (highest priority)
    'input.user-zip',            // Class-based variant
    'input[placeholder="ZIP Code"]', // Placeholder-based fallback
    'input[aria-label*="Update your location"]', // Aria-label fallback
    '#zip',                      // Legacy selector (may not exist)
    '#search-zip',               // Hidden-to-visible variant
    '#ssp-service-zip',          // 2024 legacy variant
    'input[name="zip"]',
    'input[name="zipCode"]',
    '[placeholder*="ZIP" i]',
    '[aria-label*="ZIP" i]',
  ];

  /* ------------------------------- Actions ------------------------------- */

  /**
   * Fill the ZIP input.  Iterates through the selector list until it finds the
   * first **visible** textbox, then types the provided ZIP.  Throws if none of
   * the selectors match within the timeout.
   */
  async enterZip(zip: string): Promise<void> {
    const timeoutPerSelector = TIMEOUTS.perSelector;
    for (const selector of this.zipSelectors) {
      const locator = this.page.locator(selector);
      try {
        await locator.waitFor({ state: 'visible', timeout: timeoutPerSelector });
        await locator.fill(zip);
        return; // success
      } catch {
        /* try next selector */
      }
    }
    throw new Error('Unable to locate visible ZIP code field on GEICO homepage');
  }

  /** Click the Auto product tile once it is attached to the DOM. */
  async selectAutoProduct(): Promise<void> {
    const autoCardLocator = this.page.locator(this.autoCardSelector).first();
    await autoCardLocator.waitFor({
      state: 'attached',
      timeout: TIMEOUTS.visibilityDefault,
    });
    await autoCardLocator.click();
  }

  /** Click the Go button that submits the ZIP form. */
  async clickGoAfterZip(): Promise<void> {
    await this.page.locator(this.goButtonSelector).click();
  }

  /** Wait for and click the "Start My Quote" call-to-action. */
  async clickStartMyQuote(): Promise<void> {
    // 1. Primary attempt: Wait for visible and click. Total wait ~1 second.
    try {
      await this.page.waitForSelector(this.startQuoteSelector, {
        state: 'visible',
        timeout: 1000,
      });
      const cta = this.page.locator(this.startQuoteSelector).first();
      await cta.scrollIntoViewIfNeeded();
      await cta.click();
      console.log('[GEICO] Standard click successful');
      return;
    } catch {
      console.log('[GEICO] Standard click failed, trying force click...');
    }

    // 2. Fallback: Force click.
    try {
      const cta = this.page.locator(this.startQuoteSelector).first();
      await cta.scrollIntoViewIfNeeded();
      await cta.click({ force: true, timeout: 500 });
      console.log('[GEICO] Force click successful');
      return;
    } catch {
      console.log('[GEICO] Force click failed, trying JS evaluation...');
    }

    // 3. Final Fallback: JS evaluation click.
    const allSelectors = this.startQuoteSelector.split(',').map(s => s.trim());
    for (const sel of allSelectors) {
      try {
        const success = await this.page.evaluate((selector) => {
          const el = document.querySelector(selector) as HTMLElement;
          if (el) {
            el.click();
            return true;
          }
          return false;
        }, sel);
        if (success) {
          console.log(`[GEICO] JS evaluation click successful for ${sel}`);
          return;
        }
      } catch {
        // Ignore selector evaluation errors and continue trying other selectors.
      }
    }

    throw new Error('Could not click Start My Quote button with any method');
  }

  /**
   * Handle the optional bundle modal that occasionally appears after clicking
   * "Start My Quote". If a ZIP field is present inside the modal and is empty,
   * it will be populated with the provided ZIP before clicking Continue.
   */
  async handleBundleModal(zip?: string): Promise<void> {
    try {
      // Wait for any continue button among selectors
      const continueLocator = await this.waitForFirstVisible(this.bundleModalContinueSelectors, TIMEOUTS.visibilityDefault);

      // Optional ZIP within modal
      if (zip) {
        try {
          const zipInput = this.page.locator(this.bundleModalZipSelector);
          await zipInput.waitFor({ state: 'attached', timeout: TIMEOUTS.visibilityDefault });
          const current = await zipInput.inputValue();
          if (!current) {
            await zipInput.fill(zip);
          }
        } catch {
          /* Not fatal */
        }
      }

      await continueLocator.scrollIntoViewIfNeeded();
      await continueLocator.click({ force: true });
    } catch {
      // Non-critical failure (modal not present or selector unavailable). Proceed without blocking.
    }
  }

  /**
   * Utility: Wait for the first selector in array to become visible, returning its Locator.
   */
  private async waitForFirstVisible(selectors: string[], timeout = TIMEOUTS.visibilityDefault) {
    const start = Date.now();
    for (;;) {
      for (const sel of selectors) {
        const loc = this.page.locator(sel).first();
        if (await loc.isVisible().catch(() => false)) return loc;
      }
      if (Date.now() - start > timeout) throw new Error('No selector visible within timeout');
      await this.page.waitForTimeout(TIMEOUTS.visibilityFast);
    }
  }

  /* ----------------------- BaseHomePage Interface ----------------------- */

  /** Navigate to Geico home page */
  async gotoHome(): Promise<void> {
    await this.page.goto('https://www.geico.com/', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Prepare auto flow - no-op for Geico as it loads to general page */
  async prepareAutoFlow(): Promise<void> {
    // Geico loads to general page, auto product selection happens later
  }

  /** Submit quote (triggers the full flow) */
  async submitQuote(): Promise<void> {
    await this.clickGoAfterZip();
    await this.selectAutoProduct();
    await this.clickStartMyQuote();
  }

  /** Convenience method that chains all steps to start a quote */
  async startQuote(zip: string): Promise<void> {
    await this.prepareAutoFlow();
    await this.enterZip(zip);
    await this.submitQuote();
    await this.handleBundleModal(zip);
  }

  /** Wait for navigation to quote step 1 */
  async waitForQuoteStep1(): Promise<void> {
    // Wait for navigation to quote form
    await this.page.waitForURL(/geico\.com.*quote/, {
      timeout: TIMEOUTS.pageLoad * TIMEOUTS.navMaxAttempts,
    });
  }
} 