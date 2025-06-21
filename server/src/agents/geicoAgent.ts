import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class GeicoAgent extends BaseCarrierAgent {
  readonly name = 'geico';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    const { taskId, userData } = context;
    const page = await this.getBrowserPage(taskId);
    try {
      console.log(`[${this.name}] Starting quote process for task: ${taskId}`);
      this.createTask(taskId, this.name);

      await this.browserActions.navigate(taskId, 'https://www.geico.com/');

      // Wait until the primary ZIP input is visible instead of a fixed delay
      await page.waitForSelector('#ssp-service-zip', { state: 'visible', timeout: 10_000 });

      // -------------------------------------------------------------------
      // ⚠️  DEBUGGING: Dump full rendered HTML + screenshot for offline inspection
      // -------------------------------------------------------------------
      const htmlContent = await page.content();
      const debugDir = path.resolve(process.cwd(), 'server', 'test-results');
      await fs.mkdir(debugDir, { recursive: true });
      const debugFilePath = path.join(debugDir, `geico-debug-${taskId}.html`);
      await fs.writeFile(debugFilePath, htmlContent);
      await this.browserActions.takeScreenshot(taskId, 'geico-debug-screenshot');

      // -------------------------------------------------------------------
      //  MAIN FLOW – enter ZIP, select product, start quote
      // -------------------------------------------------------------------

      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a GEICO quote.');
      }

      console.log(`[${this.name}] Typing ZIP code ${userData.zipCode}…`);
      await this.smartType(taskId, 'ZIP code field', 'zipcode', userData.zipCode);

      // Fast path: try to click the Auto product card immediately – it usually appears as soon as the ZIP is typed.
      const autoCardSelector = '[data-product="auto"]';
      let autoClicked = false;
      try {
        await page.waitForSelector(autoCardSelector, { state: 'attached', timeout: 1_000 });
        console.log(`[${this.name}] Selecting 'Auto' insurance product card (fast-path)…`);
        await page.locator(autoCardSelector).first().click();
        autoClicked = true;
      } catch (_) {
        console.log(`[${this.name}] Auto card not ready within 1 s – falling back to Go-then-click flow.`);
      }

      if (!autoClicked) {
        // Click Go to submit ZIP, then wait for Auto card and click it.
        console.log(`[${this.name}] Clicking 'Go' after ZIP entry…`);
        await this.hybridClick(taskId, 'Go button', 'form#zip_service button');

        // Sometimes the lower ZIP field (#zip) remains empty – ensure it's set
        try {
          await page.waitForSelector('#zip', { timeout: 4000 });
          const current = await page.locator('#zip').inputValue();
          if (!current) {
            console.log(`[${this.name}] Filling lower ZIP field as well…`);
            await this.browserActions.type(taskId, 'Lower ZIP', '#zip', userData.zipCode);
          }
        } catch (_) {
          /* ignore */
        }

        // Now wait briefly and click the Auto card.
        await page.waitForSelector(autoCardSelector, { state: 'attached', timeout: 2_000 });
        console.log(`[${this.name}] Selecting 'Auto' insurance product card (fallback)…`);
        await page.locator(autoCardSelector).first().click();
      }

      // Wait for the Start My Quote CTA (anchor or button) to be present.
      await page.waitForSelector('button:has-text("Start My Quote"), a:has-text("Start My Quote")', { state: 'attached', timeout: 4_000 });

      console.log(`[${this.name}] Clicking 'Start My Quote' CTA…`);
      await this.hybridClick(taskId, 'Start My Quote button', 'button:has-text("Start My Quote"), a:has-text("Start My Quote")');

      // Handle bundle modal – requires clicking an <input type="submit" value="Continue"> inside .modal-container
      try {
        console.log(`[${this.name}] Checking for bundle modal...`);
        const modalSelector = '.modal-container';
        const continueSelector = `${modalSelector} input[type="submit"][value="Continue"]`;
        await page.waitForSelector(continueSelector, { state: 'visible', timeout: 5_000 });

        // Ensure ZIP inside modal is populated – some experiments show it's empty.
        try {
          const zipInput = page.locator('#bundle-modal-zip');
          await zipInput.waitFor({ state: 'attached', timeout: 2_000 });
          const currentZip = await zipInput.inputValue();
          if (!currentZip && userData.zipCode) {
            console.log(`[${this.name}] Filling modal ZIP field ${userData.zipCode}…`);
            await zipInput.fill(userData.zipCode);
          }
        } catch (_) {
          // not critical
        }

        console.log(`[${this.name}] Bundle modal found, clicking Continue.`);
        await page.locator(continueSelector).first().click();
      } catch (_) {
        console.log(`[${this.name}] No bundle modal or Continue not needed.`);
      }

      console.log(`[${this.name}] Waiting for navigation to sales page...`);
      await page.waitForURL(/sales\.geico\.com\/quote/i, { timeout: 45_000 });

      this.updateTask(taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        requiredFields: this.getDateOfBirthFields(),
      });

      console.log(
        `[${this.name}] Successfully navigated to quote page. Waiting for user input.`
      );
      return this.createWaitingResponse(this.getDateOfBirthFields());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during start';
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
    try {
      await this.smartType(context.taskId, 'Street Address', 'streetAddress', stepData.streetAddress);
    } catch (streetErr) {
      console.warn(`[${this.name}] streetAddress field not found via purpose 'streetAddress', trying generic 'address' purpose…`);
      await this.smartType(context.taskId, 'Address', 'address', stepData.streetAddress);
    }
    // GEICO often auto-fills city/state from ZIP, so we just continue
    await this.clickNextButton(page, context.taskId);
    
    // This is a guess, the flow after address is complex.
    // Returning an empty waiting response to signal the frontend to ask for the next logical step.
    return this.createWaitingResponse({});
  }

  private async clickNextButton(page: Page, taskId: string): Promise<void> {
    // The GEICO flow sometimes labels the progression button as "Continue" instead of "Next".
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

  private async legacyStart(context: CarrierContext): Promise<void> {
    const { taskId, userData } = context;
    const { zipCode } = userData;

    if (!zipCode) {
      throw new Error('ZIP code is required to start a GEICO quote.');
    }

    await this.browserActions.navigate(taskId, 'https://www.geico.com/');

    await this.browserActions.type(taskId, 'ZIP code field', 'input#zip', zipCode);

    // Press Enter to submit, which is a common pattern for this form
    const page = await this.getBrowserPage(taskId);
    await page.keyboard.press('Enter');

    // Wait for the navigation to the quote page to complete. This is the crucial
    // step to prevent race conditions where the agent tries to act before the
    // page is ready.
    await page.waitForURL(/sales\.geico\.com\/quote/i, { timeout: 15000 });
    
    // Explicitly update the last known URL after the navigation is complete.
    this.browserActions.setLastUrl(taskId, page.url());

    console.log(`[${this.name}] Successfully submitted ZIP code via legacy method.`);
  }
}