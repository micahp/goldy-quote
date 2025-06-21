import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class GeicoAgent extends BaseCarrierAgent {
  readonly name = 'GEICO';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    const { taskId, userData } = context;
    try {
      console.log(`[${this.name}] Starting quote process for task: ${taskId}`);
      this.createTask(taskId, this.name);

      const page = await this.getBrowserPage(taskId);
      await page.goto('https://www.geico.com/', { waitUntil: 'networkidle' });
      
      await this.smartClick(taskId, 'Auto insurance selection', 'auto_insurance_button');
      
      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a GEICO quote.');
      }
      
      // Wait for the zip field to be visible as it sometimes animates in
      await this.waitForElementVisible(page, '[id*="zip"]', 8000);
      await this.smartType(taskId, 'ZIP code input field', 'zipcode', userData.zipCode);

      await this.smartClick(taskId, 'Start quote button', 'start_quote_button');
      
      await page.waitForURL(/sales\.geico\.com\/quote/i, { timeout: 15000 });
      
      this.updateTask(taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        requiredFields: this.getDateOfBirthFields(),
      });

      return this.createWaitingResponse(this.getDateOfBirthFields());

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during start';
      console.error(`[${this.name}] Error starting quote process:`, error);
      this.updateTask(taskId, { status: 'error', error: message });
      await this.browserActions.takeScreenshot(taskId, 'geico-start-error');
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
        case 'date_of_birth':
          return await this.handleDateOfBirth(page, context, stepData);
        case 'name_collection':
          return await this.handleNameCollection(page, context, stepData);
        case 'address_collection':
          return await this.handleAddressCollection(page, context, stepData);
        default:
           await this.browserActions.takeScreenshot(taskId, 'geico-unknown-step');
          return this.createErrorResponse(`Unknown or unhandled step: ${currentStep}`);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during step';
      console.error(`[${this.name}] Error processing step:`, error);
      this.updateTask(taskId, { status: 'error', error: message });
      await this.browserActions.takeScreenshot(taskId, 'geico-step-error');
      return this.createErrorResponse(message);
    }
  }

  private async identifyCurrentStep(page: Page): Promise<string> {
    const content = await page.textContent('body') || '';
    
    if (content.includes('Date of Birth') || content.includes('When were you born')) {
      return 'date_of_birth';
    }
    if (content.includes('Tell us about yourself') && (content.includes('First Name') || content.includes('Last Name'))) {
      return 'name_collection';
    }
    if (content.includes('address') || content.includes('Address')) {
      return 'address_collection';
    }
    return 'unknown';
  }

  private async handleDateOfBirth(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Date of Birth', 'dateOfBirth', stepData.dateOfBirth);
    await this.clickNextButton(page, context.taskId);
    return this.createWaitingResponse(this.getNameCollectionFields());
  }

  private async handleNameCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'First Name', 'firstName', stepData.firstName);
    await this.smartType(context.taskId, 'Last Name', 'lastName', stepData.lastName);
    await this.clickNextButton(page, context.taskId);
    return this.createWaitingResponse(this.getAddressCollectionFields());
  }

  private async handleAddressCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Street Address', 'streetAddress', stepData.streetAddress);
    // GEICO often auto-fills city/state from ZIP, so we just continue
    await this.clickNextButton(page, context.taskId);
    
    // This is a guess, the flow after address is complex.
    // Returning an empty waiting response to signal the frontend to ask for the next logical step.
    return this.createWaitingResponse({});
  }

  private async clickNextButton(page: Page, taskId: string): Promise<void> {
    await this.browserActions.click(taskId, 'Next button', 'button[type="submit"]:has-text("Next")');
  }

  private getDateOfBirthFields(): Record<string, FieldDefinition> {
    return {
      dateOfBirth: { label: 'Date of Birth (MM/DD/YYYY)', type: 'date', required: true },
    };
  }

  private getNameCollectionFields(): Record<string, FieldDefinition> {
    return {
      firstName: { label: 'First Name', type: 'text', required: true },
      lastName: { label: 'Last Name', type: 'text', required: true },
    };
  }

  private getAddressCollectionFields(): Record<string, FieldDefinition> {
    return {
      streetAddress: { label: 'Street Address', type: 'text', required: true },
    };
  }
}