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
    const continueButton = await helpers.getContinueButton();
    if (continueButton) {
      await continueButton.click();
      await this.waitForPageLoad(page);
    } else {
      console.warn(`[${this.name}] Could not find a continue button on the page.`);
    }
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    this.updateTask(page.mainFrame().url(), { status: 'extracting_quote' });
    
    // Example: This would be highly carrier-specific
    const priceSelector = '.final-price';
    const coverageSelector = '.coverage-summary';

    try {
      await this.waitForElementVisible(page, priceSelector, 15000);
      
      const priceText = await page.locator(priceSelector).first().textContent();
      const coverageText = await page.locator(coverageSelector).first().textContent();

      if (!priceText) return null;

      const premium = parseFloat(priceText.replace(/[^0-9.]/g, ''));

      return {
        carrier: this.name,
        premium,
        coverages: [{
          name: 'Summary',
          details: coverageText || 'Not available'
        }],
      };
    } catch (error) {
      console.error(`[${this.name}] Could not extract quote info:`, error);
      await this.takeScreenshot(page, 'quote-extraction-error');
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
      status: 'success',
      ...data,
    };
  }

  // Enhanced dynamic field discovery methods
  protected async discoverFields(taskId: string, fieldPurposes: string[]): Promise<Record<string, string>> {
    console.log(`[${this.name}] Discovering fields using MCP snapshot for task ${taskId}:`, fieldPurposes);
    const result = await this.mcpService.snapshot(taskId);
    if (result.success && result.snapshot) {
      const discovered = this.analyzeFieldsFromSnapshot(result.snapshot, fieldPurposes);
      console.log(`[${this.name}] Discovered fields from snapshot:`, discovered);
      return discovered;
    }

    console.warn(`[${this.name}] MCP snapshot failed, falling back to heuristic discovery.`);
    return this.fallbackFieldDiscovery(taskId, fieldPurposes);
  }

  protected analyzeFieldsFromSnapshot(snapshot: any, fieldPurposes: string[]): Record<string, string> {
    const discoveredFields: Record<string, string> = {};
    const elements = snapshot?.nodes || [];
    
    if (!snapshot || !snapshot.elements) {
      return discoveredFields;
    }

    for (const element of snapshot.elements) {
      for (const purpose of fieldPurposes) {
        const selector = this.identifyFieldByPurpose(element, purpose);
        if (selector) {
          discoveredFields[purpose] = selector;
          console.log(`[${this.name}] 🎯 Discovered ${purpose} field: ${selector}`);
        }
      }
    }

    return discoveredFields;
  }

  protected identifyFieldByPurpose(element: any, purpose: string): string | null {
    const { tag, attributes, text, ref } = element;
    
    // Skip non-input elements for most purposes
    if (!['input', 'select', 'textarea', 'button'].includes(tag?.toLowerCase())) {
      if (purpose !== 'button' && purpose !== 'link') return null;
    }

    const fieldPatterns: Record<string, {
      attributes?: string[];
      text?: string[];
      types?: string[];
      maxlength?: number[];
    }> = {
      zipcode: {
        attributes: ['name*=zip', 'id*=zip', 'placeholder*=zip'],
        text: ['zip code', 'postal code'],
        types: ['tel', 'text'],
        maxlength: [5]
      },
      email: {
        attributes: ['type=email', 'name*=email', 'id*=email'],
        text: ['email', 'e-mail'],
        types: ['email']
      },
      firstname: {
        attributes: ['name*=first', 'id*=first', 'placeholder*=first'],
        text: ['first name', 'given name'],
        types: ['text']
      },
      lastname: {
        attributes: ['name*=last', 'id*=last', 'placeholder*=last'],
        text: ['last name', 'surname', 'family name'],
        types: ['text']
      },
      dateofbirth: {
        attributes: ['name*=birth', 'name*=dob', 'id*=birth', 'placeholder*=birth'],
        text: ['date of birth', 'birthday', 'birth date'],
        types: ['text', 'date']
      },
      phone: {
        attributes: ['name*=phone', 'id*=phone', 'type=tel'],
        text: ['phone', 'telephone', 'mobile'],
        types: ['tel', 'text']
      },
      address: {
        attributes: ['name*=address', 'name*=street', 'id*=address'],
        text: ['address', 'street'],
        types: ['text']
      },
      auto_insurance_button: {
        attributes: ['href*=auto'],
        text: ['auto insurance', 'car insurance', 'vehicle insurance'],
        types: ['button', 'link']
      },
      start_quote_button: {
        attributes: ['data-action*=quote', 'name*=quote', 'id*=quote'],
        text: ['start quote', 'get quote', 'quote', 'start my quote'],
        types: ['button', 'submit']
      },
      continue_button: {
        text: ['continue', 'next', 'proceed'],
        types: ['button', 'submit']
      }
    };

    const pattern = fieldPatterns[purpose];
    if (!pattern) return null;

    // Check attributes
    if (pattern.attributes && attributes) {
      for (const attrPattern of pattern.attributes) {
        if (this.matchesAttributePattern(attributes, attrPattern)) {
          return ref || this.buildSelector(element);
        }
      }
    }

    // Check text content
    if (pattern.text && text) {
      for (const textPattern of pattern.text) {
        if (text.toLowerCase().includes(textPattern.toLowerCase())) {
          return ref || this.buildSelector(element);
        }
      }
    }

    // Check input type
    if (pattern.types && attributes?.type) {
      if (pattern.types.includes(attributes.type.toLowerCase())) {
        return ref || this.buildSelector(element);
      }
    }

    // Check maxlength for ZIP codes
    if (pattern.maxlength && attributes?.maxlength) {
      if (pattern.maxlength.includes(parseInt(attributes.maxlength))) {
        return ref || this.buildSelector(element);
      }
    }

    return null;
  }

  private matchesAttributePattern(attributes: Record<string, any>, pattern: string): boolean {
    const [attr, condition] = pattern.split('*=');
    const value = attributes[attr];
    
    if (!value) return false;

    if (pattern.includes('*=')) {
      return value.toLowerCase().includes(condition.toLowerCase());
    } else {
      return value.toLowerCase() === condition.toLowerCase();
    }
  }

  private buildSelector(element: any): string {
    const { tag, attributes } = element;
    
    if (attributes?.id) {
      return `#${attributes.id}`;
    }
    
    if (attributes?.name) {
      return `${tag}[name="${attributes.name}"]`;
    }
    
    if (attributes?.class) {
      return `${tag}.${attributes.class.split(' ')[0]}`;
    }
    
    return tag;
  }

  private async fallbackFieldDiscovery(taskId: string, fieldPurposes: string[]): Promise<Record<string, string>> {
    const page = await this.getBrowserPage(taskId);
    const discoveredFields: Record<string, string> = {};

    console.log(`[${this.name}] Using fallback field discovery for purposes:`, fieldPurposes);

    for (const purpose of fieldPurposes) {
      const selectors = this.getFallbackSelectors(purpose);
      for (const selector of selectors) {
        try {
          // Use a short timeout to quickly check for element presence
          await page.locator(selector).first().waitFor({ state: 'visible', timeout: 250 });
          discoveredFields[purpose] = selector;
          console.log(`[${this.name}] Found fallback field for '${purpose}': ${selector}`);
          break; // Found it, move to next purpose
        } catch (e) {
          // Not found, try next selector
        }
      }
    }

    return discoveredFields;
  }

  private getFallbackSelectors(purpose: string): string[] {
    // This could be made much more sophisticated
    const commonSelectors: Record<string, string[]> = {
      'continue_button': ['button:has-text("Continue")', 'button:has-text("Next")', '[data-cy="continue"]'],
      'zip_code': ['[name="zip"]', '[name="zipCode"]', '[id*="zip"]'],
      'first_name': ['[name="firstName"]', '[id*="FirstName"]'],
      'last_name': ['[name="lastName"]', '[id*="LastName"]'],
      // Add more fallback selectors here
    };

    return commonSelectors[purpose] || [];
  }

  // Enhanced hybrid methods that use dynamic discovery
  protected async smartClick(taskId: string, elementDescription: string, purpose: string): Promise<void> {
    const fields = await this.discoverFields(taskId, [purpose]);
    const selector = fields[purpose];

    if (!selector) {
      throw new Error(`[${this.name}] Smart click failed: Could not discover selector for purpose '${purpose}'`);
    }

    await this.mcpService.click(taskId, elementDescription, selector);
  }

  protected async smartType(taskId: string, elementDescription: string, purpose: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<void> {
    const fields = await this.discoverFields(taskId, [purpose]);
    const selector = fields[purpose];

    if (!selector) {
      throw new Error(`[${this.name}] Smart type failed: Could not discover selector for purpose '${purpose}'`);
    }
    
    await this.mcpService.type(taskId, elementDescription, selector, text, options);
  }
} 