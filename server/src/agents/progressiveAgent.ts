import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class ProgressiveAgent extends BaseCarrierAgent {
  readonly name = 'Progressive';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Starting quote for task: ${context.taskId}`, context.userData);
      
      this.createTask(context.taskId, this.name);

      const page = await this.getBrowserPage(context.taskId);
      
      // Navigate to Progressive homepage using hybrid method
      await this.hybridNavigate(context.taskId, 'https://www.progressive.com/');
      
      // Click on Auto insurance link to open the dialog using hybrid method
      console.log(`[${this.name}] Clicking Auto insurance link...`);
      await this.hybridClick(context.taskId, 'Auto insurance link', 'a:has-text("Auto")');
      
      // Wait for dialog to appear
      await this.mcpWaitFor(context.taskId, { time: 2 });
      
      // Fill ZIP code in the dialog using hybrid method
      if (context.userData.zipCode) {
        console.log(`[${this.name}] Filling ZIP code: ${context.userData.zipCode}`);
        await this.hybridType(context.taskId, 'ZIP code field', 'input[name*="zip"], input[placeholder*="ZIP"], input[id*="zip"]', context.userData.zipCode);
        
        // Click "Get a quote" button using hybrid method
        await this.hybridClick(context.taskId, 'Get a quote button', 'button:has-text("Get"):has-text("quote")');
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
      console.error(`[${this.name}] Error starting quote:`, error);
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
    
    // Fill first name using hybrid method
    await this.hybridType(taskId, 'First name field', 'input[name*="first"], input[id*="first"]', firstName);
    
    // Fill last name using hybrid method
    await this.hybridType(taskId, 'Last name field', 'input[name*="last"], input[id*="last"]', lastName);
    
    // Fill date of birth using hybrid method (MM/DD/YYYY format required)
    await this.hybridType(taskId, 'Date of birth field', 'input[name*="birth"], input[id*="birth"], input[name*="dob"]', dateOfBirth);
    
    // Fill email if provided using hybrid method (optional field)
    if (email && !email.includes('test') && !email.includes('example')) {
      await this.hybridType(taskId, 'Email field', 'input[type="email"], input[name*="email"]', email);
    }
    
    await this.clickContinueButton(page);
    
    return this.createSuccessResponse({
      message: 'Personal information submitted',
      nextStep: 'address_info',
      fields: this.getAddressInfoFields(),
    });
  }

  private async handleAddressInfo(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const streetAddress = stepData.streetAddress || '123 Main Street';
    
    // Fill street address
    const addressField = page.locator('input[name*="address"], input[name*="street"]').first();
    if (await addressField.count() > 0) {
      await addressField.fill(streetAddress);
    }
    
    await this.clickContinueButton(page);
    
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
    
    // First, click "Add another vehicle" if needed
    const addVehicleButton = page.locator('button').filter({ hasText: /add.*vehicle/i }).first();
    if (await addVehicleButton.count() > 0) {
      await addVehicleButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Fill vehicle year (enables make dropdown)
    const yearSelect = page.locator('select[name*="year"], select[id*="year"]').first();
    if (await yearSelect.count() > 0) {
      await yearSelect.selectOption(vehicleYear);
      await page.waitForTimeout(1000); // Wait for make dropdown to populate
    }
    
    // Fill vehicle make (enables model dropdown)
    const makeSelect = page.locator('select[name*="make"], select[id*="make"]').first();
    if (await makeSelect.count() > 0) {
      await makeSelect.selectOption(vehicleMake);
      await page.waitForTimeout(1000); // Wait for model dropdown to populate
    }
    
    // Fill vehicle model (enables body type dropdown)
    const modelSelect = page.locator('select[name*="model"], select[id*="model"]').first();
    if (await modelSelect.count() > 0) {
      await modelSelect.selectOption(vehicleModel);
      await page.waitForTimeout(1000); // Wait for body type dropdown to populate
    }
    
    // Fill body type (enables other fields)
    const bodyTypeSelect = page.locator('select').filter({ hasText: /4DR|2DR|SUV|Truck/i }).first();
    if (await bodyTypeSelect.count() > 0) {
      await bodyTypeSelect.selectOption(vehicleBodyType);
      await page.waitForTimeout(1000);
    }
    
    // Fill primary use
    const primaryUseSelect = page.locator('select').filter({ hasText: /pleasure|business|commute/i }).first();
    if (await primaryUseSelect.count() > 0) {
      await primaryUseSelect.selectOption(primaryUse);
    }
    
    // Fill commute miles
    const commuteField = page.locator('input[name*="mile"], input[placeholder*="mile"]').first();
    if (await commuteField.count() > 0) {
      await commuteField.fill(commuteMiles);
    }
    
    // Select ownership
    const ownershipSelect = page.locator('select').filter({ hasText: /own|lease|finance/i }).first();
    if (await ownershipSelect.count() > 0) {
      await ownershipSelect.selectOption(ownership);
    }
    
    // Handle tracking device question
    const trackingRadio = page.locator(`input[type="radio"]`).filter({ hasText: new RegExp(hasTrackingDevice, 'i') }).first();
    if (await trackingRadio.count() > 0) {
      await trackingRadio.click();
    }
    
    // Save vehicle
    const saveButton = page.locator('button').filter({ hasText: /save.*vehicle/i }).first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1000);
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
    const employmentStatus = stepData.employmentStatus || 'Employed/Self-employed (full- or part-time)';
    const occupation = stepData.occupation || 'Teacher';
    const residence = stepData.residence || 'Own home';
    const ageFirstLicensed = stepData.ageFirstLicensed || '16';
    
    // Handle gender
    const genderRadio = page.locator(`input[type="radio"]`).filter({ hasText: new RegExp(gender, 'i') }).first();
    if (await genderRadio.count() > 0) {
      await genderRadio.click();
    }
    
    // Handle marital status
    const maritalSelect = page.locator('select').filter({ hasText: /single|married|divorced/i }).first();
    if (await maritalSelect.count() > 0) {
      await maritalSelect.selectOption(maritalStatus);
    }
    
    // Handle education
    const educationSelect = page.locator('select').filter({ hasText: /education|college|degree/i }).first();
    if (await educationSelect.count() > 0) {
      await educationSelect.selectOption(education);
    }
    
    // Handle employment status
    const employmentSelect = page.locator('select').filter({ hasText: /employed|employment/i }).first();
    if (await employmentSelect.count() > 0) {
      await employmentSelect.selectOption(employmentStatus);
      await page.waitForTimeout(1000); // Wait for occupation field to appear
    }
    
    // Handle occupation (auto-complete field)
    const occupationField = page.locator('input[name*="occupation"], input[placeholder*="occupation"]').first();
    if (await occupationField.count() > 0) {
      await occupationField.fill(occupation);
      await page.waitForTimeout(1000);
      
      // Select from dropdown if available
      const occupationOption = page.locator('li, option').filter({ hasText: new RegExp(occupation, 'i') }).first();
      if (await occupationOption.count() > 0) {
        await occupationOption.click();
      }
    }
    
    // Handle residence
    const residenceSelect = page.locator('select').filter({ hasText: /own.*home|rent|residence/i }).first();
    if (await residenceSelect.count() > 0) {
      await residenceSelect.selectOption(residence);
    }
    
    // Handle age first licensed
    const ageField = page.locator('input[name*="age"], input[placeholder*="age"]').first();
    if (await ageField.count() > 0) {
      await ageField.fill(ageFirstLicensed);
    }
    
    // Handle driving history questions (all "No" for clean record)
    const noRadios = page.locator('input[type="radio"][value*="no"], input[type="radio"]').filter({ hasText: /no/i });
    const noRadioCount = await noRadios.count();
    for (let i = 0; i < noRadioCount; i++) {
      try {
        await noRadios.nth(i).click();
        await page.waitForTimeout(500);
      } catch (error) {
        // Continue if radio button is not clickable
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
    
    // Handle previous Progressive policy question
    const progressiveRadio = page.locator('input[type="radio"]').filter({ hasText: new RegExp(hasPreviousProgressive, 'i') }).first();
    if (await progressiveRadio.count() > 0) {
      await progressiveRadio.click();
    }
    
    // Handle continuous insurance question
    const insuranceRadio = page.locator('input[type="radio"]').filter({ hasText: new RegExp(continuousInsurance, 'i') }).first();
    if (await insuranceRadio.count() > 0) {
      await insuranceRadio.click();
    }
    
    // Handle liability limits
    const liabilitySelect = page.locator('select').filter({ hasText: /liability|bodily.*injury/i }).first();
    if (await liabilitySelect.count() > 0) {
      await liabilitySelect.selectOption(liabilityLimits);
    }
    
    // Handle email (critical - must be realistic)
    const emailField = page.locator('input[type="email"], input[name*="email"]').first();
    if (await emailField.count() > 0) {
      await emailField.clear();
      await emailField.fill(email);
    }
    
    await this.clickContinueButton(page);
    
    return this.createSuccessResponse({
      message: 'Final details submitted',
      nextStep: 'bundle_options',
      fields: this.getBundleOptionsFields(),
    });
  }

  private async handleBundleOptions(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Skip bundle options - click "No thanks, just auto"
    const skipBundleButton = page.locator('button').filter({ hasText: /no.*thanks.*auto/i }).first();
    if (await skipBundleButton.count() > 0) {
      await skipBundleButton.click();
      await page.waitForLoadState('networkidle');
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

    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Ok, start my quote")', 
      'button[type="submit"]',
      'button:has-text("Next")',
      '.continue-btn',
      '.btn-primary'
    ];

    for (const selector of continueSelectors) {
      try {
        // Try hybrid click first
        await this.hybridClick(taskId, 'Continue button', selector);
        return;
      } catch (error) {
        // Continue to next selector
      }
    }
    
    throw new Error('Could not find continue button');
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    try {
      const url = page.url();
      const content = await page.textContent('body') || '';
      
      // Check if we're on the rates page
      if (!url.includes('/Rates') && !content.includes('month') && !content.includes('$')) {
        return null;
      }
      
      // Extract pricing information
      let monthlyPrice = 'Quote Available';
      let totalPrice = 'Quote Available';
      let discounts = 'Available';
      
      // Look for monthly price
      const monthlyPriceSelectors = [
        '[data-testid*="monthly"]',
        '.monthly-price',
        'text=/\\$\\d+\\.\\d+.*month/i'
      ];
      
      for (const selector of monthlyPriceSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.includes('$')) {
              monthlyPrice = text.trim();
              break;
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // Look for total price
      const totalPriceSelectors = [
        '[data-testid*="total"]',
        '.total-price',
        'text=/\\$\\d+,?\\d*\\.\\d+/i'
      ];
      
      for (const selector of totalPriceSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.includes('$') && text !== monthlyPrice) {
              totalPrice = text.trim();
              break;
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // Look for discounts
      const discountSelectors = [
        '[data-testid*="discount"]',
        '.discount',
        'text=/\\$\\d+.*discount/i',
        'text=/\\$\\d+.*saving/i'
      ];
      
      for (const selector of discountSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.includes('$')) {
              discounts = text.trim();
              break;
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      return {
        price: monthlyPrice,
        term: 'month',
        carrier: 'Progressive',
        coverageDetails: {
          timestamp: new Date().toISOString(),
          url: page.url(),
          totalPrice,
          discounts,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      return null;
    }
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