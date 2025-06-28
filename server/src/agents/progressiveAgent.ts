import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult, TaskState } from '../types/index.js';

export class ProgressiveAgent extends BaseCarrierAgent {
  readonly name = 'Progressive';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Starting quote process for task: ${context.taskId}`);
      
      this.createTask(context.taskId, this.name);
      await this.browserActions.navigate(context.taskId, 'https://www.progressive.com/');
      
      // OPTIMIZED: Use documented Progressive selectors with fast fallback
      // Based on memory: Progressive uses main form QuoteStartForm_mma with reliable selectors
      try {
        // Try the most reliable Auto insurance link first
        await this.browserActions.click(
          context.taskId, 
          'Auto insurance link', 
          'a[href*="/auto" i], button:has-text("Auto"), [data-product="auto"]'
        );
      } catch (err) {
        console.warn(`[${this.name}] Auto link click failed, trying alternate selectors:`, err);
        // Fast fallback without smart discovery overhead
        await this.browserActions.click(
          context.taskId,
          'Auto insurance fallback',
          'a:has-text("Auto Insurance"), button:has-text("Get a Quote")'
        );
      }

      // OPTIMIZED: Use documented ZIP selector from memory
      // Progressive ZIP field: input[name="ZipCode"]#zipCode_mma (main form)
      try {
        await this.browserActions.type(
          context.taskId,
          'ZIP code field',
          '#zipCode_mma, input[name="ZipCode"]',
          context.userData.zipCode
        );
      } catch (err) {
        console.warn(`[${this.name}] Main ZIP field failed, trying backup:`, err);
        await this.browserActions.type(
          context.taskId,
          'ZIP code fallback',
          'input[name*="zip" i], input[id*="zip" i]',
          context.userData.zipCode
        );
      }

      // OPTIMIZED: Shorter wait and faster submit
      await this.waitForPage(context.taskId, { time: 0.5 }); // Reduced from 1s

      // OPTIMIZED: Use documented submit selector from memory with fast clicking
      // Progressive submit: input[name='qsButton']#qsButton_mma
      try {
        await this.browserActions.fastClick(
          context.taskId,
          'Get a quote button',
          '#qsButton_mma, input[name="qsButton"]'
        );
      } catch (err) {
        console.warn(`[${this.name}] Main submit failed, trying backup:`, err);
        await this.browserActions.fastClick(
          context.taskId,
          'Get a quote fallback',
          'button:has-text("Get a Quote"), button:has-text("Quote"), input[type="submit"]'
        );
      }

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
        console.error(`[${this.name}] Start failed:`, error);
        await this.browserActions.takeScreenshot(context.taskId, `${this.name}-start-error`);
        return this.createErrorResponse(error instanceof Error ? error.message : 'Failed to start quote');
    }
  }

  async step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Processing step for task: ${context.taskId}`, stepData);
      
      const task = this.getTask(context.taskId);
      if (!task) {
        return this.createErrorResponse('Task not found');
      }
      
      this.updateTask(context.taskId, {
        userData: { ...task.userData, ...stepData },
        status: 'processing',
      });
      
      const page = await this.getBrowserPage(context.taskId);
      
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
      
      const currentStep = await this.identifyCurrentStep(page);
      console.log(`[${this.name}] Current step: ${currentStep}, URL: ${page.url()}`);
      
      switch (currentStep) {
        case 'personal_info':
          return await this.handlePersonalInfo(page, context, stepData);
        case 'address_info':
          return await this.handleAddressInfo(page, context, stepData);
        case 'vehicle_info':
          return await this.handleVehicleInfo(page, context, stepData);
        case 'driver_details':
          return await this.handleDriverDetails(page, context, stepData);
        case 'final_details':
          return await this.handleFinalDetails(page, context, stepData);
        case 'bundle_options':
          return await this.handleBundleOptions(page, context, stepData);
        case 'quote_results':
          return await this.handleQuoteResults(page, context, stepData);
        default:
          return this.createErrorResponse(`Unknown step: ${currentStep}`);
      }
    } catch (error) {
      console.error(`[${this.name}] Error in step:`, error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Step processing failed');
    }
  }

  private async identifyCurrentStep(page: Page): Promise<string> {
    const url = page.url().toLowerCase();
    
    if (url.includes('nameedit')) return 'personal_info';
    if (url.includes('addressedit')) return 'address_info';
    if (url.includes('vehiclesalledit')) return 'vehicle_info';
    if (url.includes('driversaddpnidetails') || url.includes('driversindex')) return 'driver_details';
    if (url.includes('finaldetailsedit')) return 'final_details';
    if (url.includes('bundle')) return 'bundle_options';
    if (url.includes('rates') || url.includes('quote')) return 'quote_results';
    
    const title = (await page.title()).toLowerCase();
    if (title.includes('personal information')) return 'personal_info';
    if (title.includes('address')) return 'address_info';
    if (title.includes('vehicle')) return 'vehicle_info';
    if (title.includes('driver')) return 'driver_details';
    if (title.includes('final details')) return 'final_details';
    if (title.includes('bundle')) return 'bundle_options';
    if (title.includes('rates') || title.includes('quote')) return 'quote_results';

    return 'unknown';
  }

  private async handlePersonalInfo(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;
    const { firstName, lastName, dateOfBirth, email } = stepData;
    
    await this.browserActions.type(taskId, 'First name field', 'input[name="FirstName"]', firstName);
    await this.browserActions.type(taskId, 'Last name field', 'input[name="LastName"]', lastName);
    await this.browserActions.type(taskId, 'Date of birth field', 'input[name*="birth"], input[name*="dob"]', dateOfBirth);
    
    await this.browserActions.type(taskId, 'Email field', 'input[type="email"], input[name*="email"]', email);

    await this.clickContinueButton(page, taskId);
    
    // Update task with next step, which will automatically populate requiredFields
    this.updateTask(context.taskId, {
      status: 'waiting_for_input',
      currentStep: 2,
    });
    
    return this.createWaitingResponse(this.getAddressInfoFields());
  }

  /**
   * STEP 2: Handle Address Information
   * 
   * Progressive's Step 2 focuses on collecting address information for the quote.
   * This step uses direct hardcoded selectors via browserActions.type() calls.
   * 
   * DOCUMENTED SELECTORS:
   * 
   * 1. Street Address Field:
   *    - Primary: 'input[name*="street"]'
   *    - Fallback: 'input[name*="address"]'
   *    - Usage: Both name attribute patterns for street address input
   * 
   * 2. Apt/Suite Field (Optional):
   *    - Primary: 'input[name*="apt"]'
   *    - Fallback: 'input[name*="suite"]'
   *    - Usage: Apartment or suite number (can be empty)
   * 
   * 3. City Field:
   *    - Selector: 'input[name*="city"]'
   *    - Usage: City name input field
   * 
   * SPECIAL HANDLING:
   * - Address verification flow: Checks page content for 'verify your address'
   * - If verification needed, re-enters street address with 'input[name*="address"]'
   * 
   * SELECTOR STRATEGY:
   * Unlike GEICO's dynamic discovery system (smartType/fallbackSelectors), 
   * Progressive uses direct hardcoded selectors with basic fallback patterns
   * via browserActions.type() method calls.
   * 
   * TODO: Consider implementing fallback selector discovery system similar to GEICO
   * TODO: Add more comprehensive address validation handling
   * TODO: Monitor for changes to Progressive's address form structure
   */
  private async handleAddressInfo(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;
    
    await this.browserActions.type(taskId, 'Street address field', 'input[name*="street"], input[name*="address"]', stepData.streetAddress);
    await this.browserActions.type(taskId, 'Apt/Suite field', 'input[name*="apt"], input[name*="suite"]', stepData.apt || '');
    await this.browserActions.type(taskId, 'City field', 'input[name*="city"]', stepData.city);
    
    await this.clickContinueButton(page, taskId);
    
    const content = await page.content();
    if (content.includes('verify your address')) {
      console.log('Address verification needed.');
      const streetAddress = stepData.streetAddress;
      await this.browserActions.type(taskId, 'Street address field', 'input[name*="address"]', streetAddress);
      await this.clickContinueButton(page, taskId);
    }
    
    // Update task with next step, which will automatically populate requiredFields
    this.updateTask(context.taskId, {
      status: 'waiting_for_input',
      currentStep: 3,
    });
    
    return this.createWaitingResponse(this.getVehicleInfoFields());
  }

  private async handleVehicleInfo(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;
    
    for (const vehicle of stepData.vehicles || []) {
      const {
        vehicleYear, vehicleMake, vehicleModel, vehicleBodyType, 
        primaryUse, annualMileage, ownership, hasTrackingDevice
      } = vehicle;
      
      await this.browserActions.click(taskId, 'Add another vehicle button', 'button:has-text("Add"), a:has-text("Add Vehicle")');
      await this.waitForPage(taskId, { time: 1 });
      
      await this.browserActions.selectOption(taskId, 'Vehicle year select', 'select[name*="year"], select[id*="year"]', [vehicleYear]);
      await this.waitForPage(taskId, { time: 2 });
      
      await this.browserActions.selectOption(taskId, 'Vehicle make select', 'select[name*="make"], select[id*="make"]', [vehicleMake]);
      await this.waitForPage(taskId, { time: 2 });
      
      await this.browserActions.selectOption(taskId, 'Vehicle model select', 'select[name*="model"], select[id*="model"]', [vehicleModel]);
      await this.waitForPage(taskId, { time: 2 });
      
      await this.browserActions.selectOption(taskId, 'Vehicle body type select', 'select[name*="body"], select[name*="trim"]', [vehicleBodyType]);
      await this.waitForPage(taskId, { time: 1 });
      
      await this.browserActions.selectOption(taskId, 'Primary use select', 'select[name*="use"], select[name*="purpose"]', [primaryUse]);
      
      await this.browserActions.type(taskId, 'Annual mileage field', 'input[name*="mileage"], input[name*="miles"]', annualMileage.toString());
      
      await this.browserActions.selectOption(taskId, 'Ownership select', 'select[name*="own"], select[name*="lease"]', [ownership]);
      
      await this.browserActions.click(taskId, `Tracking device radio - ${hasTrackingDevice}`, `input[type="radio"][name*="track"][value*="${hasTrackingDevice.toLowerCase()}"], input[type="radio"][name*="device"]:has-text("${hasTrackingDevice}")`);
      
      await this.browserActions.click(taskId, 'Save vehicle button', 'button:has-text("Save Vehicle"), button[type="submit"]');
      await this.waitForPage(taskId, { time: 1 });
    }
    
    await this.clickContinueButton(page, taskId);
    
    // Update task with next step, which will automatically populate requiredFields
    this.updateTask(context.taskId, {
      status: 'waiting_for_input',
      currentStep: 4,
    });
    
    return this.createWaitingResponse(this.getDriverDetailsFields());
  }

  private async handleDriverDetails(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;
    
    for (const driver of stepData.drivers || []) {
      const {
        gender, maritalStatus, education, employmentStatus, 
        occupation, residence, ageFirstLicensed, violations
      } = driver;
      
      await this.browserActions.click(taskId, `Gender radio - ${gender}`, `input[type="radio"][name*="gender"][value*="${gender.toLowerCase()}"], input[type="radio"][name*="sex"]:has-text("${gender}")`);
      
      await this.browserActions.selectOption(taskId, 'Marital status select', 'select[name*="marital"], select[name*="marriage"]', [maritalStatus]);
      
      await this.browserActions.selectOption(taskId, 'Education select', 'select[name*="education"], select[name*="school"]', [education]);
      
      await this.browserActions.selectOption(taskId, 'Employment status select', 'select[name*="employment"], select[name*="work"]', [employmentStatus]);
      await this.waitForPage(taskId, { time: 1 });
      
      await this.browserActions.type(taskId, 'Occupation field', 'input[name*="occupation"], input[name*="job"]', occupation);
      await this.waitForPage(taskId, { time: 1 });
      
      const questionMappings = {
        'Has a valid license?': violations && violations.length === 0,
        'Had any accidents?': violations && violations.some((v: any) => v.type === 'accident'),
      };
      
      for (const [question, answer] of Object.entries(questionMappings)) {
        await this.handleYesNoQuestion(taskId, page, question, answer);
      }
      
      await this.browserActions.selectOption(taskId, 'Primary residence select', 'select[name*="residence"], select[name*="home"]', [residence]);
      
      await this.browserActions.type(taskId, 'Age first licensed field', 'input[name*="license"], input[name*="age"]', ageFirstLicensed);
    }
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getFinalDetailsFields());
  }
  
  private async handleYesNoQuestion(taskId: string, page: Page, question: string, answer: boolean): Promise<void> {
    const questionSelector = `[data-question*="${question.toLowerCase().replace(/\s/g, '-')}"]`;
    if (answer) {
      await this.browserActions.click(taskId, `Yes radio for ${questionSelector}`, `${questionSelector}[value*="yes"], ${questionSelector}:has-text("Yes")`);
      await this.waitForPage(taskId, { time: 0.5 });
    } else {
      await this.browserActions.click(taskId, `No radio for ${questionSelector}`, `${questionSelector}[value*="no"], ${questionSelector}:has-text("No")`);
      await this.waitForPage(taskId, { time: 0.5 });
    }
  }

  private async handleFinalDetails(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;
    const {
      hasPreviousProgressive, continuousInsurance, liabilityLimits, email
    } = stepData;
    
    await this.browserActions.click(taskId, `Previous Progressive radio - ${hasPreviousProgressive}`, `input[type="radio"][name*="previous"][value*="${hasPreviousProgressive.toLowerCase()}"], input[type="radio"][name*="prog"]:has-text("${hasPreviousProgressive}")`);
    await this.browserActions.click(taskId, `Continuous insurance radio - ${continuousInsurance}`, `input[type="radio"][name*="continuous"][value*="${continuousInsurance.toLowerCase()}"], input[type="radio"][name*="insured"]:has-text("${continuousInsurance}")`);
    await this.browserActions.selectOption(taskId, 'Bodily injury limits select', 'select[name*="bodily"], select[name*="liability"]', [liabilityLimits]);
    
    try {
      await this.browserActions.type(taskId, 'Email address field', 'input[type="email"]', email);
    } catch (e) {
      // Email was likely entered on the personal info page
    }
    
    await this.clickContinueButton(page, taskId);
    return this.createWaitingResponse(this.getBundleOptionsFields());
  }

  private async handleBundleOptions(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;
    
    if (stepData.bundleChoice === 'auto_only') {
      await this.browserActions.click(taskId, 'No thanks button', 'button:has-text("No thanks"), a:has-text("just auto")');
      await this.waitForPage(taskId, { time: 3 });
    } else {
      await this.clickContinueButton(page, taskId);
    }
    
    const quoteInfo = await this.extractQuoteInfo(page);
    if (quoteInfo) {
      this.updateTask(context.taskId, {
        status: 'completed',
        quote: quoteInfo,
      });
      return this.createCompletedResponse(quoteInfo);
    }
    
    return this.createErrorResponse('Could not retrieve quote after bundle options');
  }

  private async handleQuoteResults(page: Page, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const taskId = context.taskId;

    const quoteInfo = await this.extractQuoteInfo(page);
    if (quoteInfo) {
      this.updateTask(taskId, {
        status: 'completed',
        quote: quoteInfo,
      });
      return this.createCompletedResponse(quoteInfo);
    }
    return this.createErrorResponse('Failed to extract quote from results page.');
  }

  protected async clickContinueButton(page: Page, taskId: string): Promise<void> {
    // OPTIMIZED: Fast, targeted continue button clicking
    // Remove networkidle wait and use most reliable selectors first
    const optimizedSelectors = [
      'button[type="submit"]', // Most common
      'input[type="submit"]',  // Form submit buttons
      'button:has-text("Continue")',
      'button#next-button',
      'a:has-text("Continue")'
    ];
    
    let clicked = false;
    for (const selector of optimizedSelectors) {
      try {
        await this.browserActions.fastClick(taskId, `Continue button (${selector})`, selector);
        // OPTIMIZED: Remove networkidle wait - just wait for basic load
        await page.waitForLoadState('load', { timeout: 5000 }); // Reduced timeout
        clicked = true;
        break;
      } catch (error) {
        // Selector not found, try next
        continue;
      }
    }
    
    if (!clicked) {
      // OPTIMIZED: Final attempt with any clickable button
      try {
        await this.browserActions.fastClick(taskId, 'Any submit button', 'button, input[type="submit"]');
        await page.waitForLoadState('load', { timeout: 5000 }); // Reduced timeout
      } catch (error) {
        throw new Error('Could not find a continue button');
      }
    }
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    try {
      const priceText = await this.findPriceOnPage(page);

      if (!priceText) {
        return null;
      }

      const coverageDetails: Record<string, any> = {};
      const coverageItems = await page.locator('[data-qu-id*="coverage-item"]').all();

      for (const item of coverageItems) {
        const label = await item.locator('[data-qu-id*="coverage-label"]').textContent();
        const value = await item.locator('[data-qu-id*="coverage-value"]').textContent();
        if (label && value) {
          coverageDetails[label.trim()] = value.trim();
        }
      }

      const premium = parseFloat(priceText.replace(/[^0-9.]/g, ''));

      const quote: QuoteResult = {
        carrier: this.name,
        price: priceText,
        term: '6-Month',
        coverageDetails,
        premium,
        coverages: Object.entries(coverageDetails).map(([name, details]) => ({
          name,
          details: details as string
        })),
      };

      return quote;
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      return null;
    }
  }

  private async findPriceOnPage(page: Page): Promise<string | null> {
    const priceSelectors = [
      '[data-qu-id="price"]',
      '[data-testid="price-amount"]',
      '.final-price',
      'span[class*="price"]'
    ];

    for (const selector of priceSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          if (text && text.includes('$')) {
            return text.trim();
          }
        }
      } catch (e) {
        // ignore and try next selector
      }
    }
    return null;
  }
  
  private getPersonalInfoFields(): Record<string, FieldDefinition> {
    return {
      firstName: { type: 'text', required: true, label: 'First Name' },
      lastName: { type: 'text', required: true, label: 'Last Name' },
      dateOfBirth: { type: 'date', required: true, label: 'Date of Birth' },
      email: { type: 'email', required: false, label: 'Email Address' },
    };
  }

  private getAddressInfoFields(): Record<string, FieldDefinition> {
    return {
      streetAddress: { type: 'text', required: true, label: 'Street Address' },
      apt: { type: 'text', required: false, label: 'Apt/Suite' },
      city: { type: 'text', required: true, label: 'City' },
    };
  }

  private getVehicleInfoFields(): Record<string, FieldDefinition> {
    return {
      vehicles: {
        type: 'array',
        required: true,
        label: 'Vehicles',
        itemFields: {
          vehicleYear: { type: 'select', required: true, label: 'Year', options: this.generateYearOptions() },
          vehicleMake: { type: 'text', required: true, label: 'Make' },
          vehicleModel: { type: 'text', required: true, label: 'Model' },
          vehicleBodyType: { type: 'text', required: true, label: 'Body Type' },
          primaryUse: { type: 'select', required: true, label: 'Primary Use', options: ['Commute', 'Pleasure', 'Business'] },
          annualMileage: { type: 'number', required: true, label: 'Annual Mileage' },
          ownership: { type: 'select', required: true, label: 'Ownership', options: ['Owned', 'Financed', 'Leased'] },
          hasTrackingDevice: { type: 'boolean', required: true, label: 'Has Tracking Device?' },
        },
      },
    };
  }

  private getDriverDetailsFields(): Record<string, FieldDefinition> {
    return {
      drivers: {
        type: 'array',
        required: true,
        label: 'Drivers',
        itemFields: {
          gender: { type: 'select', required: true, label: 'Gender', options: ['Male', 'Female', 'Non-Binary'] },
          maritalStatus: { type: 'select', required: true, label: 'Marital Status', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
          education: { type: 'select', required: true, label: 'Education', options: ['High School', 'Some College', `Bachelor's Degree`, `Master's Degree`, 'PhD'] },
          employmentStatus: { type: 'select', required: true, label: 'Employment Status', options: ['Employed', 'Unemployed', 'Student', 'Retired'] },
          occupation: { type: 'text', required: true, label: 'Occupation' },
          residence: { type: 'select', required: true, label: 'Residence', options: ['Own Home', 'Rent', 'Other'] },
          ageFirstLicensed: { type: 'number', required: true, label: 'Age First Licensed' },
          violations: { type: 'array', required: false, label: 'Violations', itemFields: {
            type: { type: 'select', required: true, label: 'Type', options: ['Accident', 'Ticket', 'DUI'] },
            date: { type: 'date', required: true, label: 'Date' }
          }},
        },
      },
    };
  }

  private getFinalDetailsFields(): Record<string, FieldDefinition> {
    return {
      hasPreviousProgressive: { type: 'boolean', required: true, label: 'Had Progressive in the past 6 months?' },
      continuousInsurance: { type: 'boolean', required: true, label: 'Continuously insured for the past 6 months?' },
      liabilityLimits: { type: 'select', required: true, label: 'Current Bodily Injury Liability Limits', options: ['$25k/$50k', '$50k/$100k', '$100k/$300k'] },
      email: { type: 'email', required: true, label: 'Email Address' },
    };
  }

  private getBundleOptionsFields(): Record<string, FieldDefinition> {
    return {
      bundleChoice: { type: 'select', required: true, label: 'Bundle Options', options: ['auto_only', 'auto_and_home', 'auto_and_renters'] },
    };
  }

  private generateYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 1; year >= 1981; year--) {
      years.push(year.toString());
    }
    return years;
  }

  /**
   * Override to provide Progressive-specific step-to-field mappings
   */
  protected getStepRequiredFields(step: number, status: TaskState['status']): Record<string, FieldDefinition> {
    // Only return required fields when waiting for input or processing
    if (status !== 'waiting_for_input' && status !== 'processing') {
      return {};
    }

    switch (step) {
      case 1:
        return this.getPersonalInfoFields();
      case 2:
        return this.getAddressInfoFields();
      case 3:
        return this.getVehicleInfoFields();
      case 4:
        return this.getDriverDetailsFields();
      case 5:
        return this.getFinalDetailsFields();
      case 6:
        return this.getBundleOptionsFields();
      default:
        return {};
    }
  }
} 