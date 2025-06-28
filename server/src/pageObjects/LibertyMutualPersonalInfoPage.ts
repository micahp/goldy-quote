import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';

/**
 * LibertyMutualPersonalInfoPage encapsulates the first "About You" screen that
 * collects basic applicant details (first name, last name, birthday).
 *
 * The page structure is subject to frequent A/B experiments so we expose a
 * resilient locator strategy similar to the home-page object.  The agent can
 * depend exclusively on these helpers rather than brittle ad-hoc selectors.
 */
export class LibertyMutualPersonalInfoPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /* ------------------------------ Locators ------------------------------ */

  private readonly firstNameSelectors = [
    '#firstName',
    '#first-name',
    'input[name="firstName"]',
    'input[id*="first" i]',
    'input[aria-label*="first name" i]',
    'input[placeholder*="first" i]',
  ];

  private readonly lastNameSelectors = [
    '#lastName',
    '#last-name',
    'input[name="lastName"]',
    'input[id*="last" i]',
    'input[aria-label*="last name" i]',
    'input[placeholder*="last" i]',
  ];

  private readonly dobSelectors = [
    '#dateOfBirth',
    '#birthday',
    '#date-of-birth',
    'input[name="birthday"]', // Liberty uses "birthday" instead of DOB in API
    'input[name="dateOfBirth"]',
    'input[id*="birth" i]',
    'input[placeholder*="MM/DD/YYYY" i]',
    'input[aria-label*="Birth" i]',
  ];

  /** Primary forward-navigation button */
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

  async fillFirstName(firstName: string): Promise<void> {
    await this.fillFirstVisible(this.firstNameSelectors, firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.fillFirstVisible(this.lastNameSelectors, lastName);
  }

  async fillDateOfBirth(dob: string): Promise<void> {
    await this.fillFirstVisible(this.dobSelectors, dob);
  }

  async fillPersonalInfo(data: { firstName: string; lastName: string; dateOfBirth: string }): Promise<void> {
    await this.fillFirstName(data.firstName);
    await this.fillLastName(data.lastName);
    await this.fillDateOfBirth(data.dateOfBirth);
  }

  async clickContinue(): Promise<void> {
    for (const selector of this.continueButtonSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: TIMEOUTS.visibilityDefault }).catch(() => false)) {
        await locator.click();
        return;
      }
    }
    throw new Error('Unable to locate Continue button on Personal Info page.');
  }
} 