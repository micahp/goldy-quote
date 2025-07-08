import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult, TaskState } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class GeicoAgent extends BaseCarrierAgent {
  readonly name = 'geico';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    const { taskId, userData, debug } = context;
    const page = await this.getBrowserPage(taskId);
    const debugPath = (name: string) => `screenshots/task_${taskId}_${name}.png`;
    const debugHTMLPath = (name: string) => `screenshots/task_${taskId}_${name}.html`;

    try {
      console.log(`[${this.name}] Starting quote process for task: ${taskId}`);
      this.createTask(taskId, this.name);

      await this.browserActions.navigate(taskId, 'https://www.geico.com/');
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-homepage');

      // Wait for the primary ZIP input; allow a bit more time (2 s) so the first
      // snapshot isn't taken before the hero finishes rendering on slower networks.
      await page.waitForSelector('#ssp-service-zip', { state: 'visible', timeout: 2_000 });
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-zip-visible');

      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a GEICO quote.');
      }

      console.log(`[${this.name}] Typing ZIP code ${userData.zipCode}…`);
      await this.smartType(taskId, 'ZIP code field', 'zipcode', userData.zipCode);
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-zip-entered');

      // Click Go to submit ZIP, then wait for Auto card and click it.
      console.log(`[${this.name}] Clicking 'Go' after ZIP entry…`);
      await this.hybridClick(taskId, 'Go button', 'form#zip_service button');
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-go-clicked');

      // Sometimes the lower ZIP field (#zip) remains empty – ensure it's set
      try {
        // Give a slightly longer window (1.5 s) for the secondary ZIP to attach
        await page.waitForSelector('#zip', { timeout: 1_500 });
        const current = await page.locator('#zip').inputValue();
        if (!current) {
          console.log(`[${this.name}] Filling lower ZIP field as well…`);
          await this.browserActions.type(taskId, 'Lower ZIP', '#zip', userData.zipCode);
          if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-lower-zip-filled');
        }
      } catch (_) {
        /* ignore */
      }

      // Now wait briefly and click the Auto card.
      const autoCardSelector = '[data-product="auto"]';
      await page.waitForSelector(autoCardSelector, { state: 'attached', timeout: 800 });
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-before-auto-card-click');
      console.log(`[${this.name}] Selecting 'Auto' insurance product card…`);
      await page.locator(autoCardSelector).first().click();
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-auto-card-clicked');

      // Wait for the Start My Quote CTA (anchor or button) to be present.
      await page.waitForSelector('button:has-text("Start My Quote"), a:has-text("Start My Quote")', { state: 'attached', timeout: 800 });

      console.log(`[${this.name}] Clicking 'Start My Quote' CTA…`);
      await this.hybridClick(taskId, 'Start My Quote button', 'button:has-text("Start My Quote"), a:has-text("Start My Quote")');
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-start-quote-clicked');

      // Handle bundle modal – requires clicking an <input type="submit" value="Continue"> inside .modal-container
      try {
        console.log(`[${this.name}] Checking for bundle modal...`);
        const modalSelector = '.modal-container';
        const continueSelector = `${modalSelector} input[type="submit"][value="Continue"]`;
        // Slightly longer for modal; modals can animate in > 800 ms on low-end
        // devices. 1.5 s strikes a balance between speed and reliability.
        await page.waitForSelector(continueSelector, { state: 'visible', timeout: 1_500 });
        if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-bundle-modal-visible');

        // Ensure ZIP inside modal is populated – some experiments show it's empty.
        try {
          const zipInput = page.locator('#bundle-modal-zip');
          await zipInput.waitFor({ state: 'attached', timeout: 2_000 });
          const currentZip = await zipInput.inputValue();
          if (!currentZip && userData.zipCode) {
            console.log(`[${this.name}] Filling modal ZIP field ${userData.zipCode}…`);
            await zipInput.fill(userData.zipCode);
            if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-bundle-modal-zip-filled');
          }
        } catch (_) {
          // not critical
        }

        console.log(`[${this.name}] Bundle modal found, clicking Continue.`);
        await page.locator(continueSelector).first().click();
        if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-bundle-modal-continue-clicked');
      } catch (_) {
        console.log(`[${this.name}] No bundle modal or Continue not needed.`);
      }

      console.log(`[${this.name}] Waiting for navigation to sales page...`);
      await page.waitForURL(/sales\.geico\.com\/quote/i, { timeout: 45_000 });
      if (debug) await this.browserActions.takeScreenshot(taskId, 'geico-sales-page-reached');

      this.updateTask(taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        currentStepLabel: 'date_of_birth',
      });

      console.log(
        `[${this.name}] Successfully navigated to quote page. Waiting for user input.`
      );
      return this.createWaitingResponse(this.getDateOfBirthFields());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during start';
      console.error(`[${this.name}] Error starting quote process:`, error);
      if (debug) {
        await this.browserActions.takeScreenshot(taskId, 'geico-start-error');
        const html = await page.content();
        await fs.writeFile(debugHTMLPath('geico-start-error'), html);
      }
      this.updateTask(taskId, { status: 'error', error: message });
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
      
      // Optionally perform full page element analysis when debugging
      if (context.debug) {
        await this.analyzePageElements(page, taskId);
      }
      
      switch (currentStep) {
        case 'date_of_birth':
          return await this.handleDateOfBirth(page, context, stepData);
        case 'name_collection':
          return await this.handleNameCollection(page, context, stepData);
        case 'address_collection':
          return await this.handleAddressCollection(page, context, stepData);
        default: {
          await this.browserActions.takeScreenshot(taskId, 'geico-unknown-step');
          const currentUrl = page.url();
          const errorMessage = `Unknown or unhandled step at URL: ${currentUrl}`;
          console.error(`[${this.name}] ${errorMessage}`);
          return this.createErrorResponse(errorMessage);
        }
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
    
    // DEBUG: Log what we actually see on the page
    console.log(`[${this.name}] DEBUG - Page content sample (first 1000 chars):`, content.substring(0, 1000));
    console.log(`[${this.name}] DEBUG - Contains 'Date of Birth':`, content.includes('Date of Birth'));
    console.log(`[${this.name}] DEBUG - Contains 'When were you born':`, content.includes('When were you born'));
    console.log(`[${this.name}] DEBUG - Contains 'address':`, content.includes('address'));
    console.log(`[${this.name}] DEBUG - Contains 'Address':`, content.includes('Address'));
    console.log(`[${this.name}] DEBUG - Current URL:`, page.url());
    
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
    
    // Update task with next step, which will automatically populate requiredFields
    this.updateTask(context.taskId, {
      status: 'waiting_for_input',
      currentStep: 2,
      currentStepLabel: 'name_collection',
    });
    
    return this.createWaitingResponse(this.getNameCollectionFields());
  }

  private async handleNameCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    // ===================================================================
    // STEP 2: NAME COLLECTION - Selector Documentation
    // ===================================================================
    // This step handles the collection of first and last name information.
    // 
    // DYNAMIC SELECTOR DISCOVERY:
    // - Uses smartType() which first attempts snapshot-based field discovery
    // - Falls back to predefined selectors from fallbackSelectors.ts
    // 
    // DOCUMENTED SELECTORS FOR STEP 2 FIELDS:
    // 
    // First Name Field:
    // Primary selectors (via fieldDiscovery.ts patterns):
    //   - input[name*="first" i] (case-insensitive substring match)
    //   - input[id*="first" i] (case-insensitive substring match)
    //   - input[aria-label*="first" i]
    // Fallback selectors (via fallbackSelectors.ts):
    //   - [name="firstName"] (exact match)
    //   - [name*="first" i] (case-insensitive substring)
    //   - [id*="first" i] (case-insensitive substring)
    //   - [placeholder*="first" i] (placeholder text)
    //   - [aria-label*="first" i] (accessibility label)
    //   - [id*="FirstName"] (Pascal case variant)
    //
    // Last Name Field:
    // Primary selectors (via fieldDiscovery.ts patterns):
    //   - input[name*="last" i] (case-insensitive substring match)
    //   - input[id*="last" i] (case-insensitive substring match)
    //   - input[aria-label*="last" i]
    // Fallback selectors (via fallbackSelectors.ts):
    //   - [name="lastName"] (exact match)
    //   - [name*="last" i] (case-insensitive substring)
    //   - [id*="last" i] (case-insensitive substring)
    //   - [placeholder*="last" i] (placeholder text)
    //   - [aria-label*="last" i] (accessibility label)
    //   - [id*="LastName"] (Pascal case variant)
    //
    // TODO: Add monitoring for failed selector discovery to identify when
    //       GEICO changes their form structure and new selectors are needed
    //
    // TODO: Consider adding GEICO-specific selector patterns if the generic
    //       patterns prove insufficient (e.g., GEICO-specific CSS classes)
    //
    // TODO: Add validation that the discovered selectors are actually visible
    //       and interactable before attempting to type in them
    // ===================================================================

    await this.smartType(context.taskId, 'First Name', 'firstName', stepData.firstName);
    await this.smartType(context.taskId, 'Last Name', 'lastName', stepData.lastName);
    await this.clickNextButton(page, context.taskId);
    
    // Update task with next step, which will automatically populate requiredFields
    this.updateTask(context.taskId, {
      status: 'waiting_for_input',
      currentStep: 3,
      currentStepLabel: 'address_collection',
    });
    
    return this.createWaitingResponse(this.getAddressCollectionFields());
  }

  private async handleAddressCollection(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    await this.smartType(context.taskId, 'Street Address', 'address', stepData.streetAddress);
    // GEICO often auto-fills city/state from ZIP, so we just continue
    await this.clickNextButton(page, context.taskId);
    
    // This is a guess, the flow after address is complex.
    // Returning an empty waiting response to signal the frontend to ask for the next logical step.
    return this.createWaitingResponse({});
  }

  private async clickNextButton(page: Page, taskId: string): Promise<void> {
    // ===================================================================
    // STEP 2: CONTINUE/NEXT BUTTON - Selector Documentation  
    // ===================================================================
    // The GEICO flow sometimes labels the progression button as "Continue" instead of "Next".
    // 
    // DYNAMIC SELECTOR DISCOVERY:
    // - Uses hybridClick() which first attempts dynamic discovery via the `continue_button`
    //   purpose and falls back to hardcoded selectors if that fails.
    //
    // DOCUMENTED SELECTORS FOR CONTINUE/NEXT BUTTON:
    //
    // Dynamic discovery selectors (via fieldDiscovery.ts and fallbackSelectors.ts):
    //   - button:has-text("Continue") (text-based match for Continue)
    //   - button:has-text("Next") (text-based match for Next) 
    //   - [data-cy="continue"] (test attribute)
    //   - input[type="submit"][value="Continue"] (submit input with Continue value)
    //
    // Hardcoded fallback selectors (used if dynamic discovery fails):
    //   - button[type="submit"]:has-text("Next") (submit button with Next text)
    //   - button:has-text("Continue") (any button with Continue text)
    //
    // TODO: Monitor for GEICO-specific button classes or IDs that could be added
    //       to improve selector reliability (e.g., .geico-continue-btn)
    //
    // TODO: Add fallback for button positioning selectors if text-based selectors
    //       fail (e.g., form button:last-child, .form-actions button)
    //
    // TODO: Consider adding aria-label based selectors for accessibility compliance
    //       (e.g., button[aria-label*="continue"], button[aria-label*="next"])
    // ===================================================================

    // Use the hybridClick helper so we first attempt dynamic discovery via the `continue_button`
    // purpose and fall back to generic selectors if that fails.
    await this.hybridClick(
      taskId,
      'Next button',
      'button[type="submit"]:has-text("Next"), button:has-text("Continue")'
    );
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

  /**
   * Override to provide GEICO-specific step-to-field mappings
   */
  protected getStepRequiredFields(step: number, status: TaskState['status']): Record<string, FieldDefinition> {
    // Only return required fields when waiting for input or processing
    if (status !== 'waiting_for_input' && status !== 'processing') {
      return {};
    }

    switch (step) {
      case 1:
        return this.getDateOfBirthFields();
      case 2:
        return this.getNameCollectionFields();
      case 3:
        return this.getAddressCollectionFields();
      default:
        return {};
    }
  }
}