import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';
import { BaseHomePage } from './BaseHomePage.js';

/**
 * ProgressiveHomePage encapsulates interactions with progressive.com landing
 * pages leading to the auto-insurance quote flow.
 */
export class ProgressiveHomePage implements BaseHomePage {
  constructor(private page: Page) {}

  /* ------------------------------- Locators ------------------------------ */

  // The home page has several entry points. Extended with agent selectors for full parity.
  readonly autoInsuranceLinkSelectors = [
    'a[href*="/auto/"]',
    'a:has-text("Auto")',
    'a:has-text("Car Insurance")',
    '[data-product="auto"]',
    'button:has-text("Auto")',
    'button:has-text("Auto Insurance")',
  ];

  // Primary (mma) and overlay variants for the ZIP code input
  readonly zipInputSelectors = [
    'input[name="ZipCode"]#zipCode_mma',
    'input[name="ZipCode"]#zipCode_overlay',
    'input[name="zipCode"]',
  ];
  // Extended with agent selectors for submit button parity
  readonly getQuoteButtonSelectors = [
    'input[name="qsButton"]#qsButton_mma',
    'input[name="qsButton"]#qsButton_overlay',
    'button:has-text("Get a quote")',
    'input[name="qsButton"]',
    'button:has-text("Get a Quote")',
    'input[type="submit"]',
  ];

  /* ------------------------------- Actions ------------------------------- */

  /** Navigate to progressive.com and optionally click the Auto Insurance link */
  async gotoHome(): Promise<void> {
    await this.page.goto('https://www.progressive.com/', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Click any Auto-Insurance entry link if one is present and visible. */
  async clickAutoInsuranceLinkIfPresent(): Promise<void> {
    for (const selector of this.autoInsuranceLinkSelectors) {
      const locator = this.page.locator(selector);
      if (await locator.count()) {
        try {
          await locator.first().click();
          return;
        } catch {
          /* try next */
        }
      }
    }
  }

  /** Wait for a visible ZIP input among variants and fill it */
  async enterZip(zip: string): Promise<void> {
    const timeoutPerSelector = TIMEOUTS.perSelector;
    for (const selector of this.zipInputSelectors) {
      try {
        const locator = this.page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: timeoutPerSelector });
        await locator.fill(zip);
        return;
      } catch {
        /* try next selector */
      }
    }
    throw new Error('Unable to locate visible ZIP input on Progressive homepage');
  }

  /** Click one of the Get-Quote buttons */
  async clickGetQuote(): Promise<void> {
    for (const selector of this.getQuoteButtonSelectors) {
      const loc = this.page.locator(selector);
      if (await loc.count()) {
        try {
          await loc.first().click();
          return;
        } catch {
          /* try next */
        }
      }
    }
    throw new Error('Could not click any Get a quote button on Progressive homepage');
  }

  /* ----------------------- BaseHomePage Interface ----------------------- */

  /** Prepare the auto flow by clicking auto insurance link if needed */
  async prepareAutoFlow(): Promise<void> {
    await this.clickAutoInsuranceLinkIfPresent();
  }

  /** Submit the quote form (alias for clickGetQuote) */
  async submitQuote(): Promise<void> {
    await this.clickGetQuote();
  }

  /** Convenience method that chains all steps to start a quote */
  async startQuote(zip: string): Promise<void> {
    await this.prepareAutoFlow();
    await this.enterZip(zip);
    await this.submitQuote();
  }

  /** Wait for navigation to quote step 1 */
  async waitForQuoteStep1(): Promise<void> {
    // Wait for navigation away from homepage
    await this.page.waitForURL(/autoinsurance5\.progressivedirect\.com/, {
      timeout: TIMEOUTS.pageLoad * TIMEOUTS.navMaxAttempts, // ~8s total
    });
  }
} 