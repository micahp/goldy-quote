import { Page, Locator } from 'playwright';

export class LocatorHelpers {
  constructor(private page: Page) {}

  // Common form field locators
  getByFieldName(name: string): Locator {
    return this.page.locator(`input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`);
  }

  getByFieldId(id: string): Locator {
    return this.page.locator(`input[id="${id}"], select[id="${id}"], textarea[id="${id}"]`);
  }

  getByPlaceholder(text: string): Locator {
    return this.page.getByPlaceholder(text);
  }

  getByLabel(text: string): Locator {
    return this.page.getByLabel(text);
  }

  // ZIP code specific locators
  getZipCodeField(): Locator {
    return this.page.locator([
      'input[name="POL_ratedZip5"]',
      'input[name="zip"]',
      'input[name="zipCode"]',
      'input[placeholder*="ZIP"]',
      'input[aria-label*="ZIP"]',
      'input[id*="zip"]'
    ].join(', '));
  }

  // Personal info field locators
  getFirstNameField(): Locator {
    return this.page.locator([
      'input[name="firstName"]',
      'input[id="firstName"]',
      'input[placeholder*="First"]',
      'input[aria-label*="First Name"]',
      'input[data-testid*="first"]'
    ].join(', '));
  }

  getLastNameField(): Locator {
    return this.page.locator([
      'input[name="lastName"]',
      'input[id="lastName"]',
      'input[placeholder*="Last"]',
      'input[aria-label*="Last Name"]',
      'input[data-testid*="last"]'
    ].join(', '));
  }

  getDateOfBirthField(): Locator {
    return this.page.locator([
      'input[name="dateOfBirth"]',
      'input[id="dateOfBirth"]',
      'input[name="dob"]',
      'input[id="dob"]',
      'input[placeholder*="Birth"]',
      'input[placeholder*="Date of Birth"]',
      'input[aria-label*="birth"]'
    ].join(', '));
  }

  getEmailField(): Locator {
    return this.page.locator([
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email"]',
      'input[aria-label*="email"]'
    ].join(', '));
  }

  getPhoneField(): Locator {
    return this.page.locator([
      'input[type="tel"]',
      'input[name="phone"]',
      'input[name="phoneNumber"]',
      'input[id="phone"]',
      'input[placeholder*="phone"]',
      'input[aria-label*="phone"]'
    ].join(', '));
  }

  // Address field locators
  getAddressField(): Locator {
    return this.page.locator([
      'input[name="address"]',
      'input[name="streetAddress"]',
      'input[id="address"]',
      'input[placeholder*="address"]',
      'input[aria-label*="address"]',
      'input[placeholder*="street"]'
    ].join(', '));
  }

  getAptField(): Locator {
    return this.page.locator([
      'input[name="apt"]',
      'input[name="apartment"]',
      'input[id="apt"]',
      'input[placeholder*="apt"]',
      'input[aria-label*="apartment"]'
    ].join(', '));
  }

  getCityField(): Locator {
    return this.page.locator([
      'input[name="city"]',
      'input[id="city"]',
      'input[placeholder*="city"]',
      'input[aria-label*="city"]'
    ].join(', '));
  }

  getStateField(): Locator {
    return this.page.locator([
      'select[name="state"]',
      'input[name="state"]',
      'select[id="state"]',
      'select[aria-label*="state"]'
    ].join(', '));
  }

  // Vehicle field locators
  getVehicleYearField(): Locator {
    return this.page.locator([
      'select[name="year"]',
      'input[name="year"]',
      'select[name="vehicleYear"]',
      'input[name="vehicleYear"]',
      'select[aria-label*="year"]'
    ].join(', '));
  }

  getVehicleMakeField(): Locator {
    return this.page.locator([
      'select[name="make"]',
      'input[name="make"]',
      'select[name="vehicleMake"]',
      'input[name="vehicleMake"]',
      'select[aria-label*="make"]'
    ].join(', '));
  }

  getVehicleModelField(): Locator {
    return this.page.locator([
      'select[name="model"]',
      'input[name="model"]',
      'select[name="vehicleModel"]',
      'input[name="vehicleModel"]',
      'select[aria-label*="model"]'
    ].join(', '));
  }

  // Button locators
  getContinueButton(): Locator {
    // Try submit inputs first (more specific for forms), then buttons
    const submitInput = this.page.locator('input[type="submit"]').filter({ hasText: /continue|next|proceed|submit|go|start.*quote|get.*quote|begin|start.*now/i });
    const button = this.page.getByRole('button', { name: /continue|next|proceed|submit|go|start.*quote|get.*quote|begin|start.*now/i }).filter({ hasNot: this.page.locator('[aria-expanded]') });
    
    return submitInput.or(button).first();
  }

  getStartQuoteButton(): Locator {
    return this.page.getByRole('button', { name: /start|quote|get.*quote|begin|go|start.*now/i });
  }

  getBackButton(): Locator {
    return this.page.getByRole('button', { name: /back|previous/i });
  }

  // Utility methods
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(filename: string): Promise<string> {
    const path = `${process.cwd()}/screenshots/${filename}`;
    await this.page.screenshot({ path, fullPage: true });
    return path;
  }

  async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async fillField(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(value);
  }

  async selectOption(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption(value);
  }

  async clickButton(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  // Error handling
  async retryAction<T>(action: () => Promise<T>, maxRetries: number = 1): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          console.log(`Action failed, retrying (${i + 1}/${maxRetries})...`);
          await this.page.waitForTimeout(1000); // Wait 1 second before retry
        }
      }
    }
    
    throw lastError;
  }
} 