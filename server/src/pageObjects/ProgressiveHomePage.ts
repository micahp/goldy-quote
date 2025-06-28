import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';

/**
 * ProgressiveHomePage encapsulates interactions with progressive.com landing
 * pages leading to the auto-insurance quote flow.
 */
export class ProgressiveHomePage {
  constructor(private page: Page) {}

  /* ------------------------------- Locators ------------------------------ */

  // The home page has several entry points. The anchor variant is the most reliable.
  readonly autoInsuranceLinkSelectors = [
    'a[href*="/auto/"]',
    'a:has-text("Auto")',
    'a:has-text("Car Insurance")',
  ];

  // Primary (mma) and overlay variants for the ZIP code input
  readonly zipInputSelectors = [
    'input[name="ZipCode"]#zipCode_mma',
    'input[name="ZipCode"]#zipCode_overlay',
    'input[name="zipCode"]',
  ];
  readonly getQuoteButtonSelectors = [
    'input[name="qsButton"]#qsButton_mma',
    'input[name="qsButton"]#qsButton_overlay',
    'button:has-text("Get a quote")',
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
} 