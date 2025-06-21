import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class ProgressiveAgent extends BaseCarrierAgent {
  readonly name = 'Progressive';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Starting quote process for task: ${context.taskId}`);
      
      this.createTask(context.taskId, this.name);
      await this.mcpService.navigate(context.taskId, 'https://www.progressive.com/');
      
      await this.smartClick(context.taskId, 'Auto insurance link', 'auto_insurance_button');
      await this.mcpService.waitFor(context.taskId, { time: 3 });
      
      await this.smartType(context.taskId, 'ZIP code field', 'zipcode', context.userData.zipCode);
      await this.smartClick(context.taskId, 'Get a quote button', 'start_quote_button');

      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        userData: context.userData,
      });

      return this.createSuccessResponse({
        message: 'Progressive quote started successfully',
        nextStep: 'personal_info',
        fields: this.getPersonalInfoFields(),
      });
    } catch (error) {
      console.warn(`[${this.name}] Smart start failed – falling back to legacy selectors`, error);
      try {
        await this.legacyStart(context);
        return this.createWaitingResponse(this.getPersonalInfoFields());
      } catch (legacyError) {
        console.error(`[${this.name}] Legacy start also failed:`, legacyError);
        await this.mcpService.takeScreenshot(context.taskId, `${this.name}-start-error`);
        return this.createErrorResponse(legacyError instanceof Error ? legacyError.message : 'Failed to start quote');
      }
    }
  }

  private async legacyStart(context: CarrierContext): Promise<void> {
    console.log(`[${this.name}] 🔄 Using legacy selector approach...`);
    
    // Original logic with hard-coded selectors
    if (!context.userData.zipCode) {
      console.log(`[${this.name}] No ZIP code provided, attempting to extract quote info anyway`);
      const page = await this.getBrowserPage(context.taskId);
      const quoteInfo = await this.extractQuoteInfo(page);
      
      if (quoteInfo) {
        this.updateTask(context.taskId, {
          status: 'completed',
          quote: quoteInfo,
        });
        return;
      }
    } else {
      console.log(`[${this.name}] Clicking Auto insurance link...`);
      
      // Try multiple strategies to handle ZIP field visibility issue
      const zipSelectors = [
        'input[name="ZipCode"]#zipCode_mma',      // Main form (preferred)
        'input[name="ZipCode"]#zipCode_overlay'   // Overlay form (often hidden)
      ];
      
      let zipFilled = false;
      for (const selector of zipSelectors) {
        try {
          // Wait for field to be visible before trying to fill
          await this.mcpService.waitFor(context.taskId, { time: 2 });
          await this.mcpService.type(context.taskId, `ZIP code field (${selector})`, selector, context.userData.zipCode);
          zipFilled = true;
          console.log(`[${this.name}] Successfully filled ZIP with selector: ${selector}`);
          break;
        } catch (error) {
          console.log(`[${this.name}] ZIP selector failed: ${selector}, trying next...`);
          continue;
        }
      }
      
      if (!zipFilled) {
        throw new Error('Could not fill ZIP code field - all selectors failed');
      }
      
      // Click "Get a quote" button using specific Progressive selectors
      await this.mcpService.click(context.taskId, 'Get a quote button', 'input[name="qsButton"]#qsButton_mma, input[name="qsButton"]#qsButton_overlay');
    }
  }

  async step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Processing step for task: ${context.taskId}`, stepData);
      
      const task = this.getTask(context.taskId);
      if (!task) {
        return this.createErrorResponse('Task not found');
      }
      
      // Update user data
      this.updateTask(context.taskId, {
        userData: { ...task.userData, ...stepData },
        status: 'processing',
      });
      
      const page = await this.getBrowserPage(context.taskId);
      
      // Check if we've reached the quote results page
      const quoteInfo = await this.extractQuoteInfo(page);
      if (quoteInfo) {
        this.updateTask(context.taskId, {
          status: 'completed',
          quote: quoteInfo,
        });
        
        return this.createSuccessResponse({
          quote: quoteInfo,
          completed: true,
        });
      }
      
      // Identify current step based on URL and page content
      const currentStep = await this.identifyCurrentStep(page);
      console.log(`[${this.name}] Current step: ${currentStep}, URL: ${page.url()}`);
      
      switch (currentStep) {
        case 'personal_info':
          return await this.handlePersonalInfo(page, stepData);
        case 'address_info':
          return await this.handleAddressInfo(page, stepData);
        case 'vehicle_info':
          return await this.handleVehicleInfo(page, stepData);
        case 'driver_details':
          return await this.handleDriverDetails(page, stepData);
        case 'final_details':
          return await this.handleFinalDetails(page, stepData);
        case 'bundle_options':
          return await this.handleBundleOptions(page, stepData);
        case 'quote_results':
          return await this.handleQuoteResults(page, stepData);
        default:
          return this.createErrorResponse(`Unknown step: ${currentStep}`);
      }
    } catch (error) {
      console.error(`[${this.name}] Error in step:`, error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Step processing failed');
    }
  }

  private async identifyCurrentStep(page: Page): Promise<string> {
    const url = page.url();
    
    // Use URL patterns to identify steps (based on our fingerprinting results)
    if (url.includes('/NameEdit')) {
      return 'personal_info';
    }
    if (url.includes('/AddressEdit')) {
      return 'address_info';
    }
    if (url.includes('/VehiclesAllEdit')) {
      return 'vehicle_info';
    }
    if (url.includes('/DriversAddPniDetails') || url.includes('/DriversIndex')) {
      return 'driver_details';
    }
    if (url.includes('/FinalDetailsEdit')) {
      return 'final_details';
    }
    if (url.includes('/Bundle')) {
      return 'bundle_options';
    }
    if (url.includes('/Rates') || url.includes('quote')) {
      return 'quote_results';
    }
    
    // Fallback to content-based detection
    const content = await page.textContent('body') || '';
    if (content.includes('first name') || content.includes('last name')) {
      return 'personal_info';
    }
    if (content.includes('address') || content.includes('street')) {
      return 'address_info';
    }
    if (content.includes('vehicle') || content.includes('year') || content.includes('make')) {
      return 'vehicle_info';
    }
    if (content.includes('gender') || content.includes('marital') || content.includes('occupation')) {
      return 'driver_details';
    }
    if (content.includes('coverage') || content.includes('liability') || content.includes('previous')) {
      return 'final_details';
    }
    if (content.includes('bundle') || content.includes('home insurance')) {
      return 'bundle_options';
    }
    
    return 'unknown';
  }

  private async handlePersonalInfo(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const firstName = stepData.firstName || 'John';
    const lastName = stepData.lastName || 'Smith';
    const dateOfBirth = stepData.dateOfBirth || '01/15/1985';
    const email = stepData.email || ''; // Email is optional in step 1
    
    // Get taskId from the current tasks (there should only be one active task)
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Filling personal information on ${page.url()}`);
    
    try {
      // Use smart typing for better field discovery
      await this.smartType(taskId, 'First name field', 'firstname', firstName);
      await this.smartType(taskId, 'Last name field', 'lastname', lastName);
      await this.smartType(taskId, 'Date of birth field', 'dateofbirth', dateOfBirth);
      
      // Fill email if provided (optional field, strict validation)
      if (email && !email.includes('test') && !email.includes('example')) {
        await this.smartType(taskId, 'Email field', 'email', email);
      }
    } catch (error) {
      console.warn(`[${this.name}] Smart field discovery failed, trying legacy approach:`, error);
      
      // Fallback to legacy selectors
      await this.mcpService.type(taskId, 'First name field', 'input[name="FirstName"]', firstName);
      await this.mcpService.type(taskId, 'Last name field', 'input[name="LastName"]', lastName);
      await this.mcpService.type(taskId, 'Date of birth field', 'input[name*="birth"], input[name*="dob"]', dateOfBirth);
      
      if (email && !email.includes('test') && !email.includes('example')) {
        await this.mcpService.type(taskId, 'Email field', 'input[type="email"]', email);
      }
    }
    
    this.updateTask(taskId, { currentStep: 2 });
    
    await this.clickContinueButton(page);
    
    return this.createSuccessResponse({
      message: 'Personal information submitted',
      nextStep: 'address_info',
      fields: this.getAddressInfoFields(),
    });
  }

  private async handleAddressInfo(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const streetAddress = stepData.streetAddress || '123 Main Street';
    
    // Get taskId from the current tasks
    const taskId = this.getTask(page.mainFrame().url())?.taskId;
    if (!taskId) return this.createErrorResponse('Task not found for address info');
    
    console.log(`[${this.name}] Filling address information on ${page.url()}`);
    
    try {
      await this.mcpService.type(taskId, 'Street address field', 'input[name*="street"], input[name*="address"]', stepData.streetAddress);
      await this.mcpService.type(taskId, 'Apt/Suite field', 'input[name*="apt"], input[name*="suite"]', stepData.apt || '');
      await this.mcpService.type(taskId, 'City field', 'input[name*="city"]', stepData.city);
      
      await this.clickContinueButton(page);
    } catch (error) {
      console.warn(`[${this.name}] Smart field discovery failed, trying legacy approach:`, error);
      
      // Fallback to legacy selector
      try {
        // Use smart typing for better field discovery
        await this.smartType(taskId, 'Street address field', 'address', streetAddress);
      } catch (error) {
        console.warn(`[${this.name}] Smart field discovery failed, trying legacy approach:`, error);
        
        // Fallback to legacy selectors
        await this.mcpService.type(taskId, 'Street address field', 'input[name*="address"]', streetAddress);
      }
      await this.clickContinueButton(page);
    }
    
    return this.createSuccessResponse({
      message: 'Address information submitted',
      nextStep: 'vehicle_info',
      fields: this.getVehicleInfoFields(),
    });
  }

  private async handleVehicleInfo(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const vehicleYear = stepData.vehicleYear || '2020';
    const vehicleMake = stepData.vehicleMake || 'Honda';
    const vehicleModel = stepData.vehicleModel || 'Civic';
    const vehicleBodyType = stepData.vehicleBodyType || '4DR 4CYL';
    const primaryUse = stepData.primaryUse || 'Pleasure (recreational, errands)';
    const commuteMiles = stepData.commuteMiles || '15';
    const ownership = stepData.ownership || 'Own';
    const hasTrackingDevice = stepData.hasTrackingDevice || 'No';
    const annualMileage = stepData.annualMileage || '10000';

    const taskId = this.getTask(page.mainFrame().url())?.taskId;
    if (!taskId) return this.createErrorResponse('Task not found for vehicle info');
    
    console.log(`[${this.name}] Filling vehicle information on ${page.url()}`);
    
    // Try to click "Add another vehicle" if needed (may not exist for first vehicle)
    try {
      await this.mcpService.click(taskId, 'Add another vehicle button', 'button:has-text("Add"), a:has-text("Add Vehicle")');
      await this.mcpService.waitFor(taskId, { time: 1 });
    } catch (error) {
      console.log(`[${this.name}] No "Add vehicle" button found, proceeding with existing form`);
    }
    
    // Fill vehicle year (enables make dropdown) - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Vehicle year select', 'select[name*="year"], select[id*="year"]', [vehicleYear]);
    await this.mcpService.waitFor(taskId, { time: 2 }); // Wait for make dropdown to populate
    
    // Fill vehicle make (enables model dropdown) - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Vehicle make select', 'select[name*="make"], select[id*="make"]', [vehicleMake]);
    await this.mcpService.waitFor(taskId, { time: 2 }); // Wait for model dropdown to populate
    
    // Fill vehicle model (enables body type dropdown) - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Vehicle model select', 'select[name*="model"], select[id*="model"]', [vehicleModel]);
    await this.mcpService.waitFor(taskId, { time: 2 }); // Wait for body type dropdown to populate
    
    // Fill body type (enables other fields) - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Vehicle body type select', 'select[name*="body"], select[name*="trim"]', [vehicleBodyType]);
    await this.mcpService.waitFor(taskId, { time: 1 });
    
    // Fill primary use - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Primary use select', 'select[name*="use"], select[name*="purpose"]', [primaryUse]);
    
    await this.mcpService.type(taskId, 'Annual mileage field', 'input[name*="mileage"], input[name*="miles"]', annualMileage.toString());
    
    // Select ownership - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Ownership select', 'select[name*="own"], select[name*="lease"]', [ownership]);
    
    // Handle tracking device question - using confirmed selectors
    await this.mcpService.click(taskId, `Tracking device radio - ${hasTrackingDevice}`, `input[type="radio"][name*="track"][value*="${hasTrackingDevice.toLowerCase()}"], input[type="radio"][name*="device"]:has-text("${hasTrackingDevice}")`);
    
    // Save vehicle if button exists
    try {
      await this.mcpService.click(taskId, 'Save vehicle button', 'button:has-text("Save Vehicle"), button[type="submit"]');
      await this.mcpService.waitFor(taskId, { time: 1 });
    } catch (error) {
      console.log(`[${this.name}] No "Save Vehicle" button found, proceeding to continue`);
    }
    
    await this.clickContinueButton(page);
    
    return this.createSuccessResponse({
      message: 'Vehicle information submitted',
      nextStep: 'driver_details',
      fields: this.getDriverDetailsFields(),
    });
  }

  private async handleDriverDetails(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const gender = stepData.gender || 'Male';
    const maritalStatus = stepData.maritalStatus || 'Single';
    const education = stepData.education || 'College degree';
    const employmentStatus = stepData.employmentStatus || 'Employed';
    const occupation = stepData.occupation || 'Software Engineer';
    const residence = stepData.residence || 'Own home';
    const ageFirstLicensed = stepData.ageFirstLicensed || '16';
    
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Filling driver details on ${page.url()}`);
    
    // Handle gender - using confirmed selectors
    await this.mcpService.click(taskId, `Gender radio - ${gender}`, `input[type="radio"][name*="gender"][value*="${gender.toLowerCase()}"], input[type="radio"][name*="sex"]:has-text("${gender}")`);
    
    // Handle marital status - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Marital status select', 'select[name*="marital"], select[name*="marriage"]', [maritalStatus]);
    
    // Handle education - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Education select', 'select[name*="education"], select[name*="school"]', [education]);
    
    // Handle employment status - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Employment status select', 'select[name*="employment"], select[name*="work"]', [employmentStatus]);
    await this.mcpService.waitFor(taskId, { time: 1 }); // Wait for occupation field to appear
    
    // Handle occupation (auto-complete field) - using confirmed selectors
    await this.mcpService.type(taskId, 'Occupation field', 'input[name*="occupation"], input[name*="job"]', occupation);
    await this.mcpService.waitFor(taskId, { time: 1 });
    
    // Try to select from occupation dropdown if available
    try {
      await page.locator(`div:has-text("${occupation}")`).first().click();
    } catch (error) {
      console.log(`[${this.name}] No occupation dropdown found, typed value should suffice`);
    }
    
    // Handle residence - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Primary residence select', 'select[name*="residence"], select[name*="home"]', [residence]);
    
    // Handle age first licensed - using confirmed selectors
    await this.mcpService.type(taskId, 'Age first licensed field', 'input[name*="license"], input[name*="age"]', ageFirstLicensed);
    
    // Handle driving history questions (all "No" for clean record) - using confirmed selectors
    const drivingHistoryQuestions: Record<string, boolean> = {
      'input[name*="Accident"]': stepData.hasAccidents ?? false,
      'input[name*="Ticket"]': stepData.hasTickets ?? false,
      'input[name*="DUI"]': stepData.hasDUI ?? false,
    };

    for (const [questionSelector, hasEvent] of Object.entries(drivingHistoryQuestions)) {
      if (hasEvent) {
        try {
          await this.mcpService.click(taskId, `Yes radio for ${questionSelector}`, `${questionSelector}[value*="yes"], ${questionSelector}:has-text("Yes")`);
          await this.mcpService.waitFor(taskId, { time: 0.5 });
        } catch (error) {
          console.log(`[${this.name}] Could not find driving history question: ${questionSelector}`);
        }
      } else {
        try {
          await this.mcpService.click(taskId, `No radio for ${questionSelector}`, `${questionSelector}[value*="no"], ${questionSelector}:has-text("No")`);
          await this.mcpService.waitFor(taskId, { time: 0.5 });
        } catch (error) {
          console.log(`[${this.name}] Could not find driving history question: ${questionSelector}`);
        }
      }
    }
    
    await this.clickContinueButton(page);
    
    return this.createSuccessResponse({
      message: 'Driver details submitted',
      nextStep: 'final_details',
      fields: this.getFinalDetailsFields(),
    });
  }

  private async handleFinalDetails(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const hasPreviousProgressive = stepData.hasPreviousProgressive || 'No';
    const continuousInsurance = stepData.continuousInsurance || 'Yes';
    const liabilityLimits = stepData.liabilityLimits || '$100,000/$300,000';
    const email = stepData.email || 'john.smith123@gmail.com'; // Must be realistic email
    
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Filling final details on ${page.url()}`);
    
    // Handle previous Progressive policy question - using confirmed selectors
    await this.mcpService.click(taskId, `Previous Progressive radio - ${hasPreviousProgressive}`, `input[type="radio"][name*="previous"][value*="${hasPreviousProgressive.toLowerCase()}"], input[type="radio"][name*="prog"]:has-text("${hasPreviousProgressive}")`);
    
    // Handle continuous insurance question - using confirmed selectors
    await this.mcpService.click(taskId, `Continuous insurance radio - ${continuousInsurance}`, `input[type="radio"][name*="continuous"][value*="${continuousInsurance.toLowerCase()}"], input[type="radio"][name*="insured"]:has-text("${continuousInsurance}")`);
    
    // Handle liability limits - using confirmed selectors
    await this.mcpService.selectOption(taskId, 'Bodily injury limits select', 'select[name*="bodily"], select[name*="liability"]', [liabilityLimits]);
    
    // Handle email (critical - must be realistic) - using confirmed selectors
    await this.mcpService.type(taskId, 'Email address field', 'input[type="email"]', email);
    
    await this.clickContinueButton(page);
    
    return this.createSuccessResponse({
      message: 'Final details submitted',
      nextStep: 'bundle_options',
      fields: this.getBundleOptionsFields(),
    });
  }

  private async handleBundleOptions(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Handling bundle options on ${page.url()}`);
    
    // Skip bundle options - click "No thanks, just auto" using confirmed selectors
    try {
      await this.mcpService.click(taskId, 'No thanks button', 'button:has-text("No thanks"), a:has-text("just auto")');
      await this.mcpService.waitFor(taskId, { time: 3 }); // Wait for page load
    } catch (error) {
      console.log(`[${this.name}] Bundle options not found or already skipped.`);
    }
    
    return this.createSuccessResponse({
      message: 'Bundle options handled',
      nextStep: 'quote_results',
      fields: {},
    });
  }

  private async handleQuoteResults(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Extract quote information
    const quoteInfo = await this.extractQuoteInfo(page);
    
    if (quoteInfo) {
      this.updateTask(stepData.taskId || '', {
        status: 'completed',
        quote: quoteInfo,
      });
      
      return this.createSuccessResponse({
        quote: quoteInfo,
        completed: true,
      });
    }
    
    return this.createErrorResponse('Could not extract quote information');
  }

  protected async clickContinueButton(page: Page): Promise<void> {
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      throw new Error('No active task found');
    }

    // Use confirmed selectors from fingerprinting
    const continueSelectors = [
      'button[type="submit"]',                    // Primary submit button
      'input[type="submit"]',                     // Alternative submit input
      'button:has-text("Continue")',              // Continue text button
      'button:has-text("Get Rates")',             // Final step button
      'button:has-text("See Rates")',             // Alternative final button
      'button:has-text("Ok, start my quote")',    // Quote start button
      'button:has-text("Next")'                   // Next step button
    ];

    for (const selector of continueSelectors) {
      if (await page.locator(selector).count() > 0) {
        try {
          console.log(`[${this.name}] Attempting to click continue button with selector: ${selector}`);
          await this.mcpService.click(taskId, `Continue button (${selector})`, selector);
          await this.mcpService.waitFor(taskId, { time: 2 }); // Wait for page transition
          return;
        } catch (error) {
          console.log(`[${this.name}] Continue button click failed for selector ${selector}, trying next...`);
          continue;
        }
      }
    }
    
    throw new Error('Could not find continue button with any selector');
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    try {
      const url = page.url();
      const content = await page.textContent('body') || '';
      
      console.log(`[${this.name}] Attempting to extract quote info from ${url}`);
      
      // Check if we're on the rates page using confirmed URL patterns
      if (!url.includes('/Rates') && !url.includes('quote') && !content.includes('month') && !content.includes('$')) {
        console.log(`[${this.name}] Not on rates page yet, URL: ${url}`);
        return null;
      }
      
      const premiumText = await this.findPriceOnPage(page);
      if (premiumText) {
        console.log(`[${this.name}] Extracted premium text: ${premiumText}`);
        return {
          carrier: this.name,
          premium: parseFloat(premiumText.replace(/[^0-9.]/g, '')),
          coverages: [{ name: 'Full Coverage', details: 'Details scraped from page' }],
        };
      }

      console.log(`[${this.name}] Could not find price on results page.`);
      return null;
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      return null;
    }
  }

  private async findPriceOnPage(page: Page): Promise<string | null> {
    const url = page.url();
    const content = await page.textContent('body') || '';

    // Check if we're on the rates page using confirmed URL patterns
    if (!url.includes('/Rates') && !url.includes('quote') && !content.includes('month') && !content.includes('$')) {
      console.log(`[${this.name}] Not on rates page yet, URL: ${url}`);
      return null;
    }

    // Look for monthly price with Progressive-specific selectors
    const monthlyPriceSelectors = [
      'input[type="radio"][value*="month"]',     // Monthly payment radio buttons
      'label:has-text("Monthly")',               // Monthly payment labels
      '[data-testid*="monthly"]',                // Monthly price test IDs
      '.monthly-price',                          // Monthly price classes
      'text=/\\$\\d+\\s*(per\\s*)?(month|mo)/i'  // Monthly price text patterns (more specific)
    ];

    for (const selector of monthlyPriceSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          if (text && text.includes('$')) {
            const lower = text.toLowerCase();
            if (!lower.includes('saving') && !lower.includes('savings') && !lower.includes('survey') && !lower.includes('customer')) {
              return text.trim();
            }
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Look for total/full payment price
    const totalPriceSelectors = [
      'input[type="radio"][value*="full"]',      // Pay in full radio buttons
      'label:has-text("Pay in full")',           // Pay in full labels
      '[data-testid*="total"]',                  // Total price test IDs
      '.total-price',                            // Total price classes
      'text=/\\$\\d+,?\\d*\\.\\d+/i'             // Total price patterns
    ];

    for (const selector of totalPriceSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          if (text && text.includes('$') && !text.includes('Quote Available')) { // Exclude "Quote Available"
            const lower = text.toLowerCase();
            if (!lower.includes('saving') && !lower.includes('savings') && !lower.includes('survey') && !lower.includes('customer')) {
              return text.trim();
            }
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Look for discounts with Progressive-specific patterns
    const discountSelectors = [
      '[data-testid*="discount"]',               // Discount test IDs
      '.discount',                               // Discount classes
      'text=/\\$\\d+.*discount/i',               // Discount text patterns
      'text=/\\$\\d+.*saving/i',                 // Savings text patterns
      'text=/total.*discount/i'                  // Total discount patterns
    ];

    for (const selector of discountSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          if (text && text.includes('$')) {
            const lower = text.toLowerCase();
            if (!lower.includes('saving') && !lower.includes('savings') && !lower.includes('survey') && !lower.includes('customer')) {
              return text.trim();
            }
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return null;
  }

  // Field definition methods based on actual Progressive form structure
  private getPersonalInfoFields(): Record<string, FieldDefinition> {
    return {
      firstName: {
        id: 'firstName',
        name: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'John',
      },
      lastName: {
        id: 'lastName',
        name: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Smith',
      },
      dateOfBirth: {
        id: 'dateOfBirth',
        name: 'Date of Birth',
        type: 'text',
        required: true,
        placeholder: 'MM/DD/YYYY',
        validation: {
          pattern: '^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/(19|20)\\d\\d$',
        },
      },
      email: {
        id: 'email',
        name: 'Email Address',
        type: 'email',
        required: false,
        placeholder: 'Optional - no test/example domains',
      },
    };
  }

  private getAddressInfoFields(): Record<string, FieldDefinition> {
    return {
      streetAddress: {
        id: 'streetAddress',
        name: 'Street Address',
        type: 'text',
        required: true,
        placeholder: '123 Main Street',
      },
    };
  }

  private getVehicleInfoFields(): Record<string, FieldDefinition> {
    return {
      vehicleYear: {
        id: 'vehicleYear',
        name: 'Vehicle Year',
        type: 'select',
        required: true,
        options: this.generateYearOptions(),
      },
      vehicleMake: {
        id: 'vehicleMake',
        name: 'Vehicle Make',
        type: 'select',
        required: true,
        options: ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz', 'Audi'],
      },
      vehicleModel: {
        id: 'vehicleModel',
        name: 'Vehicle Model',
        type: 'select',
        required: true,
        options: ['Civic', 'Accord', 'Camry', 'Corolla', 'F-150', 'Silverado'],
      },
      vehicleBodyType: {
        id: 'vehicleBodyType',
        name: 'Body Type',
        type: 'select',
        required: true,
        options: ['4DR 4CYL', '2DR 4CYL', 'SUV', 'Truck'],
      },
      primaryUse: {
        id: 'primaryUse',
        name: 'Primary Use',
        type: 'select',
        required: true,
        options: ['Pleasure (recreational, errands)', 'Business', 'Farm Use'],
      },
      commuteMiles: {
        id: 'commuteMiles',
        name: 'Miles to School/Work One Way',
        type: 'text',
        required: true,
        placeholder: '15',
      },
      ownership: {
        id: 'ownership',
        name: 'Own or Lease',
        type: 'select',
        required: true,
        options: ['Own', 'Lease', 'Finance'],
      },
      hasTrackingDevice: {
        id: 'hasTrackingDevice',
        name: 'Tracking Device',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
      },
    };
  }

  private getDriverDetailsFields(): Record<string, FieldDefinition> {
    return {
      gender: {
        id: 'gender',
        name: 'Gender',
        type: 'radio',
        required: true,
        options: ['Male', 'Female'],
      },
      maritalStatus: {
        id: 'maritalStatus',
        name: 'Marital Status',
        type: 'select',
        required: true,
        options: ['Single', 'Married', 'Divorced', 'Widowed'],
      },
      education: {
        id: 'education',
        name: 'Education',
        type: 'select',
        required: true,
        options: ['High school or less', 'Some college', 'College degree', 'Advanced degree'],
      },
      employmentStatus: {
        id: 'employmentStatus',
        name: 'Employment Status',
        type: 'select',
        required: true,
        options: ['Employed/Self-employed (full- or part-time)', 'Retired', 'Student', 'Homemaker', 'Unemployed'],
      },
      occupation: {
        id: 'occupation',
        name: 'Occupation',
        type: 'text',
        required: true,
        placeholder: 'Teacher, Engineer, etc.',
      },
      residence: {
        id: 'residence',
        name: 'Primary Residence',
        type: 'select',
        required: true,
        options: ['Own home', 'Rent', 'Live with parents', 'Other'],
      },
      ageFirstLicensed: {
        id: 'ageFirstLicensed',
        name: 'Age First Licensed',
        type: 'text',
        required: true,
        placeholder: '16',
      },
    };
  }

  private getFinalDetailsFields(): Record<string, FieldDefinition> {
    return {
      hasPreviousProgressive: {
        id: 'hasPreviousProgressive',
        name: 'Previous Progressive Policy',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
      },
      continuousInsurance: {
        id: 'continuousInsurance',
        name: 'Continuously Insured 3+ Years',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
      },
      liabilityLimits: {
        id: 'liabilityLimits',
        name: 'Bodily Injury Limits',
        type: 'select',
        required: true,
        options: ['$15,000/$30,000', '$25,000/$50,000', '$50,000/$100,000', '$100,000/$300,000', '$250,000/$500,000', '$500,000/$1,000,000'],
      },
      email: {
        id: 'email',
        name: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Must be realistic (no test/example domains)',
      },
    };
  }

  private getBundleOptionsFields(): Record<string, FieldDefinition> {
    return {
      skipBundle: {
        id: 'skipBundle',
        name: 'Skip Bundle Options',
        type: 'checkbox',
        required: false,
      },
    };
  }

  private generateYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let year = currentYear; year >= currentYear - 30; year--) {
      years.push(year.toString());
    }
    return years;
  }
}

// Export singleton instance
export const progressiveAgent = new ProgressiveAgent(); 