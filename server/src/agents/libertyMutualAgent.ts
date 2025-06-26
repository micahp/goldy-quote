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
      
      // Start at the Liberty Mutual homepage, not the direct quote URL
      const homepageUrl = 'https://www.libertymutual.com/auto-insurance';
      
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`[${this.name}] Attempting to navigate to homepage: ${homepageUrl} (attempt ${retryCount + 1})`);
          
          // Add random delay to mimic human behavior
          await page.waitForTimeout(Math.random() * 1000 + 500);
          
          await page.goto(homepageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000, // Increased timeout
          });
          
          // If we got here, navigation succeeded
          break;
          
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('ERR_HTTP2_PROTOCOL_ERROR') && retryCount < maxRetries) {
            console.log(`[${this.name}] HTTP/2 error detected, retrying... (${retryCount}/${maxRetries})`);
            
            // Clear browser state more thoroughly
            await page.context().clearCookies();
            await page.context().clearPermissions();
            await page.evaluate(() => {
              localStorage.clear();
              sessionStorage.clear();
              // Clear any cached data
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
            });
            
            // Longer wait with jitter before retry
            await page.waitForTimeout(Math.random() * 2000 + 2000);
            continue;
          }
          
          // If not HTTP/2 error or max retries reached, rethrow
          throw error;
        }
      }
      
      // Wait for the page to load completely (with shorter timeout)
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`[${this.name}] Page loaded successfully`);
      } catch (error) {
        console.log(`[${this.name}] Page load timeout, continuing anyway...`);
      }
      
      // DEBUG: Take screenshot and dump HTML after navigation
      const debugDir = 'server/test-results';
      const screenshotPath = `${debugDir}/liberty-debug-${taskId}.png`;
      const htmlPath = `${debugDir}/liberty-debug-${taskId}.html`;
      const fs = await import('fs/promises');
      await fs.mkdir(debugDir, { recursive: true });
      await page.screenshot({ path: screenshotPath });
      const htmlContent = await page.content();
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`[libertymutual] Saved debug screenshot: ${screenshotPath}`);
      console.log(`[libertymutual] Saved debug HTML: ${htmlPath}`);

      if (!userData.zipCode) {
        return this.createErrorResponse('ZIP code is required to start a Liberty Mutual quote.');
      }

      // Find the ZIP input in the homepage hero section
      console.log(`[${this.name}] Looking for ZIP input on homepage...`);
      console.log(`[${this.name}] This appears to be a Next.js dynamic page, waiting for content to load...`);
      
      // Wait for JavaScript to render the form (Next.js dynamic content)
      await page.waitForTimeout(3000);
      
      // Look for any input that could be a ZIP code field (more dynamic approach)
      let zipInput;
      let getPriceBtn;
            // Look for ZIP input directly on the page (no form container needed)
      const zipSelectors = [
        'input[name*="zip" i]',           // Most likely 
        'input[placeholder*="zip" i]',    // Placeholder text
        'input[id*="zip" i]',             // ID contains zip
        'input[type="text"]',             // Any text input as fallback
        'input[inputmode="numeric"]',     // Numeric input
        'input[pattern*="[0-9]"]'         // Pattern for numbers
      ];
      
      for (const selector of zipSelectors) {
        try {
          zipInput = page.locator(selector).first(); // Take first match
          await zipInput.waitFor({ state: 'visible', timeout: 2000 });
          
          // Verify this looks like a ZIP field by checking surrounding text
          const containerText = await zipInput.locator('..').textContent() || '';
          const isZipField = /zip|postal|code/i.test(containerText) || 
                            (await zipInput.getAttribute('placeholder') || '').toLowerCase().includes('zip') ||
                            (await zipInput.getAttribute('name') || '').toLowerCase().includes('zip');
          
          if (isZipField) {
            console.log(`[${this.name}] Found ZIP input using selector: ${selector}`);
            break;
          } else {
            console.log(`[${this.name}] Input found with ${selector} but doesn't appear to be ZIP field`);
            zipInput = null;
          }
        } catch (e) {
          console.log(`[${this.name}] ZIP selector ${selector} not found`);
        }
      }
      
      if (!zipInput) {
        console.log(`[${this.name}] Could not find ZIP input, will try direct quote URL instead`);
        // Redirect to direct quote URL
        const directQuoteUrl = `https://buy.libertymutual.com/?lob=Auto&policyType=Auto&zipCode=${userData.zipCode}`;
        await page.goto(directQuoteUrl);
        await page.waitForLoadState('domcontentloaded');
        
        this.updateTask(taskId, {
          status: 'waiting_for_input',
          currentStep: 1,
          requiredFields: this.getPersonalInfoFields(),
        });
        
        return this.createWaitingResponse(this.getPersonalInfoFields());
      }
      
      // Clear and fill the ZIP code with natural human-like behavior
      await zipInput.focus();
      await page.waitForTimeout(Math.random() * 300 + 200); // Random delay 200-500ms
      await zipInput.clear();
      await page.waitForTimeout(Math.random() * 200 + 100); // Random delay 100-300ms
      
      // Type naturally with slight delays between characters
      for (const char of userData.zipCode) {
        await zipInput.type(char);
        await page.waitForTimeout(Math.random() * 50 + 25); // 25-75ms between chars
      }
      console.log(`[${this.name}] Entered ZIP code: ${userData.zipCode}`);
      
      // Find the "Get my price" button with flexible selectors
      const buttonSelectors = [
        'button:has-text("Get my price")',
        'button:has-text("Get quote")', 
        'button:has-text("Start")',
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Continue")'
      ];
      
      for (const selector of buttonSelectors) {
        try {
          getPriceBtn = page.locator(selector).first(); // Look on entire page
          await getPriceBtn.waitFor({ state: 'visible', timeout: 2000 });
          console.log(`[${this.name}] Found button using selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`[${this.name}] Button selector ${selector} not found`);
        }
      }
      
      if (!getPriceBtn) {
        throw new Error('Could not find submit button on Liberty Mutual homepage');
      }
      
      // DEBUG: Check button state before clicking
      const buttonState = await getPriceBtn.getAttribute('class');
      const buttonDisabled = await getPriceBtn.getAttribute('disabled');
      const buttonText = await getPriceBtn.textContent();
      console.log(`[${this.name}] Button state before click - classes: ${buttonState}, disabled: ${buttonDisabled}, text: ${buttonText}`);
      
      // Human-like button interaction
      await getPriceBtn.hover();
      await page.waitForTimeout(Math.random() * 500 + 300); // Random hover time 300-800ms
      await getPriceBtn.click({ timeout: 5000, noWaitAfter: true });
      console.log(`[${this.name}] Clicked "Get my price" button`);
      
      // DEBUG: Check page state immediately after click
      console.log(`[${this.name}] Page URL after click: ${page.url()}`);
      console.log(`[${this.name}] Page title: ${await page.title()}`);
      
      // Check if button shows loading state
      await page.waitForTimeout(1000); // Brief wait to see loading state
      const buttonStateAfter = await getPriceBtn.getAttribute('class');
      const buttonTextAfter = await getPriceBtn.textContent();
      console.log(`[${this.name}] Button state after click - classes: ${buttonStateAfter}, text: ${buttonTextAfter}`);
      
      // Check what's actually on the page
      const pageContent = await page.textContent('body');
      console.log(`[${this.name}] Page content snippet:`, pageContent?.substring(0, 300));
      
      // Look for loading indicators
      const loadingIndicators = await page.locator('.loading, [data-loading], .spinner, [class*="loading"], [class*="spinner"]').count();
      console.log(`[${this.name}] Found ${loadingIndicators} loading indicators on page`);
      
             // DEBUG: Take screenshot after clicking button
       const afterClickScreenshot = `${debugDir}/liberty-after-click-${taskId}.png`;
       await page.screenshot({ path: afterClickScreenshot });
       console.log(`[${this.name}] Saved after-click screenshot: ${afterClickScreenshot}`);

       // Wait for either navigation OR loading state to resolve
       console.log(`[${this.name}] Waiting for navigation or loading state to resolve...`);
       
       const startUrl = page.url();
       let attempts = 0;
       const maxAttempts = 30; // 15 seconds with 500ms intervals
       
       while (attempts < maxAttempts) {
         await page.waitForTimeout(500);
         attempts++;
         
         const currentUrl = page.url();
         console.log(`[${this.name}] Attempt ${attempts}: URL = ${currentUrl}`);
         
         // Check if we've navigated to a new page
         if (currentUrl !== startUrl) {
           console.log(`[${this.name}] Navigation detected! New URL: ${currentUrl}`);
           break;
         }
         
         // Check if button is still in loading state
         try {
           const buttonText = await getPriceBtn.textContent();
           const buttonClasses = await getPriceBtn.getAttribute('class');
           console.log(`[${this.name}] Button state: text="${buttonText}", classes="${buttonClasses}"`);
           
           // Look for loading indicators
           const loadingElements = await page.locator('.loading, [data-loading], .spinner, [class*="loading"], [class*="spinner"], [aria-busy="true"]').count();
           console.log(`[${this.name}] Loading elements found: ${loadingElements}`);
           
           // If button text changed or loading indicators are gone, maybe page is ready
           if (!buttonText?.includes('...') && loadingElements === 0) {
             console.log(`[${this.name}] No loading indicators detected, checking for quote flow...`);
             
             // Check if we're actually in a quote flow (even on same URL)
             const quoteElements = await page.locator('input[name*="first"], input[name*="last"], h1:has-text("About You"), h1:has-text("Personal"), h1:has-text("Quote")').count();
             if (quoteElements > 0) {
               console.log(`[${this.name}] Found quote flow elements on current page!`);
               break;
             }
           }
         } catch (error) {
           console.log(`[${this.name}] Error checking button state:`, error);
         }
       }
       
       if (attempts >= maxAttempts) {
         console.warn(`[${this.name}] Timed out waiting for navigation or loading to complete`);
       } else {
         console.log(`[${this.name}] Successfully detected page state change after ${attempts} attempts`);
       }
      
      // Handle the discount modal that appears after clicking "Get my price"
      try {
        console.log(`[${this.name}] Checking for discount modal...`);
        const discountModal = page.locator('div[role="alertdialog"]');
        await discountModal.waitFor({ state: 'visible', timeout: 5000 });
        
        // Click "OK, thanks!" to dismiss the modal
        const okButton = discountModal.locator('button:has-text("OK, thanks!")');
        await okButton.click();
        console.log(`[${this.name}] Dismissed discount modal`);
        
        // Wait for modal to disappear
        await discountModal.waitFor({ state: 'hidden', timeout: 2000 });
      } catch (error) {
        console.log(`[${this.name}] No discount modal found or error dismissing it:`, error);
      }
      
      // DEBUG: Final state check after all interactions
      console.log(`[${this.name}] Final check - current URL: ${page.url()}`);
      console.log(`[${this.name}] Current page title: ${await page.title()}`);
      
      // Check for quote flow elements more comprehensively
      await page.waitForTimeout(2000); // Wait for any dynamic content to load
      
      const quoteFlowIndicators = await Promise.all([
        page.locator('input[name*="first"], input[placeholder*="first" i], [data-testid*="first"], [aria-label*="first" i]').count(),
        page.locator('input[name*="zip"], input[placeholder*="zip" i], [data-testid*="zip"], [aria-label*="zip" i]').count(),
        page.locator('form').filter({ hasText: /personal|quote|vehicle|insurance/i }).count(),
        page.locator('h1, h2, .heading').filter({ hasText: /quote|personal|about you|get started|information/i }).count(),
        page.locator('button, input[type="submit"]').filter({ hasText: /continue|next|start|proceed/i }).count()
      ]);
      
      const totalIndicators = quoteFlowIndicators.reduce((sum, count) => sum + count, 0);
      const isQuoteFlow = page.url().includes('/shop/quote-interview') || 
                         page.url().includes('/quote') || 
                         totalIndicators > 0;
      
      console.log(`[${this.name}] Quote flow indicators found: ${quoteFlowIndicators} (total: ${totalIndicators})`);
      console.log(`[${this.name}] Is on quote flow page: ${isQuoteFlow}`);
      
      if (!isQuoteFlow) {
        console.warn(`[${this.name}] WARNING: May not be on quote flow page. Current URL: ${page.url()}`);
        // Check if there are any modals or overlays that might contain the quote form
        const modals = await page.locator('[role="dialog"], .modal, .overlay, .popup').count();
        console.log(`[${this.name}] Found ${modals} modal/overlay elements`);
        
        // Take a final debug screenshot
        const finalDebugScreenshot = `${debugDir}/liberty-final-state-${taskId}.png`;
        await page.screenshot({ path: finalDebugScreenshot });
        console.log(`[${this.name}] Saved final state screenshot: ${finalDebugScreenshot}`);
        
        // Try clicking a more specific button if available
        const tryButtons = [
          'button:has-text("Get My Quote")',
          'button:has-text("Start Quote")', 
          'button:has-text("Get Started")',
          'button:has-text("Continue")',
          '[data-testid*="quote"] button',
          '.quote-button',
          '.cta-button'
        ];
        
        for (const btnSelector of tryButtons) {
          try {
            const btn = page.locator(btnSelector).first();
            if (await btn.isVisible()) {
              console.log(`[${this.name}] Found additional button: ${btnSelector}`);
              await btn.click();
              await page.waitForTimeout(3000);
              break;
            }
          } catch (e) {
            // Continue to next button
          }
        }
      }
      
      console.log(`[${this.name}] Successfully initiated quote flow, current URL: ${page.url()}`);

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
    
    console.log(`[${this.name}] Identifying step - URL: ${url}`);
    
    // Check for specific Liberty Mutual quote flow URLs
    if (url.includes('/shop/quote-interview')) {
      // We're in the quote interview flow
      if (content.includes('About You') || content.includes('personal information') || content.includes('First Name')) {
        return 'personal_info';
      }
      if (content.includes('Vehicle') || content.includes('Year') || content.includes('Make')) {
        return 'vehicle';
      }
      if (content.includes('Driver') || content.includes('license') || content.includes('Gender')) {
        return 'drivers';
      }
      if (content.includes('Current Insurance') || content.includes('insurance status')) {
        return 'insurance_history';
      }
      if (content.includes('Savings') || content.includes('Discount') || content.includes('RightTrack')) {
        return 'discounts';
      }
      if (content.includes('Quote Results') || content.includes('monthly premium') || content.includes('per month')) {
        return 'quote_results';
      }
      // Fallback: assume first step is personal info if we can't detect otherwise
      return 'personal_info';
    }
    
    // Legacy URL-based detection (fallback)
    if (content.includes('vehicle') || url.includes('vehicle')) return 'vehicle';
    if (content.includes('address') || url.includes('address')) return 'address';
    if (content.includes('about you') || url.includes('personal')) return 'personal_info';
    
    return 'unknown';
  }

  private async handlePersonalInfoStep(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const { taskId } = context;
    const { firstName, lastName, dateOfBirth } = stepData;

    console.log(`[${this.name}] Filling personal info form...`);

    // Fill the personal info fields using the actual Liberty Mutual form selectors
    await page.locator('input[name="firstName"], textbox:has-text("First name")').first().fill(firstName);
    console.log(`[${this.name}] Filled first name: ${firstName}`);
    
    await page.locator('input[name="lastName"], textbox:has-text("Last name")').first().fill(lastName);
    console.log(`[${this.name}] Filled last name: ${lastName}`);
    
    await page.locator('input[name="dateOfBirth"], input[name="birthday"], textbox:has-text("Birthday")').first().fill(dateOfBirth);
    console.log(`[${this.name}] Filled date of birth: ${dateOfBirth}`);

    // Wait for the Next button to become enabled
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.waitFor({ state: 'visible', timeout: 2000 });
    
    // Check if button is enabled, if not wait a bit more
    let isEnabled = await nextButton.isEnabled();
    if (!isEnabled) {
      console.log(`[${this.name}] Next button not enabled yet, waiting...`);
      await page.waitForTimeout(1000);
      isEnabled = await nextButton.isEnabled();
    }
    
    if (isEnabled) {
      await nextButton.click();
      console.log(`[${this.name}] Clicked Next button`);
      await this.waitForPageLoad(page);
      
      // Determine what fields are needed next
      const currentStep = await this.identifyCurrentStep(page);
      console.log(`[${this.name}] Advanced to step: ${currentStep}`);
      
      if (currentStep === 'vehicle') {
        return this.createWaitingResponse(this.getVehicleFields());
      } else if (currentStep === 'address') {
        return this.createWaitingResponse(this.getAddressFields());
      } else {
        // Default to vehicle step
        return this.createWaitingResponse(this.getVehicleFields());
      }
    } else {
      return this.createErrorResponse('Next button is not enabled - please check all required fields are filled correctly');
    }
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