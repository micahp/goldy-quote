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
      
      const page = await this.getBrowserPage(taskId);
      await page.goto('https://www.libertymutual.com/auto-insurance', {
        waitUntil: 'networkidle',
      });
      
      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a Liberty Mutual quote.');
      }
      
      await this.smartType(taskId, 'ZIP code field', 'zipcode', userData.zipCode);
      await this.smartClick(taskId, 'Get my price button', 'start_quote_button');
      
      await this.waitForPageLoad(page);

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
    const url = page.url();
    const content = await page.textContent('body') || '';
    
    if (content.includes('vehicle') || url.includes('vehicle')) return 'vehicle';
    if (content.includes('address') || url.includes('address')) return 'address';
    if (content.includes('about you') || url.includes('personal')) return 'personal_info';
    
    return 'unknown';
  }

  private async handlePersonalInfoStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { firstName, lastName, dateOfBirth } = stepData;

    await this.smartType(taskId, 'First Name', 'first-name', firstName);
    await this.smartType(taskId, 'Last Name', 'last-name', lastName);
    await this.smartType(taskId, 'Date of Birth', 'birth-date', dateOfBirth);

    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getAddressFields());
  }

  private async handleAddressStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    await this.smartType(taskId, 'Street Address', 'address-line-1', stepData.streetAddress);
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getVehicleFields());
  }

  private async handleVehicleStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const vehicle = stepData.vehicles?.[0];

    if (vehicle) {
        await this.smartSelectOption(taskId, 'Vehicle Year', 'vehicle-year', [vehicle.vehicleYear]);
        await this.smartSelectOption(taskId, 'Vehicle Make', 'vehicle-make', [vehicle.vehicleMake]);
        await this.smartSelectOption(taskId, 'Vehicle Model', 'vehicle-model', [vehicle.vehicleModel]);
    }
    
    await this.clickContinueButton(page, taskId);
    
    // This is likely the last step before quotes
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
}

// Export singleton instance
export const libertyMutualAgent = new LibertyMutualAgent(); 