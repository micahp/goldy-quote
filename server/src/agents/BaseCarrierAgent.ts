import { Page } from 'playwright';
import { CarrierAgent, CarrierContext, CarrierResponse, FieldDefinition, TaskState, QuoteResult } from '../types/index.js';
import { LocatorHelpers } from '../helpers/locators.js';
import { browserManager } from '../browser/BrowserManager.js';
import { mcpBrowserService, MCPBrowserService } from '../services/MCPBrowserService.js';

export abstract class BaseCarrierAgent implements CarrierAgent {
  abstract readonly name: string;
  protected tasks: Map<string, TaskState> = new Map();
  protected mcpService: MCPBrowserService;

  constructor() {
    this.mcpService = mcpBrowserService;
  }

  async start(context: CarrierContext): Promise<CarrierResponse> {
    const { taskId, carrier, initialData } = context;
    const task = this.createTask(taskId, carrier);
    task.userData = initialData;

    if (this.mcpService.getStatus().mcpConnected) {
      console.log(`[${this.name}] MCP is connected, creating MCP session for task ${taskId}`);
      task.mcpSessionId = await this.mcpService.createSession(taskId);
      if (!task.mcpSessionId) {
        console.error(`[${this.name}] Failed to create MCP session for ${taskId}, will use fallback.`);
      }
    } else {
      console.log(`[${this.name}] MCP not connected, using direct Playwright for task ${taskId}`);
    }

    this.updateTask(taskId, task);

    // This is a placeholder and should be implemented by each concrete agent
    return this.createWaitingResponse({});
  }

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
    console.log(`[${this.name}] Cleaning up task ${taskId}...`);
    try {
      const task = this.getTask(taskId);
      if (task?.mcpSessionId) {
        await this.mcpService.cleanupSession(taskId);
        console.log(`[${this.name}] MCP session cleaned up for task ${taskId}`);
      }
      
      // Also clean up fallback browser context if it exists
      await browserManager.cleanupContext(taskId);
      
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

  // MCP-enhanced browser interaction methods
  protected async mcpNavigate(taskId: string, url: string): Promise<boolean> {
    const result = await this.mcpService.navigate(taskId, url);
    if (!result.success) {
      console.warn(`[${this.name}] MCP navigate failed: ${result.error}`);
    }
    return result.success;
  }

  protected async mcpClick(taskId: string, element: string, selector: string): Promise<boolean> {
    const result = await this.mcpService.click(taskId, element, selector);
    if (!result.success) {
      console.warn(`[${this.name}] MCP click failed: ${result.error}`);
    }
    return result.success;
  }

  protected async mcpType(taskId: string, element: string, selector: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<boolean> {
    const result = await this.mcpService.type(taskId, element, selector, text, options);
    if (!result.success) {
      console.warn(`[${this.name}] MCP type failed: ${result.error}`);
    }
    return result.success;
  }

  protected async mcpSelectOption(taskId: string, element: string, selector: string, values: string[]): Promise<boolean> {
    const result = await this.mcpService.selectOption(taskId, element, selector, values);
    if (!result.success) {
      console.warn(`[${this.name}] MCP select failed: ${result.error}`);
    }
    return result.success;
  }

  protected async mcpSnapshot(taskId: string): Promise<any> {
    const result = await this.mcpService.snapshot(taskId);
    return result.success ? result.snapshot : null;
  }

  protected async mcpWaitFor(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<boolean> {
    const result = await this.mcpService.waitFor(taskId, options);
    return result.success;
  }

  protected async mcpTakeScreenshot(taskId: string, filename?: string): Promise<string | null> {
    const result = await this.mcpService.takeScreenshot(taskId, filename);
    return result.success ? result.data?.screenshot : null;
  }

  // Hybrid methods that try MCP first, then fallback to direct Playwright
  protected async hybridNavigate(taskId: string, url: string): Promise<void> {
    const mcpSuccess = await this.mcpNavigate(taskId, url);
    if (!mcpSuccess) {
      // Fallback to direct Playwright
      const page = await this.getBrowserPage(taskId);
      await page.goto(url, { waitUntil: 'networkidle' });
    }
  }

  protected async hybridClick(taskId: string, elementDescription: string, selector: string): Promise<void> {
    const mcpSuccess = await this.mcpClick(taskId, elementDescription, selector);
    if (!mcpSuccess) {
      // Fallback to direct Playwright with enhanced element visibility waiting
      const page = await this.getBrowserPage(taskId);
      await this.waitForElementVisible(page, selector);
      await page.locator(selector).first().click();
    }
  }

  protected async hybridType(taskId: string, elementDescription: string, selector: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<void> {
    const mcpSuccess = await this.mcpType(taskId, elementDescription, selector, text, options);
    if (!mcpSuccess) {
      // Fallback to direct Playwright with enhanced safety
      const page = await this.getBrowserPage(taskId);
      await this.safeType(page, selector, text);
      
      if (options?.submit) {
        await page.keyboard.press('Enter');
      }
    }
  }

  protected async hybridSelectOption(taskId: string, elementDescription: string, selector: string, values: string[]): Promise<void> {
    const mcpSuccess = await this.mcpSelectOption(taskId, elementDescription, selector, values);
    if (!mcpSuccess) {
      // Fallback to direct Playwright with enhanced safety
      const page = await this.getBrowserPage(taskId);
      await this.waitForElementVisible(page, selector);
      await page.locator(selector).first().selectOption(values[0]);
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

  // Enhanced element timing strategies
  protected async waitForElementVisible(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    console.log(`[${this.name}] Waiting for element to be visible: ${selector}`);
    try {
      await page.locator(selector).first().waitFor({ 
        state: 'visible', 
        timeout 
      });
    } catch (error) {
      console.error(`[${this.name}] Element not visible within ${timeout}ms: ${selector}`);
      throw error;
    }
  }

  protected async waitForElementAttached(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    console.log(`[${this.name}] Waiting for element to be attached: ${selector}`);
    try {
      await page.locator(selector).first().waitFor({ 
        state: 'attached', 
        timeout 
      });
    } catch (error) {
      console.error(`[${this.name}] Element not attached within ${timeout}ms: ${selector}`);
      throw error;
    }
  }

  protected async safeClick(page: Page, selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    const timeout = options?.timeout || 10000;
    console.log(`[${this.name}] Safe clicking element: ${selector}`);
    
    try {
      // Wait for element to be attached and visible
      await this.waitForElementVisible(page, selector, timeout);
      
      // Additional check for clickability
      await page.locator(selector).first().waitFor({ 
        state: 'visible', 
        timeout: 2000 
      });
      
      // Perform the click
      await page.locator(selector).first().click({ 
        timeout,
        force: options?.force 
      });
      
      console.log(`[${this.name}] Successfully clicked: ${selector}`);
    } catch (error) {
      console.error(`[${this.name}] Failed to click element: ${selector}`, error);
      throw error;
    }
  }

  protected async safeType(page: Page, selector: string, text: string, options?: { timeout?: number; clear?: boolean }): Promise<void> {
    const timeout = options?.timeout || 10000;
    console.log(`[${this.name}] Safe typing into element: ${selector}`);
    
    try {
      // Wait for element to be visible and enabled
      await this.waitForElementVisible(page, selector, timeout);
      
      const locator = page.locator(selector).first();
      
      // Clear existing content if requested
      if (options?.clear !== false) {
        await locator.clear({ timeout });
      }
      
      // Type the text
      await locator.fill(text, { timeout });
      
      console.log(`[${this.name}] Successfully typed into: ${selector}`);
    } catch (error) {
      console.error(`[${this.name}] Failed to type into element: ${selector}`, error);
      throw error;
    }
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
      return h1 ? h1.textContent?.trim() : document.title;
    });

    const url = page.url();

    // Check for various field types with more flexible selectors
    const hasFields = {
      zipCode: await this.hasAnyFormField(page, ['zip', 'postal']),
      firstName: await this.hasAnyFormField(page, ['first', 'fname']),
      lastName: await this.hasAnyFormField(page, ['last', 'lname']),
      email: await this.hasAnyFormField(page, ['email', 'mail']),
      phone: await this.hasAnyFormField(page, ['phone', 'tel']),
      address: await this.hasAnyFormField(page, ['address', 'street']),
      vehicleYear: await this.hasAnyFormField(page, ['year', 'vehicle']),
      vehicleMake: await this.hasAnyFormField(page, ['make', 'brand']),
    };

    // More flexible form type detection
    let formType = 'landing';
    
    // Check if this looks like a quote start page
    const hasQuoteButtons = await page.locator('button, a').filter({ 
      hasText: /get.*quote|start.*quote|quote.*now/i 
    }).count() > 0;
    
    if (hasQuoteButtons) {
      formType = 'landing';
    } else if (hasFields.zipCode && !hasFields.firstName && !hasFields.lastName) {
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

  // Helper method to check for any form field containing keywords
  private async hasAnyFormField(page: Page, keywords: string[]): Promise<boolean> {
    try {
      for (const keyword of keywords) {
        const count = await page.locator(`input, select, textarea`).filter({
          has: page.locator(`[name*="${keyword}"], [id*="${keyword}"], [placeholder*="${keyword}"]`)
        }).count();
        
        if (count > 0) return true;
      }
      return false;
    } catch {
      return false;
    }
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
        await locator.fill(value.toString());
      } catch (error) {
        console.warn(`[${this.name}] Could not fill field ${fieldId}:`, error);
      }
    }
  }

  protected async clickContinueButton(page: Page): Promise<void> {
    const helpers = this.createLocatorHelpers(page);
    
    // Try common continue button patterns
    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button[type="submit"]',
      'input[type="submit"]',
      '.continue-btn',
      '.next-btn',
      '.btn-primary'
    ];

    for (const selector of continueSelectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.count() > 0 && await locator.isVisible()) {
          await locator.click();
          await page.waitForLoadState('networkidle');
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    throw new Error('Could not find continue button');
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    try {
      const helpers = this.createLocatorHelpers(page);
      
      // Look for price information
      const priceSelectors = [
        '.price',
        '.premium',
        '.quote-amount',
        '[data-testid*="price"]',
        '[data-testid*="premium"]',
        'text=/\\$\\d+/'
      ];
      
      let price = 'Quote Available';
      let term = 'month';
      
      for (const selector of priceSelectors) {
        try {
          const locator = page.locator(selector).first();
          if (await locator.count() > 0) {
            const priceText = await locator.textContent();
            if (priceText && priceText.includes('$')) {
              price = priceText.trim();
              break;
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // Extract additional details
      const details = {
        timestamp: new Date().toISOString(),
        url: page.url(),
        pageTitle: await page.title(),
      };
      
      return { 
        price, 
        term, 
        carrier: this.name,
        coverageDetails: details
      };
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      return null;
    }
  }

  // Response helper methods
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

  protected createSuccessResponse(data: Record<string, any>): CarrierResponse {
    return {
      status: 'processing',
      message: data.message,
      ...data,
    };
  }
} 