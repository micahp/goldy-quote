import { Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';

/**
 * LibertyMutualVehiclePage encapsulates the vehicle-information step in the
 * Liberty Mutual quote wizard.  The UI usually asks for Year, Make, and Model
 * (sometimes Trim) in cascading dropdowns.  All selector logic lives here to
 * shield the agent from A/B tweaks.
 */
export class LibertyMutualVehiclePage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /* ------------------------------ Locators ------------------------------ */

  private readonly yearSelectors = [
    '#vehicleYear',
    'select[name="vehicleYear"]',
    'select[id*="vehicle-year" i]',
    'select[id*="year" i]',
    'select[aria-label*="year" i]',
  ];

  private readonly makeSelectors = [
    '#vehicleMake',
    'select[name="vehicleMake"]',
    'select[id*="vehicle-make" i]',
    'select[id*="make" i]',
    'select[aria-label*="make" i]',
  ];

  private readonly modelSelectors = [
    '#vehicleModel',
    'select[name="vehicleModel"]',
    'select[id*="vehicle-model" i]',
    'select[id*="model" i]',
    'select[aria-label*="model" i]',
  ];

  private readonly continueButtonSelectors = [
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'button[type="submit"]:has-text("Continue")',
    'input[type="submit"][value="Continue"]',
  ];

  /* ------------------------------- Helpers ------------------------------ */

  private async getFirstVisible(selectors: string[]): Promise<ReturnType<Page['locator']>> {
    for (const selector of selectors) {
      const loc = this.page.locator(selector).first();
      if (await loc.isVisible({ timeout: TIMEOUTS.visibilityDefault }).catch(() => false)) {
        return loc;
      }
    }
    throw new Error(`None of the selectors are visible: ${selectors.join(', ')}`);
  }

  /* -------------------------------- API -------------------------------- */

  async selectYear(year: string): Promise<void> {
    const dropdown = await this.getFirstVisible(this.yearSelectors);
    await dropdown.selectOption({ label: year }).catch(async () => {
      // Fallback to value match
      await dropdown.selectOption({ value: year });
    });
  }

  async selectMake(make: string): Promise<void> {
    const dropdown = await this.getFirstVisible(this.makeSelectors);
    await dropdown.selectOption({ label: make }).catch(async () => {
      await dropdown.selectOption({ value: make });
    });
  }

  async selectModel(model: string): Promise<void> {
    const dropdown = await this.getFirstVisible(this.modelSelectors);
    await dropdown.selectOption({ label: model }).catch(async () => {
      await dropdown.selectOption({ value: model });
    });
  }

  async fillVehicle(data: { vehicleYear: string; vehicleMake: string; vehicleModel: string }): Promise<void> {
    await this.selectYear(data.vehicleYear);
    // Some UIs load Make dropdown options after Year selection; wait briefly
    await this.page.waitForTimeout(TIMEOUTS.visibilityFast);
    await this.selectMake(data.vehicleMake);
    await this.page.waitForTimeout(TIMEOUTS.visibilityFast);
    await this.selectModel(data.vehicleModel);
  }

  async clickContinue(): Promise<void> {
    for (const selector of this.continueButtonSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: TIMEOUTS.visibilityDefault }).catch(() => false)) {
        await locator.click();
        return;
      }
    }
    throw new Error('Unable to locate Continue button on Vehicle page.');
  }
} 