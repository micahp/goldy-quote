import { Page } from 'playwright';
import { CarrierAgent, CarrierContext, CarrierResponse, FieldDefinition, TaskState } from '../types/index.js';
import { LocatorHelpers } from '../helpers/locators.js';
import { browserManager } from '../browser/BrowserManager.js';

export abstract class BaseCarrierAgent implements CarrierAgent {
  abstract readonly name: string;
  protected tasks: Map<string, TaskState> = new Map();

  abstract start(context: CarrierContext): Promise<CarrierResponse>;
  abstract step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse>;

  async status(taskId: string): Promise<Pick<TaskState, 'status' | 'currentStep' | 'error'>> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { status: 'error', currentStep: 0, error: 'Task not found' };
    }

    return {
      status: task.status,
      currentStep: task.currentStep,
      error: task.error,
    };
  }

  async cleanup(taskId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`[${this.name}] Cleaning up task: ${taskId}`);
      
      // Close the browser page/context for this task
      await browserManager.closePage(taskId);
      
      // Remove task from memory
      this.tasks.delete(taskId);
      
      return { success: true, message: 'Task cleaned up successfully' };
    } catch (error) {
      console.error(`[${this.name}] Error cleaning up task ${taskId}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown cleanup error' 
      };
    }
  }

  // Protected helper methods for subclasses
  protected createTask(taskId: string, carrier: string): TaskState {
    const task: TaskState = {
      taskId,
      carrier,
      status: 'initializing',
      currentStep: 0,
      requiredFields: {},
      userData: {},
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.tasks.set(taskId, task);
    return task;
  }

  protected updateTask(taskId: string, updates: Partial<TaskState>): TaskState | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const updatedTask = {
      ...task,
      ...updates,
      lastActivity: new Date(),
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  protected getTask(taskId: string): TaskState | null {
    return this.tasks.get(taskId) || null;
  }

  protected async getBrowserPage(taskId: string): Promise<Page> {
    const { page } = await browserManager.getBrowserContext(taskId);
    return page;
  }

  protected createLocatorHelpers(page: Page): LocatorHelpers {
    return new LocatorHelpers(page);
  }

  protected async takeScreenshot(page: Page, filename: string): Promise<string> {
    const helpers = this.createLocatorHelpers(page);
    return await helpers.takeScreenshot(`${this.name}-${filename}-${Date.now()}.png`);
  }

  protected async waitForPageLoad(page: Page): Promise<void> {
    const helpers = this.createLocatorHelpers(page);
    await helpers.waitForPageLoad();
  }

  protected async retryWithScreenshot<T>(
    page: Page,
    action: () => Promise<T>,
    actionName: string,
    maxRetries: number = 1
  ): Promise<T> {
    const helpers = this.createLocatorHelpers(page);
    
    try {
      return await helpers.retryAction(action, maxRetries);
    } catch (error) {
      // Take screenshot on failure
      await this.takeScreenshot(page, `error-${actionName}`);
      throw error;
    }
  }

  // Common form analysis methods
  protected async analyzeCurrentPage(page: Page): Promise<{
    formType: string;
    hasFields: Record<string, boolean>;
    pageTitle: string;
    url: string;
  }> {
    const helpers = this.createLocatorHelpers(page);
    
    const pageTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1, .page-title, .form-title');
      return h1 ? h1.textContent?.trim() : '';
    });

    const url = page.url();

    // Check for various field types
    const hasFields = {
      zipCode: await helpers.isVisible(helpers.getZipCodeField()),
      firstName: await helpers.isVisible(helpers.getFirstNameField()),
      lastName: await helpers.isVisible(helpers.getLastNameField()),
      email: await helpers.isVisible(helpers.getEmailField()),
      phone: await helpers.isVisible(helpers.getPhoneField()),
      address: await helpers.isVisible(helpers.getAddressField()),
      vehicleYear: await helpers.isVisible(helpers.getVehicleYearField()),
      vehicleMake: await helpers.isVisible(helpers.getVehicleMakeField()),
    };

    // Determine form type based on visible fields
    let formType = 'unknown';
    if (hasFields.zipCode && !hasFields.firstName && !hasFields.lastName) {
      formType = 'zipCode';
    } else if (hasFields.firstName || hasFields.lastName) {
      formType = 'personalInfo';
    } else if (hasFields.address) {
      formType = 'address';
    } else if (hasFields.vehicleYear || hasFields.vehicleMake) {
      formType = 'vehicle';
    }

    return { formType, hasFields, pageTitle: pageTitle || '', url };
  }

  protected async fillFormFields(
    page: Page,
    formData: Record<string, any>,
    fieldMappings: Record<string, string>
  ): Promise<void> {
    const helpers = this.createLocatorHelpers(page);

    for (const [fieldId, value] of Object.entries(formData)) {
      if (!value) continue;

      const fieldName = fieldMappings[fieldId];
      if (!fieldName) continue;

      try {
        const locator = helpers.getByFieldName(fieldName);
        
        if (await helpers.isVisible(locator)) {
          const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
          
          if (tagName === 'select') {
            await helpers.selectOption(locator, value);
          } else {
            await helpers.fillField(locator, value);
          }
          
          console.log(`[${this.name}] Filled field ${fieldName} with value: ${value}`);
        }
      } catch (error) {
        console.warn(`[${this.name}] Failed to fill field ${fieldName}:`, error);
      }
    }
  }

  protected async clickContinueButton(page: Page): Promise<void> {
    const helpers = this.createLocatorHelpers(page);
    
    try {
      const continueButton = helpers.getContinueButton();
      await helpers.clickButton(continueButton);
      console.log(`[${this.name}] Clicked continue button`);
    } catch (error) {
      console.error(`[${this.name}] Failed to click continue button:`, error);
      throw error;
    }
  }

  protected async extractQuoteInfo(page: Page): Promise<{
    price: string;
    term: string;
    details: Record<string, any>;
  } | null> {
    try {
      // This is a base implementation that subclasses should override
      // Look for common quote patterns
      const quoteInfo = await page.evaluate(() => {
        // Look for price patterns
        const priceElements = document.querySelectorAll('*');
        let price = '';
        let term = '';

        for (const element of priceElements) {
          const text = element.textContent || '';
          
          // Look for price patterns like $123.45, $123/month, etc.
          const priceMatch = text.match(/\$\d+(?:\.\d{2})?(?:\/(?:month|mo|monthly))?/);
          if (priceMatch && !price) {
            price = priceMatch[0];
          }

          // Look for term patterns
          const termMatch = text.match(/(?:6|12)\s*(?:month|mo)/i);
          if (termMatch && !term) {
            term = termMatch[0];
          }
        }

        return { price, term };
      });

      if (quoteInfo.price) {
        return {
          price: quoteInfo.price,
          term: quoteInfo.term || '6 months',
          details: {},
        };
      }

      return null;
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      return null;
    }
  }

  // Error handling helpers
  protected createErrorResponse(error: string): CarrierResponse {
    return {
      status: 'error',
      error,
    };
  }

  protected createWaitingResponse(fields: Record<string, FieldDefinition>): CarrierResponse {
    return {
      status: 'waiting_for_input',
      requiredFields: fields,
    };
  }

  protected createCompletedResponse(quote: any): CarrierResponse {
    return {
      status: 'completed',
      quote,
    };
  }
} 