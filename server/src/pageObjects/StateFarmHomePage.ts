import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';

/**
 * StateFarmHomePage wraps interactions with State Farm's auto-insurance start
 * flow (ZIP → Start Quote).
 */
export class StateFarmHomePage {
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
} 