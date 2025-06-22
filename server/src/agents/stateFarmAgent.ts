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
      
      await this.smartType(taskId, 'ZIP code field', 'zipcode', userData.zipCode);
      await this.smartClick(taskId, 'Start Quote button', 'start_quote_button');
      
      const page = await this.getBrowserPage(taskId);
      await page.waitForURL(/\/quote/, { timeout: 15000 });

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
    const url = page.url();
    if (url.includes('/vehicle')) return 'vehicle_info';
    if (url.includes('/driver')) return 'driver_details';
    if (url.includes('/coverage')) return 'coverage_selection';
    if (url.includes('/rates') || url.includes('/final')) return 'quote_results';
    // Default to personal_info after the initial zip step
    if (url.includes('/quote')) return 'personal_info';
    return 'unknown';
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
      console.log(`[${this.name}] Quote info not found on page, continuing process.`);
      return null;
    }
  }

  private async handlePersonalInfoStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { firstName, lastName, dateOfBirth } = stepData;

    await this.smartType(taskId, 'First Name', 'firstName', firstName);
    await this.smartType(taskId, 'Last Name', 'lastName', lastName);
    await this.smartType(taskId, 'Date of Birth', 'dateOfBirth', dateOfBirth);
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getVehicleInfoFields());
  }
  
  private async handleVehicleStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const vehicle = stepData.vehicles?.[0];

    if (vehicle) {
        await this.smartSelectOption(taskId, 'Vehicle Year', 'vehicleYear', [vehicle.vehicleYear]);
        await this.smartSelectOption(taskId, 'Vehicle Make', 'vehicleMake', [vehicle.vehicleMake]);
        await this.smartSelectOption(taskId, 'Vehicle Model', 'vehicleModel', [vehicle.vehicleModel]);
    }

    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getDriverDetailsFields());
  }

  private async handleDriverDetailsStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { gender, maritalStatus } = stepData;

    await this.smartSelectOption(taskId, 'Gender', 'gender', [gender]);
    await this.smartSelectOption(taskId, 'Marital Status', 'maritalStatus', [maritalStatus]);
    
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