import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';

/**
 * LibertyMutualAddressPage encapsulates the address capture screen that
 * immediately follows the personal-info step in Liberty Mutual's quote flow.
 *
 * The DOM markup is subject to continuous optimisation tests so we keep a
 * highly resilient selector strategy.  Agents must rely exclusively on this
 * abstraction to interact with the address step — never query raw selectors
 * from the agent itself.
 */
export class LibertyMutualAddressPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /* ------------------------------ Locators ------------------------------ */

  /** Street / primary address input field */
  private readonly streetSelectors = [
    '#streetAddress',
    '#street-address',
    '#primaryAddress',
    'input[name="streetAddress"]',
    'input[name="street_address"]',
    'input[id*="street" i]',
    'input[aria-label*="address" i]',
    'input[placeholder*="street" i]',
  ];

  /** Forward navigation button */
  private readonly continueButtonSelectors = [
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'button[type="submit"]:has-text("Continue")',
    'input[type="submit"][value="Continue"]',
  ];

  /* ------------------------------- Helpers ------------------------------ */

  private async fillFirstVisible(selectorList: string[], value: string): Promise<void> {
    for (const selector of selectorList) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: TIMEOUTS.visibilityDefault }).catch(() => false)) {
        await locator.fill(value, { timeout: TIMEOUTS.visibilityDefault });
        return;
      }
    }
    throw new Error(`Unable to locate input for value: ${value}`);
  }

  /* -------------------------------- API -------------------------------- */

  async fillStreetAddress(addressLine1: string): Promise<void> {
    await this.fillFirstVisible(this.streetSelectors, addressLine1);
  }

  async fillAddress(data: { streetAddress: string }): Promise<void> {
    await this.fillStreetAddress(data.streetAddress);
  }

  async clickContinue(): Promise<void> {
    for (const selector of this.continueButtonSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: TIMEOUTS.visibilityDefault }).catch(() => false)) {
        await locator.click();
        return;
      }
    }
    throw new Error('Unable to locate Continue button on Address page.');
  }
} 