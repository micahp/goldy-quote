import { Page } from 'playwright';
import { CarrierAgent, CarrierContext, CarrierResponse, FieldDefinition, TaskState, QuoteResult, CarrierStatusMessage } from '../types/index.js';
import { LocatorHelpers } from '../helpers/locators.js';
import { browserManager } from '../browser/BrowserManager.js';
import { browserActions, BrowserActions } from '../services/BrowserActions.js';
import { fallbackSelectors } from './helpers/fallbackSelectors.js';
import { identifyFieldByPurpose } from './helpers/fieldDiscovery.js';
import { waitForElementVisible, waitForElementAttached, safeClick as helperSafeClick, safeType as helperSafeType } from './helpers/elementInteraction.js';
import { broadcast } from '../websocket.js';
import { shouldIncludeRequiredFields, getPayloadVersion } from '../config/websocketConfig.js';

export abstract class BaseCarrierAgent implements CarrierAgent {
  abstract readonly name: string;
  protected tasks: Map<string, TaskState> = new Map();
  protected browserActions: BrowserActions;

  constructor() {
    this.browserActions = browserActions;
  }

  async start(context: CarrierContext): Promise<CarrierResponse> {
    const { taskId, carrier, initialData } = context;
    const task = this.createTask(taskId, carrier);
    task.userData = initialData;

    // From here on we exclusively rely on local Playwright execution. The
    // legacy MCP session-management branches have been removed.
    console.log(`[${this.name}] Using local Playwright context for task ${taskId}`);

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
      // Close any open browser resources for the task
      const task = this.getTask(taskId);
      
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

    // If we're updating the step, ensure requiredFields are populated with proper edge case handling
    if (updates.currentStep !== undefined || updates.status !== undefined) {
      if (this.shouldPopulateRequiredFields(updatedTask.status)) {
        try {
          const stepRequiredFields = this.getStepRequiredFields(updatedTask.currentStep, updatedTask.status);
          updatedTask.requiredFields = this.validateRequiredFields(stepRequiredFields);
        } catch (error) {
          console.error(`[${this.name}] Error getting required fields for step ${updatedTask.currentStep}:`, error);
          updatedTask.requiredFields = {}; // Fallback to empty object
        }
      } else {
        // Clear required fields when not in an input-required state
        updatedTask.requiredFields = {};
      }
    }

    this.tasks.set(taskId, updatedTask);

    // Broadcast updated status with versioning and backward compatibility
    try {
      const statusMessage: CarrierStatusMessage = {
        type: 'carrier_status',
        taskId: updatedTask.taskId,
        carrier: updatedTask.carrier,
        status: updatedTask.status,
        currentStep: updatedTask.currentStep,
        version: getPayloadVersion(),
        // Only include requiredFields if enabled (for backward compatibility)
        ...(shouldIncludeRequiredFields() && {
          requiredFields: this.sanitizeRequiredFieldsForBroadcast(updatedTask.requiredFields)
        })
      };
      broadcast(statusMessage);
    } catch (error) {
      console.error(`[${this.name}] Failed to broadcast carrier status:`, error);
      // Try broadcasting without requiredFields as fallback
      try {
        const fallbackMessage = {
          type: 'carrier_status',
          taskId: updatedTask.taskId,
          carrier: updatedTask.carrier,
          status: updatedTask.status,
          currentStep: updatedTask.currentStep,
          version: getPayloadVersion()
        };
        broadcast(fallbackMessage);
        console.log(`[${this.name}] Fallback broadcast successful (without requiredFields)`);
      } catch (fallbackError) {
        console.error(`[${this.name}] Fallback broadcast also failed:`, fallbackError);
      }
    }

    return updatedTask;
  }

  /**
   * Get required fields for a specific step and status.
   * Subclasses should override this method to provide step-specific field definitions.
   */
  protected getStepRequiredFields(step: number, status: TaskState['status']): Record<string, FieldDefinition> {
    // Default implementation returns empty fields
    // Subclasses should override to provide actual field definitions
    return {};
  }

  /**
   * Validates and sanitizes required fields to handle edge cases
   */
  private validateRequiredFields(requiredFields: Record<string, FieldDefinition> | null | undefined): Record<string, FieldDefinition> {
    // Handle null/undefined case
    if (!requiredFields) {
      return {};
    }

    // Handle case where fields is not an object
    if (typeof requiredFields !== 'object') {
      console.warn(`[${this.name}] Invalid requiredFields type: ${typeof requiredFields}. Returning empty object.`);
      return {};
    }

    // Validate each field definition
    const validatedFields: Record<string, FieldDefinition> = {};
    
    for (const [fieldName, fieldDef] of Object.entries(requiredFields)) {
      try {
        // Skip null/undefined field definitions
        if (!fieldDef || typeof fieldDef !== 'object') {
          console.warn(`[${this.name}] Invalid field definition for "${fieldName}". Skipping.`);
          continue;
        }

        // Ensure required fields have the minimum required properties
        const validatedField: FieldDefinition = {
          ...fieldDef, // Include existing properties first
          type: fieldDef.type || 'text',
          required: fieldDef.required ?? false,
          label: fieldDef.label || fieldName
        };

        // Validate field type
        const validTypes = ['text', 'email', 'password', 'number', 'date', 'select', 'boolean', 'array'];
        if (!validTypes.includes(validatedField.type)) {
          console.warn(`[${this.name}] Invalid field type "${validatedField.type}" for "${fieldName}". Defaulting to "text".`);
          validatedField.type = 'text';
        }

        validatedFields[fieldName] = validatedField;
      } catch (error) {
        console.error(`[${this.name}] Error validating field "${fieldName}":`, error);
        // Skip invalid field definitions
      }
    }

    return validatedFields;
  }

     /**
    * Determines if required fields should be populated based on current task state
    */
   private shouldPopulateRequiredFields(status: TaskState['status']): boolean {
     // Only populate required fields for specific statuses where user input is needed
     const inputRequiredStatuses: TaskState['status'][] = [
       'waiting_for_input',
       'processing',
       'initializing'
     ];
     
     return inputRequiredStatuses.includes(status);
   }

   /**
    * Sanitizes required fields before broadcasting to ensure safe serialization
    */
   private sanitizeRequiredFieldsForBroadcast(requiredFields: Record<string, FieldDefinition> | undefined): Record<string, FieldDefinition> {
     if (!requiredFields) {
       return {};
     }

     try {
       // Ensure the object can be safely serialized to JSON
       const serialized = JSON.stringify(requiredFields);
       return JSON.parse(serialized);
     } catch (error) {
       console.warn(`[${this.name}] RequiredFields failed JSON serialization, returning empty object:`, error);
       return {};
     }
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

  // Element interaction wrappers (delegating to helpers)
  protected async waitForElementVisible(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    await waitForElementVisible(this.name, page, selector, timeout);
  }

  protected async waitForElementAttached(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    await waitForElementAttached(this.name, page, selector, timeout);
  }

  protected async safeClick(page: Page, selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    await helperSafeClick(this.name, page, selector, options || {});
  }

  protected async safeType(page: Page, selector: string, text: string, options?: { timeout?: number; clear?: boolean }): Promise<void> {
    await helperSafeType(this.name, page, selector, text, options || {});
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
    for (const [ourField, theirField] of Object.entries(fieldMappings)) {
      if (formData[ourField]) {
        await this.safeType(page, `[name*="${theirField}"]`, formData[ourField]);
      }
    }
  }

  protected async clickContinueButton(page: Page, taskId: string): Promise<void> {
    const continueSelectors = [
      'button[type="submit"]',
      'button:has-text("Continue")',
      'button:has-text("Next")'
    ];
    
    for (const selector of continueSelectors) {
      if (await page.locator(selector).count() > 0) {
        try {
          await this.hybridClick(taskId, `Continue button (${selector})`, selector);
          return;
        } catch (e) {
          // try next
        }
      }
    }

    throw new Error('Could not find a "Continue" button');
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    // Default implementation, should be overridden by subclasses
    return null;
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
    try {
      // Use the new snapshot feature for reliable, structured data
      const result = await this.browserActions.snapshot(taskId);
      if (result.success && result.snapshot) {
        return this.analyzeFieldsFromSnapshot(result.snapshot, fieldPurposes);
      }
    } catch (error) {
      console.warn(`[${this.name}] Snapshot-based field discovery failed:`, error);
    }
    
    // Fallback to legacy DOM-based discovery if snapshot fails
    return this.fallbackFieldDiscovery(taskId, fieldPurposes);
  }

  protected analyzeFieldsFromSnapshot(snapshot: any, fieldPurposes: string[]): Record<string, string> {
    const discoveredFields: Record<string, string> = {};
    if (!snapshot || !snapshot.elements) {
      return discoveredFields;
    }

    const elements = snapshot.elements ?? [];

    for (const element of elements) {
      for (const purpose of fieldPurposes) {
        const selector = identifyFieldByPurpose(element, purpose);
        if (selector) {
          discoveredFields[purpose] = selector;
          console.log(`[${this.name}] 🎯 Discovered ${purpose} field: ${selector}`);
        }
      }
    }

    return discoveredFields;
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
          await page.locator(selector).first().waitFor({ state: 'visible', timeout: 1500 });
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
    return fallbackSelectors[purpose] || [];
  }

  protected async fillForm(taskId: string, fields: Record<string, string | string[]>, options?: { submit?: boolean }): Promise<void> {
    for (const [purpose, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        await this.smartSelectOption(taskId, purpose, purpose, value);
      } else {
        await this.smartType(taskId, purpose, purpose, value, options);
      }
    }
  }

  // Hybrid methods using dynamic discovery
  protected async smartClick(taskId: string, elementDescription: string, purpose: string): Promise<void> {
    const selectors = await this.discoverFields(taskId, [purpose]);
    const selector = selectors[purpose];
    if (!selector) {
      throw new Error(`Could not discover element for purpose: '${purpose}'`);
    }
    await this.browserActions.click(taskId, elementDescription, selector);
  }

  protected async smartType(taskId: string, elementDescription: string, purpose: string, text: string, options?: { slowly?: boolean; submit?: boolean }): Promise<void> {
    const selectors = await this.discoverFields(taskId, [purpose]);
    const selector = selectors[purpose];
    if (!selector) {
      throw new Error(`Could not discover element for purpose: '${purpose}'`);
    }
    await this.browserActions.type(taskId, elementDescription, selector, text, options);
  }

  /* Hybrid helpers retained temporarily during migration */
  private inferPurposeFromDescription(description: string): string | null {
    const lower = description.toLowerCase();

    const mapping: Record<string, string> = {
      'zip': 'zipcode',
      'postal': 'zipcode',
      'first name': 'firstname',
      'last name': 'lastname',
      'date of birth': 'dateofbirth',
      'dob': 'dateofbirth',
      'email': 'email',
      'phone': 'phone',
      'auto insurance': 'auto_insurance_button',
      'start quote': 'start_quote_button',
      'start my quote': 'start_quote_button',
      'get a quote': 'start_quote_button',
      'continue': 'continue_button',
      'next': 'continue_button',
    };

    // Find first mapping whose key is included in description string
    for (const [key, purpose] of Object.entries(mapping)) {
      if (lower.includes(key)) {
        return purpose;
      }
    }
    return null;
  }

  protected async hybridNavigate(taskId: string, url: string): Promise<void> {
    await this.browserActions.navigate(taskId, url);
  }

  protected async hybridClick(taskId: string, elementDescription: string, fallbackSelector: string): Promise<void> {
    try {
      const purpose = this.inferPurposeFromDescription(elementDescription);
      if (purpose) {
        await this.smartClick(taskId, elementDescription, purpose);
        return;
      }
    } catch (error) {
      // Purpose-driven click failed, fall back to selector
    }
    await this.browserActions.click(taskId, elementDescription, fallbackSelector);
  }

  protected async hybridType(
    taskId: string,
    elementDescription: string,
    fallbackSelector: string,
    text: string,
    options?: { slowly?: boolean; submit?: boolean }
  ): Promise<void> {
    try {
      const purpose = this.inferPurposeFromDescription(elementDescription);
      if (purpose) {
        await this.smartType(taskId, elementDescription, purpose, text, options);
        return;
      }
    } catch (error) {
      // Fallback to selector
    }
    await this.browserActions.type(taskId, elementDescription, fallbackSelector, text, options);
  }

  protected async hybridSelectOption(
    taskId: string,
    elementDescription: string,
    fallbackSelector: string,
    values: string[]
  ): Promise<void> {
    try {
      const purpose = this.inferPurposeFromDescription(elementDescription);
      if (purpose) {
        await this.smartSelectOption(taskId, elementDescription, purpose, values);
        return;
      }
    } catch (error) {
      // Fallback to selector
    }
    await this.browserActions.selectOption(taskId, elementDescription, fallbackSelector, values);
  }

  protected async smartSelectOption(taskId: string, elementDescription: string, purpose: string, values: string[]): Promise<void> {
    const selectors = await this.discoverFields(taskId, [purpose]);
    const selector = selectors[purpose];
    if (!selector) {
      throw new Error(`Could not discover element for purpose: '${purpose}'`);
    }
    // await this.mcpService.selectOption(taskId, elementDescription, selector, values);
  }

  /* Thin wrappers for MCP compatibility */
  /** Lightweight wrapper around BrowserActions.waitFor() kept for backwards-compat.
   *  Renamed from mcpWaitFor to remove MCP terminology. */
  protected async waitForPage(taskId: string, options: { text?: string; textGone?: string; time?: number }): Promise<void> {
    await this.browserActions.waitFor(taskId, options);
  }

  /** Wrapper around BrowserActions.takeScreenshot() – previously mcpTakeScreenshot. */
  protected async captureScreenshot(taskId: string, filename?: string): Promise<void> {
    await this.browserActions.takeScreenshot(taskId, filename);
  }

  // Enhanced page analysis for debugging
  protected async analyzePageElements(page: Page, taskId: string): Promise<{
    inputs: Array<{selector: string, type: string, name: string, id: string, placeholder: string}>;
    selects: Array<{selector: string, name: string, id: string, options: string[]}>;
    buttons: Array<{selector: string, text: string, type: string, name: string, id: string}>;
    clickableElements: Array<{selector: string, text: string, tag: string}>;
  }> {
    console.log(`[${this.name}] 🔍 ANALYZING PAGE ELEMENTS...`);
    
    const analysis = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
        selector: input.tagName.toLowerCase() + 
          (input.id ? `#${input.id}` : '') + 
          (input.name ? `[name="${input.name}"]` : '') +
          (input.className ? `.${input.className.split(' ').join('.')}` : ''),
        type: input.type || 'text',
        name: input.name || '',
        id: input.id || '',
        placeholder: input.placeholder || ''
      }));

      const selects = Array.from(document.querySelectorAll('select')).map(select => ({
        selector: select.tagName.toLowerCase() + 
          (select.id ? `#${select.id}` : '') + 
          (select.name ? `[name="${select.name}"]` : ''),
        name: select.name || '',
        id: select.id || '',
        options: Array.from(select.options).map(opt => opt.text).slice(0, 5) // First 5 options
      }));

      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(button => ({
        selector: button.tagName.toLowerCase() + 
          (button.id ? `#${button.id}` : '') + 
          ((button as HTMLInputElement).name ? `[name="${(button as HTMLInputElement).name}"]` : ''),
        text: button.textContent?.trim() || (button as HTMLInputElement).value || '',
        type: (button as HTMLInputElement).type || 'button',
        name: (button as HTMLInputElement).name || '',
        id: button.id || ''
      }));

      const clickableElements = Array.from(document.querySelectorAll('a[href], [role="button"], [onclick]')).map(el => ({
        selector: el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') + 
          (el.className ? `.${el.className.split(' ').join('.')}` : ''),
        text: el.textContent?.trim().substring(0, 50) || '',
        tag: el.tagName.toLowerCase()
      }));

      return { inputs, selects, buttons, clickableElements };
    });

    // Log the analysis
    console.log(`[${this.name}] 📝 INPUT FIELDS (${analysis.inputs.length}):`);
    analysis.inputs.forEach((input, i) => {
      console.log(`  ${i+1}. ${input.selector} | type: ${input.type} | placeholder: "${input.placeholder}"`);
    });

    console.log(`[${this.name}] 📋 SELECT DROPDOWNS (${analysis.selects.length}):`);
    analysis.selects.forEach((select, i) => {
      console.log(`  ${i+1}. ${select.selector} | options: [${select.options.join(', ')}...]`);
    });

    console.log(`[${this.name}] 🔘 BUTTONS (${analysis.buttons.length}):`);
    analysis.buttons.forEach((button, i) => {
      console.log(`  ${i+1}. ${button.selector} | text: "${button.text}" | type: ${button.type}`);
    });

    console.log(`[${this.name}] 🔗 CLICKABLE ELEMENTS (${analysis.clickableElements.length}):`);
    analysis.clickableElements.slice(0, 10).forEach((el, i) => { // Show first 10
      console.log(`  ${i+1}. ${el.selector} | text: "${el.text}"`);
    });

    await this.browserActions.takeScreenshot(taskId, `page-analysis-${Date.now()}`);
    
    return analysis;
  }
} 