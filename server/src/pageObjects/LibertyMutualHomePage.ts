import { Locator, Page } from 'playwright';
import { TIMEOUTS } from './timeouts.js';
import { BaseHomePage } from './BaseHomePage.js';

/**
 * LibertyMutualHomePage provides a strict locator contract for the very first
 * screen in the Liberty Mutual auto-insurance quote flow (homepage hero).
 * The goal is to encapsulate all DOM selectors so that the corresponding
 * `LibertyMutualAgent` interacts with this page via high-level actions only.
 */
export class LibertyMutualHomePage implements BaseHomePage {
  private readonly page: Page;
  private activeFormLocator: Locator | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /* ------------------------------ Locators ------------------------------ */

  /**
   * ZIP input – Liberty's homepage markup occasionally changes so we keep a
   * resilient selector list.  We first try an explicit id, then fall back to
   * more generic patterns.
   */
  private readonly zipSelectors = [
    '#quote-zipCode-input', // hero ZIP on new LM experience
    '#zipcode',
    '#zip',
    'input[name="zip"]',
    'input[name="zipcode"]',
    'input[placeholder*="ZIP" i]',
  ];

  /** Primary call-to-action that starts the quote flow. */
  private readonly getPriceButtonSelectors = [
    'button:has-text("Get my price")',
    'button:has-text("Get My Price")',
    'button:has-text("Get my price >")',
    'button:has-text("See my price")',
    'button:has-text("Get a quote")',
    'button:has-text("Start my quote")',
    'button[data-automation-id="start-quote-button"]',
    'button#getmyprice', // explicit id observed in some experiments
  ];

  /* ------------------------------- Actions ------------------------------ */

  /**
   * Finds a containing element that has BOTH a visible ZIP input and a visible
   * "start quote" button, ensuring we operate on a single, coherent form.
   * This is critical for pages with multiple quote forms (e.g., in a hero
   * and a sticky footer).
   */
  private async findAndCacheActiveForm(): Promise<Locator> {
    if (this.activeFormLocator && (await this.activeFormLocator.isVisible())) {
      return this.activeFormLocator;
    }

    // A list of high-level selectors that might contain a form.
    const containerSelectors = [
      'form', // Standard form tag
      'section[data-ui-module*="auto-rate-tool"]', // Specific LM module
      'section[data-ui-module]', // A pattern seen on LM
      '.c_form', // Common component class
      '.hero', // Hero section
      '[role="region"]', // Accessibility role
    ];

    for (const containerSelector of containerSelectors) {
      const containers = this.page.locator(containerSelector);
      const count = await containers.count();
      for (let i = 0; i < count; i++) {
        const container = containers.nth(i);
        // Check if this container has BOTH a visible ZIP field and a visible button
        // Using a short timeout because we're just checking for presence of already-loaded elements.
        const hasVisibleZip = await container
          .locator(this.zipSelectors.join(', '))
          .first()
          .isVisible({ timeout: 50 })
          .catch(() => false);
        const hasVisibleButton = await container
          .locator(this.getPriceButtonSelectors.join(', '))
          .first()
          .isVisible({ timeout: 50 })
          .catch(() => false);

        if (hasVisibleZip && hasVisibleButton) {
          console.log(
            `[LibertyMutualHomePage] Found active form container: ${containerSelector} #${i}`,
          );
          this.activeFormLocator = container;
          return container;
        }
      }
    }
    throw new Error(
      'Failed to find a container with both a ZIP input and a start button.',
    );
  }

  /**
   * Fill the ZIP textbox within the context of a single, validated form.
   */
  async enterZip(zip: string): Promise<void> {
    const form = await this.findAndCacheActiveForm();
    const zipInput = form.locator(this.zipSelectors.join(', ')).first();
    await zipInput.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.visibilityDefault,
    });
    await zipInput.fill(zip);
  }

  /**
   * Click the hero call-to-action that belongs to the same form as the ZIP input.
   */
  async clickGetMyPrice(): Promise<void> {
    // Ensure form is found, even if enterZip was somehow skipped.
    const form = await this.findAndCacheActiveForm();
    const button = form
      .locator(this.getPriceButtonSelectors.join(', '))
      .first();
    await button.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.visibilityDefault,
    });
    await button.click();
  }

  /* ----------------------- BaseHomePage Interface ----------------------- */

  /** Navigate to Liberty Mutual home page */
  async gotoHome(): Promise<void> {
    await this.page.goto('https://www.libertymutual.com/auto-insurance', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Prepare auto flow - Liberty Mutual loads directly to auto page */
  async prepareAutoFlow(): Promise<void> {
    // Liberty Mutual auto page loads directly, no preparation needed
  }

  /** Submit quote (alias for clickGetMyPrice) */
  async submitQuote(): Promise<void> {
    await this.clickGetMyPrice();
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
    await this.page.waitForURL(/libertymutual\.com.*quote/, {
      timeout: TIMEOUTS.pageLoad * TIMEOUTS.navMaxAttempts,
    });
  }
} 