import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class LibertyMutualAgent extends BaseCarrierAgent {
  readonly name = 'libertymutual';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    const { taskId, userData } = context;
    try {
      console.log(`[${this.name}] Starting quote process for task: ${taskId}`);
      this.createTask(taskId, this.name);
      
      await this.browserActions.navigate(taskId, 'https://www.libertymutual.com/auto-insurance');
      
      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a Liberty Mutual quote.');
      }

      const page = await this.getBrowserPage(taskId);

      // More resilient ZIP code finding logic, adapted from original implementation
      const zipSelectors = [
        'input[name*="zip" i]',
        'input[placeholder*="zip" i]',
        'input[id*="zip" i]',
        'input[inputmode="numeric"]'
      ];

      let zipInput;
      for (const selector of zipSelectors) {
        zipInput = page.locator(selector).first();
        if (await zipInput.isVisible({ timeout: 2000 })) {
          console.log(`[${this.name}] Found ZIP input using selector: ${selector}`);
          break;
        }
        zipInput = null;
      }

      if (!zipInput) {
        throw new Error('Could not find ZIP input on Liberty Mutual homepage.');
      }
      
      await zipInput.type(userData.zipCode, { delay: 50 }); // Using Playwright's type for more reliability here

      // More resilient button finding logic
      const buttonSelectors = [
        'button:has-text("Get my price")',
        'button:has-text("Get quote")',
        'button:has-text("Start")',
        'button[type="submit"]',
      ];

      let getPriceBtn;
      for (const selector of buttonSelectors) {
        getPriceBtn = page.locator(selector).first();
        if (await getPriceBtn.isEnabled({ timeout: 2000 })) {
          console.log(`[${this.name}] Found button using selector: ${selector}`);
          break;
        }
        getPriceBtn = null;
      }

      if (!getPriceBtn) {
        throw new Error('Could not find submit button on Liberty Mutual homepage');
      }

      await getPriceBtn.click();

      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });

      // Handle modal that appears after navigation
      await this.handleInitialModal(page, taskId);

      this.updateTask(taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        requiredFields: this.getPersonalInfoFields(),
      });
      
      return this.createWaitingResponse(this.getPersonalInfoFields());
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during start';
      console.error(`[${this.name}] Error starting quote process:`, error);
      this.updateTask(context.taskId, { status: 'error', error: message });
      await this.browserActions.takeScreenshot(context.taskId, 'liberty-start-error');
      return this.createErrorResponse(message);
    }
  }

  async step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    try {
      console.log(`[${this.name}] Processing step for task: ${taskId}`, stepData);
      
      const task = this.getTask(taskId);
      if (!task) return this.createErrorResponse('Task not found');
      
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
      console.log(`[${this.name}] Current step: ${currentStep}`);
      
      switch (currentStep) {
        case 'personal_info':
          return await this.handlePersonalInfoStep(page, context, stepData);
        case 'address':
          return await this.handleAddressStep(page, context, stepData);
        case 'vehicle':
          return await this.handleVehicleStep(page, context, stepData);
        default:
          await this.browserActions.takeScreenshot(taskId, 'liberty-unknown-step');
          return this.createErrorResponse(`Unknown or unhandled step: ${currentStep}`);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during step';
      console.error(`[${this.name}] Error processing step:`, error);
      this.updateTask(taskId, { status: 'error', error: message });
      await this.browserActions.takeScreenshot(taskId, 'liberty-step-error');
      return this.createErrorResponse(message);
    }
  }

  private async identifyCurrentStep(page: Page): Promise<string> {
    const url = page.url().toLowerCase();
    
    if (url.includes('quote-interview')) {
      const title = (await page.title()).toLowerCase();
      if (title.includes('about you')) return 'personal_info';
      if (title.includes('vehicle')) return 'vehicle';
      if (title.includes('driver')) return 'drivers';
      if (title.includes('insurance history')) return 'insurance_history';
      if (title.includes('discounts')) return 'discounts';
      if (title.includes('quote results')) return 'quote_results';
      return 'personal_info';
    }
    
    if (url.includes('vehicle')) return 'vehicle';
    if (url.includes('address')) return 'address';
    if (url.includes('personal')) return 'personal_info';
    
    return 'unknown';
  }

  private async handlePersonalInfoStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { firstName, lastName, dateOfBirth } = stepData;

    // Check for any remaining modals before trying to fill the form
    await this.handleInitialModal(page, taskId);

    await this.fillForm(taskId, {
      firstName,
      lastName,
      dateOfBirth,
    });

    await this.clickContinueButton(page, taskId);
    
    const currentStep = await this.identifyCurrentStep(page);
    if (currentStep === 'vehicle') {
      return this.createWaitingResponse(this.getVehicleFields());
    } else if (currentStep === 'address') {
      return this.createWaitingResponse(this.getAddressFields());
    } else {
      return this.createWaitingResponse(this.getVehicleFields());
    }
  }

  /**
   * LIBERTY MUTUAL STEP 2: Address Information Collection
   * 
   * Liberty Mutual's Step 2 can vary in the flow, but primarily focuses on collecting
   * address information after personal info step. The implementation uses the base class
   * fillForm method with dynamic field discovery.
   * 
   * DOCUMENTED SELECTORS IN STEP 2 (handleAddressStep):
   * 
   * SELECTOR STRATEGY:
   * Liberty Mutual uses the inherited base class methods (fillForm + smartType)
   * which implement dynamic field discovery via:
   * 1. discoverFields() - snapshot-based analysis
   * 2. analyzeFieldsFromSnapshot() - identify fields by purpose  
   * 3. fallbackFieldDiscovery() - DOM-based discovery with fallbackSelectors.ts
   * 4. Hardcoded fallback via fillForm() mapping
   * 
   * FIELD MAPPINGS (via fillForm):
   * - streetAddress: Maps to 'streetAddress' purpose → smartType discovery
   * 
   * CONTINUE BUTTON (inherited from BaseCarrierAgent.clickContinueButton):
   * - 'button[type="submit"]' (submit type button)
   * - 'button:has-text("Continue")' (text-based button)
   * - 'button:has-text("Next")' (next button variant)
   * 
   * PAGE OBJECT SELECTORS (LibertyMutualAddressPage.ts):
   * The dedicated page object defines robust selector fallbacks for address fields:
   * - '#streetAddress', '#street-address', '#primaryAddress'
   * - 'input[name="streetAddress"]', 'input[name="street_address"]'
   * - 'input[id*="street" i]', 'input[aria-label*="address" i]'
   * - 'input[placeholder*="street" i]'
   * 
   * Continue button selectors:
   * - 'button:has-text("Continue")', 'button:has-text("Next")'
   * - 'button[type="submit"]:has-text("Continue")'
   * - 'input[type="submit"][value="Continue"]'
   * 
   * ARCHITECTURAL NOTES:
   * Unlike other carriers, Liberty Mutual has dedicated page objects (LibertyMutualAddressPage)
   * that encapsulate resilient selector strategies. The agent uses base class dynamic
   * discovery but could leverage these page objects for more robust interactions.
   * 
   * TODO: Integrate LibertyMutualAddressPage selectors into agent implementation
   * TODO: Document actual discovered selectors from Liberty Mutual's address form
   * TODO: Add specific Liberty Mutual address selector patterns to fallbackSelectors.ts
   */
  private async handleAddressStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    await this.fillForm(taskId, { streetAddress: stepData.streetAddress });
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getVehicleFields());
  }

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
    
    const quote = await this.extractQuoteInfo(page);
    if (quote) {
      this.updateTask(taskId, { status: 'completed', quote });
      return this.createCompletedResponse(quote);
    }

    return this.createErrorResponse('Could not retrieve quote after vehicle step.');
  }
  
  private getPersonalInfoFields(): Record<string, FieldDefinition> {
    return {
      firstName: { label: 'First Name', type: 'text', required: true },
      lastName: { label: 'Last Name', type: 'text', required: true },
      dateOfBirth: { label: 'Date of Birth (MM/DD/YYYY)', type: 'date', required: true },
    };
  }

  private getAddressFields(): Record<string, FieldDefinition> {
    return {
      streetAddress: { label: 'Street Address', type: 'text', required: true },
    };
  }
  
  private getVehicleFields(): Record<string, FieldDefinition> {
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

  private generateYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 30; i++) {
      years.push((currentYear - i).toString());
    }
    return years;
  }

  private async handleInitialModal(page: Page, taskId: string): Promise<void> {
    try {
      console.log(`[${this.name}] Checking for initial modal...`);
      
      // Wait a bit for modal to appear
      await page.waitForTimeout(2000);
      
      // Look for the modal and "OK, thanks!" button
      const modalSelectors = [
        'button:has-text("OK, thanks!")',
        'button:has-text("OK thanks")',
        'button:has-text("OK")',
        '[data-testid*="modal"] button',
        '.modal button',
        '[role="dialog"] button'
      ];

      let modalButton;
      for (const selector of modalSelectors) {
        modalButton = page.locator(selector).first();
        if (await modalButton.isVisible({ timeout: 1000 })) {
          console.log(`[${this.name}] Found modal button using selector: ${selector}`);
          break;
        }
        modalButton = null;
      }

      if (modalButton) {
        console.log(`[${this.name}] Dismissing modal...`);
        await modalButton.click();
        // Wait for modal to close
        await page.waitForTimeout(1000);
        console.log(`[${this.name}] Modal dismissed successfully`);
      } else {
        console.log(`[${this.name}] No modal detected, continuing...`);
      }
      
    } catch (error) {
      console.log(`[${this.name}] Modal handling failed, but continuing:`, error instanceof Error ? error.message : 'Unknown error');
      // Don't throw - continue with the flow even if modal handling fails
    }
  }
}

// Export singleton instance
export const libertyMutualAgent = new LibertyMutualAgent(); 