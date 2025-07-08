import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class StateFarmAgent extends BaseCarrierAgent {
  readonly name = 'statefarm';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    try {
      const { taskId, userData } = context;
      console.log(`[${this.name}] Starting quote process for task: ${taskId}`);
      this.createTask(taskId, this.name);
      
      await this.browserActions.navigate(taskId, 'https://www.statefarm.com/insurance/auto');
      
      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a State Farm quote.');
      }

      const page = await this.getBrowserPage(taskId);
      // Wait for the ZIP input (prefer id, fallback to name)
      let zipInput = page.locator('#quote-main-zip-code-input1');
      if (!(await zipInput.count())) {
        zipInput = page.locator('input[name="zipCode"]');
      }
      await zipInput.waitFor({ state: 'visible', timeout: 8000 });
      await zipInput.fill(userData.zipCode);

      // Wait for the Start a quote button (prefer id, fallback to text)
      let startBtn = page.locator('#quote-submit-button1');
      if (!(await startBtn.count())) {
        startBtn = page.locator('button:has-text("Start a quote")');
      }
      await startBtn.waitFor({ state: 'visible', timeout: 8000 });
      await startBtn.waitFor({ state: 'attached', timeout: 8000 });
      await startBtn.click();

      // Wait for navigation to /autoquote or /quote
      const response = await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      if (!response?.ok()) {
        throw new Error(`Navigation failed with status ${response?.status()}: ${response?.statusText()}`);
      }

      this.updateTask(taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        currentStepLabel: 'personal_info',
        requiredFields: this.getPersonalInfoFields(),
      });
      
      return this.createWaitingResponse(this.getPersonalInfoFields());
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during start';
      console.error(`[${this.name}] Error starting quote process:`, error);
      this.updateTask(context.taskId, { status: 'error', error: message });
      await this.browserActions.takeScreenshot(context.taskId, 'statefarm-start-error');
      return this.createErrorResponse(message);
    }
  }

  async step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    try {
      console.log(`[${this.name}] Processing step for task: ${taskId}`, stepData);
      
      const task = this.getTask(taskId);
      if (!task) {
        return this.createErrorResponse('Task not found');
      }
      
      this.updateTask(taskId, {
        userData: { ...task.userData, ...stepData },
        status: 'processing',
      });
      
      const page = await this.getBrowserPage(taskId);
      
      const quoteInfo = await this.extractQuoteInfo(page);
      if (quoteInfo) {
        this.updateTask(taskId, { status: 'completed', quote: quoteInfo });
        return this.createCompletedResponse(quoteInfo);
      }
      
      const currentStep = await this.identifyCurrentStep(page);
      console.log(`[${this.name}] Current step: ${currentStep}, URL: ${page.url()}`);
      
      switch (currentStep) {
        case 'personal_info':
          return await this.handlePersonalInfoStep(page, context, stepData);
        case 'vehicle_info':
          return await this.handleVehicleStep(page, context, stepData);
        case 'driver_details':
          return await this.handleDriverDetailsStep(page, context, stepData);
        case 'coverage_selection':
          return await this.handleCoverageStep(page, context, stepData);
        case 'vehicle_and_address':
          return await this.handleVehicleAndAddressStep(page, context, stepData);
        default:
          await this.browserActions.takeScreenshot(taskId, 'statefarm-unknown-step');
          return this.createErrorResponse(`Unknown or unhandled step: ${currentStep}`);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during step';
      console.error(`[${this.name}] Error processing step:`, error);
      this.updateTask(taskId, { status: 'error', error: message });
      await this.browserActions.takeScreenshot(taskId, 'statefarm-step-error');
      return this.createErrorResponse(message);
    }
  }

  private async identifyCurrentStep(page: Page): Promise<string> {
    // Some sessions combine vehicle & address into a single step (observed June-2025).
    try {
      if (await this.isVehicleAndAddressCombined(page)) {
        return 'vehicle_and_address';
      }
    } catch {
      // Ignore errors and fall back to URL/title heuristics
    }

    const url = page.url().toLowerCase();
    if (url.includes('/vehicle')) return 'vehicle_info';
    if (url.includes('/driver')) return 'driver_details';
    if (url.includes('/coverage')) return 'coverage_selection';
    if (url.includes('/rates') || url.includes('/final')) return 'quote_results';

    const title = (await page.title()).toLowerCase();
    if (title.includes('vehicle')) return 'vehicle_info';
    if (title.includes('driver')) return 'driver_details';
    if (title.includes('coverage')) return 'coverage_selection';
    if (title.includes('rates') || title.includes('final')) return 'quote_results';

    // Default to personal_info after the initial zip step
    if (url.includes('/quote')) return 'personal_info';
    return 'unknown';
  }

  /**
   * Detects whether State Farm is showing the combined Vehicle & Address step.
   * We consider the page "combined" when *both* a vehicle field (year/make/model)
   * and an address field (street address) are visible at the same time.
   * This logic purposefully uses broad selectors so it remains resilient to minor DOM changes.
   */
  private async isVehicleAndAddressCombined(page: Page): Promise<boolean> {
    try {
      // Vehicle field (year dropdown or input)
      const vehicleLocator = page.locator(
        'select#vehicleYear, select[name*="year" i], input[name*="year" i]'
      ).first();

      // Street address field
      const addressLocator = page.locator(
        'input[name="addressLine1"], input[name*="street" i], input[id*="address" i], input[placeholder*="Street" i]'
      ).first();

      // Use small timeout so we don't slow down normal flow
      const vehicleVisible = await vehicleLocator.isVisible().catch(() => false);
      const addressVisible = await addressLocator.isVisible().catch(() => false);

      return vehicleVisible && addressVisible;
    } catch {
      return false;
    }
  }

  /**
   * Handle the combined Vehicle & Address step (observed as Step 2 variant).
   * Fills vehicle info (if provided) followed by street address info.
   */
  private async handleVehicleAndAddressStep(
    page: Page,
    context: CarrierContext,
    stepData: Record<string, any>
  ): Promise<CarrierResponse> {
    const { taskId } = context;

    // Vehicle details (if present)
    const vehicle = stepData.vehicles?.[0];
    if (vehicle) {
      await this.fillForm(taskId, {
        vehicleYear: [vehicle.vehicleYear],
        vehicleMake: [vehicle.vehicleMake],
        vehicleModel: [vehicle.vehicleModel],
      });
    }

    // Address details (street, city, state, zip)
    const address = stepData.address ?? stepData;
    if (address) {
      const { street, city, state, zipCode } = address;
      await this.fillForm(taskId, {
        street,
        city,
        state,
        zipCode,
      });
    }

    await this.clickContinueButton(page, taskId);

    // Next expected step is driver details
    return this.createWaitingResponse(this.getDriverDetailsFields());
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    try {
      const url = page.url();
      if (!url.includes('/rates') && !url.includes('/final')) {
        return null;
      }
      
      const priceElement = page.locator('[data-testid*="premium"], .premium-amount, .quote-price').first();
      const priceText = await priceElement.textContent({ timeout: 5000 });

      if (priceText && priceText.includes('$')) {
        return {
          carrier: this.name,
          price: priceText.trim(),
          term: 'month',
          premium: 0, // Placeholder, actual value may need more complex extraction
          coverages: [], // Placeholder
        };
      }
      return null;
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      throw error;
    }
  }

  private async handlePersonalInfoStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { firstName, lastName, dateOfBirth } = stepData;

    await this.fillForm(taskId, {
      firstName,
      lastName,
      dateOfBirth,
    });
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getVehicleInfoFields());
  }
  
  /**
   * STATE FARM STEP 2: Vehicle Information Collection
   * 
   * State Farm's Step 2 focuses on collecting vehicle information for the quote.
   * According to State Farm documentation, this is a multi-part step (Steps 2a-2g) that includes:
   * - Vehicle Selection (year, make, model, body style)
   * - Primary Use, Ownership, Rideshare usage
   * - Purchase Date, Anti-theft device, Garage address
   * 
   * DOCUMENTED SELECTORS IN STEP 2:
   * 
   * SELECTOR STRATEGY:
   * State Farm uses the inherited base class methods (fillForm + smartType/smartSelectOption)
   * which implement dynamic field discovery via:
   * 1. discoverFields() - snapshot-based analysis
   * 2. analyzeFieldsFromSnapshot() - identify fields by purpose  
   * 3. fallbackFieldDiscovery() - DOM-based discovery with fallbackSelectors.ts
   * 4. Hardcoded fallback via fillForm() mapping
   * 
   * FIELD MAPPINGS (via fillForm):
   * - vehicleYear: Maps to 'vehicleYear' purpose → smartSelectOption discovery
   * - vehicleMake: Maps to 'vehicleMake' purpose → smartSelectOption discovery  
   * - vehicleModel: Maps to 'vehicleModel' purpose → smartSelectOption discovery
   * 
   * CONTINUE BUTTON (inherited from BaseCarrierAgent.clickContinueButton):
   * - 'button[type="submit"]' (submit type button)
   * - 'button:has-text("Continue")' (text-based button)
   * - 'button:has-text("Next")' (next button variant)
   * 
   * DISCOVERY SYSTEM:
   * Unlike GEICO's sophisticated smartType system or Progressive's hardcoded selectors,
   * State Farm uses the base class's hybrid dynamic discovery system with fallback patterns.
   * 
   * TODO: Document actual discovered selectors from State Farm's vehicle form
   * TODO: Add specific State Farm vehicle selector patterns to fallbackSelectors.ts
   * TODO: Monitor for changes to State Farm's vehicle form structure (URLs change with submissionId)
   */
  private async handleVehicleStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const vehicle = stepData.vehicles?.[0];

    if (vehicle) {
      await this.fillForm(taskId, {
        vehicleYear: [vehicle.vehicleYear],
        vehicleMake: [vehicle.vehicleMake],
        vehicleModel: [vehicle.vehicleModel],
      });
    }

    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getDriverDetailsFields());
  }

  private async handleDriverDetailsStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { gender, maritalStatus } = stepData;

    await this.fillForm(taskId, {
      gender: [gender],
      maritalStatus: [maritalStatus],
    });
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getCoverageFields());
  }
  
  private async handleCoverageStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.clickContinueButton(page, context.taskId);
    
    // After this step, we expect quote results
    const quote = await this.extractQuoteInfo(page);
    if (quote) {
      this.updateTask(context.taskId, { status: 'completed', quote });
      return this.createCompletedResponse(quote);
    }
    
    return this.createErrorResponse('Could not retrieve quote after coverage step.');
  }

  private getPersonalInfoFields(): Record<string, FieldDefinition> {
    return {
      firstName: { label: 'First Name', type: 'text', required: true },
      lastName: { label: 'Last Name', type: 'text', required: true },
      dateOfBirth: { label: 'Date of Birth (MM/DD/YYYY)', type: 'date', required: true },
    };
  }

  private getVehicleInfoFields(): Record<string, FieldDefinition> {
    return {
      vehicles: {
        label: 'Vehicles',
        type: 'array',
        required: true,
        itemFields: {
          vehicleYear: { label: 'Year', type: 'select', required: true, options: this.generateYearOptions() },
          vehicleMake: { label: 'Make', type: 'text', required: true },
          vehicleModel: { label: 'Model', type: 'text', required: true },
        },
      },
    };
  }

  private getDriverDetailsFields(): Record<string, FieldDefinition> {
    return {
        gender: { label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Non-Binary'] },
        maritalStatus: { label: 'Marital Status', type: 'select', required: true, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
    };
  }

  private getCoverageFields(): Record<string, FieldDefinition> {
    return {
        // StateFarm auto-selects coverage, so we just need a continue signal
        continue: { label: 'Continue to see your quote', type: 'boolean', required: true }
    };
  }

  private generateYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 30; i++) {
      years.push((currentYear - i).toString());
    }
    return years;
  }
}

// Export singleton instance
export const stateFarmAgent = new StateFarmAgent(); 