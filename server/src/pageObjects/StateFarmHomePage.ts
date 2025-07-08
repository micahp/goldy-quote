import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';
import { BaseHomePage } from './BaseHomePage.js';

/**
 * StateFarmHomePage wraps interactions with State Farm's auto-insurance start
 * flow (ZIP → Start Quote).
 */
export class StateFarmHomePage implements BaseHomePage {
  constructor(private page: Page) {}

  /* ------------------------------- Locators ------------------------------ */
  // Multiple selectors because State Farm occasionally A/B tests the markup
  readonly zipSelectors = [
    '#quote-main-zip-code', // canonical 2024 selector
    'input#zipCode',        // legacy overlay field
    'input[name="zip"]',
    'input[name="zipCode"]',
    '#zipcode',
  ];

  readonly startQuoteSelectors = [
    'button[data-action="get-quote"]', // Fast path from agent
    "button[data-action='get-quote']",
    'button:has-text("Start a quote")',
    'button:has-text("Start a Quote")',
    'button:has-text("Get Quote")',
    'button:has-text("Get a Quote")',
    'button:has-text("Get a quote")',
  ];

  /* ------------------------------- Actions ------------------------------- */
  async gotoAutoInsurance(): Promise<void> {
    await this.page.goto('https://www.statefarm.com/insurance/auto', {
      waitUntil: 'domcontentloaded',
    });
  }

  async enterZip(zip: string): Promise<void> {
    const perSelectorTimeout = TIMEOUTS.visibilityDefault;
    for (const selector of this.zipSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'visible', timeout: perSelectorTimeout });
        await this.page.fill(selector, zip);
        return;
      } catch {
        /* try next */
      }
    }
    throw new Error('Could not locate visible ZIP input on State Farm home page');
  }

  async clickStartQuote(): Promise<void> {
    for (const selector of this.startQuoteSelectors) {
      const loc = this.page.locator(selector);
      if (await loc.count()) {
        try {
          await loc.first().click();
          return;
        } catch {
          /* continue */
        }
      }
    }
    throw new Error('Start Quote button could not be clicked');
  }

  /* ----------------------- BaseHomePage Interface ----------------------- */

  /** Navigate to home page (alias for gotoAutoInsurance) */
  async gotoHome(): Promise<void> {
    await this.gotoAutoInsurance();
  }

  /** Prepare auto flow - State Farm loads directly to auto page, so no-op */
  async prepareAutoFlow(): Promise<void> {
    // State Farm auto page loads directly, no preparation needed
  }

  /** Submit quote (alias for clickStartQuote) */
  async submitQuote(): Promise<void> {
    await this.clickStartQuote();
  }

  /** Convenience method that chains all steps to start a quote */
  async startQuote(zip: string): Promise<void> {
    await this.prepareAutoFlow();
    await this.enterZip(zip);
    await this.submitQuote();
  }

  /** Wait for navigation to quote step 1 */
  async waitForQuoteStep1(): Promise<void> {
    // Wait for navigation to personal info step
    await this.page.waitForURL(/statefarm\.com.*quote/, {
      timeout: TIMEOUTS.pageLoad * TIMEOUTS.navMaxAttempts,
    });
  }
} 