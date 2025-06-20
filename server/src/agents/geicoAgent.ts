import { Page } from 'playwright';
import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class GeicoAgent extends BaseCarrierAgent {
  readonly name = 'GEICO';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    return this.startQuote(context, context.userData);
  }

  async startQuote(context: CarrierContext, userData: Record<string, any>): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Starting quote process for task: ${context.taskId}`);
      
      this.createTask(context.taskId, this.name);

      const page = await this.getBrowserPage(context.taskId);
      
      // Navigate to GEICO homepage using hybrid method
      await this.hybridNavigate(context.taskId, 'https://www.geico.com');
      
      try {
        // Try smart discovery for auto insurance selection
        await this.smartClick(context.taskId, 'Auto insurance selection', 'auto_insurance_button');
        await this.mcpWaitFor(context.taskId, { time: 0.5 }); // Brief wait for any JS updates

        // Enter ZIP code using smart discovery
        const zipCode = userData.zipCode || '94105';
        await this.smartType(context.taskId, 'ZIP code input field', 'zipcode', zipCode);
        
        // Click the start quote button using smart discovery
        await this.smartClick(context.taskId, 'Start quote button', 'start_quote_button');
        
      } catch (smartError) {
        console.warn(`[${this.name}] Smart discovery failed, trying legacy selectors:`, smartError);
        
        // Fallback to legacy selectors
        await this.hybridClick(context.taskId, 'Auto insurance selection', '#insurancetype-auto');
        await this.mcpWaitFor(context.taskId, { time: 0.5 });

        const zipCode = userData.zipCode || '94105';
        await this.hybridType(context.taskId, 'ZIP code input field', '#zip-input', zipCode);
        
        await this.hybridClick(context.taskId, 'Start quote button', '.btn-primary[data-action="AU_Continue"]');
      }
      
      // Wait for redirect to sales.geico.com/quote
      await this.mcpWaitFor(context.taskId, { time: 3 }); // Wait for navigation
      
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
      });

      return this.createSuccessResponse({
        message: 'Quote started successfully',
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
          quote: {
            ...quoteInfo,
            carrier: this.name,
            coverageDetails: quoteInfo.coverageDetails || {},
          },
        });
        
        return this.createSuccessResponse({
          quote: quoteInfo,
          completed: true,
        });
      }
      
      // Process the current step based on page title and content
      const pageTitle = await page.title();
      const currentStep = await this.identifyCurrentStep(page);
      
      console.log(`[${this.name}] Current step: ${currentStep}, Page title: ${pageTitle}`);
      
      switch (currentStep) {
        case 'date_of_birth':
          return await this.handleDateOfBirth(page, stepData);
        case 'name_collection':
          return await this.handleNameCollection(page, stepData);
        case 'address_collection':
          return await this.handleAddressCollection(page, stepData);
        case 'vin_question':
          return await this.handleVinQuestion(page, stepData);
        case 'vehicle_details':
          return await this.handleVehicleDetails(page, stepData);
        case 'vehicle_characteristics':
          return await this.handleVehicleCharacteristics(page, stepData);
        case 'multi_vehicle':
          return await this.handleMultiVehicle(page, stepData);
        case 'driver_demographics':
          return await this.handleDriverDemographics(page, stepData);
        case 'residence_info':
          return await this.handleResidenceInfo(page, stepData);
        case 'current_insurance':
          return await this.handleCurrentInsurance(page, stepData);
        case 'driving_history':
          return await this.handleDrivingHistory(page, stepData);
        case 'demographics_discounts':
          return await this.handleDemographicsDiscounts(page, stepData);
        case 'additional_drivers':
          return await this.handleAdditionalDrivers(page, stepData);
        case 'driving_record':
          return await this.handleDrivingRecord(page, stepData);
        case 'organizational_discounts':
          return await this.handleOrganizationalDiscounts(page, stepData);
        case 'quote_finalization':
          return await this.handleQuoteFinalization(page, stepData);
        default:
          return this.createErrorResponse(`Unknown step: ${currentStep}`);
      }
    } catch (error) {
      console.error(`[${this.name}] Error in step:`, error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Step processing failed');
    }
  }

  private async identifyCurrentStep(page: Page): Promise<string> {
    const pageTitle = await page.title();
    const content = await page.textContent('body') || '';
    
    // Check for specific page indicators
    if (content.includes('Date of Birth') || content.includes('When were you born')) {
      return 'date_of_birth';
    }
    if (content.includes('Tell us about yourself') && (content.includes('First Name') || content.includes('Last Name'))) {
      return 'name_collection';
    }
    if (content.includes('address') || content.includes('Address')) {
      return 'address_collection';
    }
    if (content.includes('automobile VIN')) {
      return 'vin_question';
    }
    if (pageTitle.includes('Vehicle Details') && (content.includes('Year') || content.includes('Make') || content.includes('Model'))) {
      return 'vehicle_details';
    }
    if (content.includes('Body Style') || content.includes('anti-theft') || content.includes('owned, financed') || content.includes('Primary Use')) {
      return 'vehicle_characteristics';
    }
    if (content.includes('insure any other vehicles')) {
      return 'multi_vehicle';
    }
    if (content.includes('Gender') || content.includes('Marital Status')) {
      return 'driver_demographics';
    }
    if (content.includes('own or rent your home')) {
      return 'residence_info';
    }
    if (content.includes('current.*insurance')) {
      return 'current_insurance';
    }
    if (content.includes('driver.*license') || content.includes('foreign country')) {
      return 'driving_history';
    }
    if (content.includes('education') || content.includes('employment') || content.includes('military.*affiliation')) {
      return 'demographics_discounts';
    }
    if (content.includes('add any other drivers')) {
      return 'additional_drivers';
    }
    if (content.includes('accidents.*tickets.*DUI')) {
      return 'driving_record';
    }
    if (pageTitle.includes('Savings') && content.includes('organizations')) {
      return 'organizational_discounts';
    }
    if (content.includes('save your quote') || content.includes('email.*phone')) {
      return 'quote_finalization';
    }
    
    return 'unknown';
  }

  private async handleDateOfBirth(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const dateOfBirth = stepData.dateOfBirth || '01/01/1990';
    
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Filling date of birth on ${page.url()}`);
    
    try {
      // Use smart typing for better field discovery
      await this.smartType(taskId, 'Date of birth field', 'dateofbirth', dateOfBirth);
    } catch (smartError) {
      console.warn(`[${this.name}] Smart field discovery failed, trying legacy approach:`, smartError);
      
      // Fallback to legacy selector
      await page.getByRole('textbox', { name: /date.*birth/i }).fill(dateOfBirth);
    }
    
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'name_collection',
      fields: this.getNameCollectionFields(),
    });
  }

  private async handleNameCollection(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const firstName = stepData.firstName || 'John';
    const lastName = stepData.lastName || 'Doe';
    
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Filling name collection on ${page.url()}`);
    
    try {
      // Use smart typing for better field discovery
      await this.smartType(taskId, 'First name field', 'firstname', firstName);
      await this.smartType(taskId, 'Last name field', 'lastname', lastName);
    } catch (smartError) {
      console.warn(`[${this.name}] Smart field discovery failed, trying legacy approach:`, smartError);
      
      // Fallback to legacy selectors
      await page.getByRole('textbox', { name: /first.*name/i }).fill(firstName);
      await page.getByRole('textbox', { name: /last.*name/i }).fill(lastName);
    }
    
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'address_collection',
      fields: this.getAddressCollectionFields(),
    });
  }

  private async handleAddressCollection(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const address = stepData.address || stepData.streetAddress || '123 Main Street';
    
    // Get taskId from the current tasks
    const taskId = Array.from(this.tasks.keys())[0];
    if (!taskId) {
      return this.createErrorResponse('No active task found');
    }
    
    console.log(`[${this.name}] Filling address collection on ${page.url()}`);
    
    try {
      // Use smart typing for better field discovery
      await this.smartType(taskId, 'Address field', 'address', address);
    } catch (smartError) {
      console.warn(`[${this.name}] Smart field discovery failed, trying legacy approach:`, smartError);
      
      // Fallback to legacy selector
      await page.getByRole('searchbox', { name: /address/i }).fill(address);
    }
    
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'vin_question',
      fields: this.getVinQuestionFields(),
    });
  }

  private async handleVinQuestion(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const hasVin = stepData.hasVin || false;
    
    if (hasVin && stepData.vin) {
      await page.getByRole('radio', { name: /yes/i }).click();
      // Handle VIN input if they have one
      await page.getByRole('textbox', { name: /vin/i }).fill(stepData.vin);
    } else {
      await page.getByRole('radio', { name: /no/i }).click();
    }
    
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'vehicle_details',
      fields: this.getVehicleDetailsFields(),
    });
  }

  private async handleVehicleDetails(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const year = stepData.vehicleYear || '2022';
    const make = stepData.vehicleMake || 'Honda';
    const model = stepData.vehicleModel || 'Civic';
    
    // Select year
    await page.getByLabel(/year/i).selectOption(year);
    await page.waitForTimeout(1000);
    
    // Select make  
    await page.getByLabel(/make/i).selectOption(make);
    await page.waitForTimeout(1000);
    
    // Select model
    await page.getByLabel(/model/i).selectOption(model);
    
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'vehicle_characteristics',
      fields: this.getVehicleCharacteristicsFields(),
    });
  }

  private async handleVehicleCharacteristics(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const content = await page.textContent('body') || '';
    
    // Handle Body Style if present
    if (content.includes('Body Style')) {
      const bodyStyle = stepData.bodyStyle || 'Sedan';
      await page.getByRole('radio', { name: new RegExp(bodyStyle, 'i') }).click();
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'vehicle_characteristics' });
    }
    
    // Handle Anti-theft if present
    if (content.includes('anti-theft')) {
      const antiTheft = stepData.antiTheft || 'Passive Disabling Device';
      try {
        await page.getByLabel(/anti.*theft/i).selectOption(antiTheft);
      } catch {
        // Use default if selection fails
      }
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'vehicle_characteristics' });
    }
    
    // Handle Ownership if present
    if (content.includes('owned, financed, or leased')) {
      const ownership = stepData.ownership || 'Owned';
      await page.getByRole('radio', { name: new RegExp(ownership, 'i') }).click();
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'vehicle_characteristics' });
    }
    
    // Handle Primary Use if present
    if (content.includes('Primary Use')) {
      const primaryUse = stepData.primaryUse || 'Commute';
      await page.getByRole('radio', { name: new RegExp(primaryUse, 'i') }).click();
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'vehicle_characteristics' });
    }
    
    // Handle Ownership Length if present
    if (content.includes('How long')) {
      const ownershipLength = stepData.ownershipLength || '1 to 2 years';
      await page.getByLabel(/how long/i).selectOption(ownershipLength);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'vehicle_characteristics' });
    }
    
    // Handle Odometer if present
    if (content.includes('odometer')) {
      const odometer = stepData.odometer || '25000';
      await page.getByRole('textbox', { name: /odometer/i }).fill(odometer);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'multi_vehicle' });
    }
    
    // Default progression
    await this.clickNextButton(page);
    return this.createSuccessResponse({ nextStep: 'multi_vehicle' });
  }

  private async handleMultiVehicle(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Continue with single vehicle for now
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'driver_demographics',
      fields: this.getDriverDemographicsFields(),
    });
  }

  private async handleDriverDemographics(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const content = await page.textContent('body') || '';
    
    if (content.includes('Gender')) {
      const gender = stepData.gender || 'Male';
      await page.getByLabel(/gender/i).selectOption(gender);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'driver_demographics' });
    }
    
    if (content.includes('Marital Status')) {
      const maritalStatus = stepData.maritalStatus || 'Single';
      await page.getByLabel(/marital.*status/i).selectOption(maritalStatus);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'residence_info' });
    }
    
    await this.clickNextButton(page);
    return this.createSuccessResponse({ nextStep: 'residence_info' });
  }

  private async handleResidenceInfo(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const homeOwnership = stepData.homeOwnership || 'Own';
    await page.getByRole('radio', { name: new RegExp(homeOwnership, 'i') }).click();
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'current_insurance',
      fields: this.getCurrentInsuranceFields(),
    });
  }

  private async handleCurrentInsurance(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const content = await page.textContent('body') || '';
    
    if (content.includes('currently have auto insurance')) {
      const hasInsurance = stepData.hasCurrentInsurance !== false;
      await page.getByRole('radio', { name: hasInsurance ? /yes/i : /no/i }).click();
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'current_insurance' });
    }
    
    if (content.includes('bodily injury limits')) {
      const bodilyInjuryLimits = stepData.bodilyInjuryLimits || '$100,000/$300,000';
      await page.getByLabel(/bodily.*injury/i).selectOption(bodilyInjuryLimits);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'driving_history' });
    }
    
    await this.clickNextButton(page);
    return this.createSuccessResponse({ nextStep: 'driving_history' });
  }

  private async handleDrivingHistory(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const content = await page.textContent('body') || '';
    
    if (content.includes('when you got your driver')) {
      const licenseAge = stepData.licenseAge || '16';
      await page.getByRole('textbox', { name: /how old.*license/i }).fill(licenseAge);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'driving_history' });
    }
    
    if (content.includes('foreign country')) {
      await page.getByRole('radio', { name: /no/i }).click();
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'demographics_discounts' });
    }
    
    await this.clickNextButton(page);
    return this.createSuccessResponse({ nextStep: 'demographics_discounts' });
  }

  private async handleDemographicsDiscounts(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const content = await page.textContent('body') || '';
    
    if (content.includes('education')) {
      const education = stepData.education || 'Bachelors';
      await page.getByLabel(/education/i).selectOption(education);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'demographics_discounts' });
    }
    
    if (content.includes('military.*affiliation')) {
      await page.getByText('Does Not Apply').click();
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'demographics_discounts' });
    }
    
    if (content.includes('employment status')) {
      const employment = stepData.employment || 'A Private Company/Organization or Self Employed';
      await page.getByLabel(/employment.*status/i).selectOption(employment);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'demographics_discounts' });
    }
    
    if (content.includes('Industry')) {
      const industry = stepData.industry || 'Computers';
      await page.getByLabel(/industry/i).selectOption(industry);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'demographics_discounts' });
    }
    
    if (content.includes('Occupation')) {
      const occupation = stepData.occupation || 'Computer Software Engineer';
      await page.getByLabel(/occupation/i).selectOption(occupation);
      await this.clickNextButton(page);
      return this.createSuccessResponse({ nextStep: 'additional_drivers' });
    }
    
    await this.clickNextButton(page);
    return this.createSuccessResponse({ nextStep: 'additional_drivers' });
  }

  private async handleAdditionalDrivers(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Continue with single driver
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'driving_record',
      fields: this.getDrivingRecordFields(),
    });
  }

  private async handleDrivingRecord(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Continue with clean record (no incidents to add)
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'organizational_discounts',
      fields: this.getOrganizationalDiscountFields(),
    });
  }

  private async handleOrganizationalDiscounts(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    // Skip organizational discounts
    await this.clickNextButton(page);
    
    return this.createSuccessResponse({
      nextStep: 'quote_finalization',
      fields: this.getQuoteFinalizationFields(),
    });
  }

  private async handleQuoteFinalization(page: Page, stepData: Record<string, any>): Promise<CarrierResponse> {
    const email = stepData.email || 'john.doe@example.com';
    const phone = stepData.phone || '4155551234';
    
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByRole('textbox', { name: /phone/i }).fill(phone);
    
    // Click "Take Me To My Quote"
    await page.getByRole('button', { name: /take.*quote/i }).click();
    
    // Wait for quote results
    await page.waitForTimeout(10000); // Wait for processing
    
    return this.createSuccessResponse({
      nextStep: 'quote_results',
      message: 'Quote processing started',
    });
  }

  private async clickNextButton(page: Page): Promise<void> {
    await page.waitForTimeout(1000); // Allow for form validation
    
    const nextButton = page.getByRole('button', { name: /next/i });
    
    // Wait for button to be enabled
    await page.waitForFunction(() => {
      const button = document.querySelector('button[type="submit"], button:has-text("Next")');
      return button && !button.hasAttribute('disabled');
    }, { timeout: 10000 });
    
    await nextButton.click();
    await page.waitForTimeout(3000); // Wait for page transition
  }

  protected async extractQuoteInfo(page: Page): Promise<QuoteResult | null> {
    try {
      const pageTitle = await page.title();
      const content = await page.textContent('body') || '';
      
      // Check if we're on the quote results page
      if (!pageTitle.includes('GEICO Quote') || !content.includes('Choose a starting point')) {
        return null;
      }
      
      // Extract quote information from the page
      const quoteInfo = await page.evaluate(() => {
        const quotes = [];
        
        // Look for coverage options
        const coverageOptions = document.querySelectorAll('[role="radio"]');
        
        for (const option of coverageOptions) {
          const optionText = option.textContent || '';
          const monthlyMatch = optionText.match(/\$([0-9,]+\.?\d*)/);
          const premiumMatch = optionText.match(/Premium: \$([0-9,]+\.?\d*)/);
          
          if (monthlyMatch) {
            const coverageType = optionText.includes('Less Coverage') ? 'Less Coverage' : 'More Coverage';
            const description = optionText.includes('minimum') ? 
              'Coverages meet or exceed your state\'s minimum auto limits' :
              'Coverages offer additional auto protection';
            
            quotes.push({
              type: coverageType,
              monthly: monthlyMatch[1],
              sixMonth: premiumMatch ? premiumMatch[1] : null,
              description: description,
              selected: option.hasAttribute('checked') || (option as HTMLInputElement).checked
            });
          }
        }
        
        return {
          quotes,
          location: document.body.textContent?.includes('San Francisco') ? 'San Francisco, CA' : null,
          vehicle: document.body.textContent?.match(/(\d{4}\s+\w+\s+\w+)/)?.[1] || null
        };
      });
      
      if (quoteInfo.quotes.length > 0) {
        const selectedQuote = quoteInfo.quotes.find(q => q.selected) || quoteInfo.quotes[0];
        
        return {
          price: `$${selectedQuote.monthly}/month`,
          term: selectedQuote.sixMonth ? `$${selectedQuote.sixMonth} (6 months)` : 'Monthly',
          carrier: this.name,
          coverageDetails: {
            carrier: 'GEICO',
            coverageType: selectedQuote.type,
            description: selectedQuote.description,
            allOptions: quoteInfo.quotes,
            vehicle: quoteInfo.vehicle,
            location: quoteInfo.location,
            extractedAt: new Date().toISOString()
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting quote info:', error);
      return null;
    }
  }

  // Field definition methods
  private getPersonalInfoFields(): Record<string, FieldDefinition> {
    return {
      dateOfBirth: {
        id: 'dateOfBirth',
        name: 'Date of Birth',
        type: 'date',
        required: true,
      },
    };
  }

  private getNameCollectionFields(): Record<string, FieldDefinition> {
    return {
      firstName: {
        id: 'firstName',
        name: 'First Name',
        type: 'text',
        required: true,
      },
      lastName: {
        id: 'lastName',
        name: 'Last Name',
        type: 'text',
        required: true,
      },
    };
  }

  private getAddressCollectionFields(): Record<string, FieldDefinition> {
    return {
      address: {
        id: 'address',
        name: 'Address',
        type: 'text',
        required: true,
      },
    };
  }

  private getVinQuestionFields(): Record<string, FieldDefinition> {
    return {
      hasVin: {
        id: 'hasVin',
        name: 'Do you have your VIN?',
        type: 'checkbox',
        required: true,
      },
      vin: {
        id: 'vin',
        name: 'VIN',
        type: 'text',
        required: false,
      },
    };
  }

  private getVehicleDetailsFields(): Record<string, FieldDefinition> {
    return {
      vehicleYear: {
        id: 'vehicleYear',
        name: 'Vehicle Year',
        type: 'select',
        required: true,
      },
      vehicleMake: {
        id: 'vehicleMake',
        name: 'Vehicle Make',
        type: 'select',
        required: true,
      },
      vehicleModel: {
        id: 'vehicleModel',
        name: 'Vehicle Model',
        type: 'select',
        required: true,
      },
    };
  }

  private getVehicleCharacteristicsFields(): Record<string, FieldDefinition> {
    return {
      bodyStyle: {
        id: 'bodyStyle',
        name: 'Body Style',
        type: 'select',
        required: true,
      },
      ownership: {
        id: 'ownership',
        name: 'Vehicle Ownership',
        type: 'select',
        required: true,
      },
      primaryUse: {
        id: 'primaryUse',
        name: 'Primary Use',
        type: 'select',
        required: true,
      },
      odometer: {
        id: 'odometer',
        name: 'Odometer Reading',
        type: 'number',
        required: true,
      },
    };
  }

  private getDriverDemographicsFields(): Record<string, FieldDefinition> {
    return {
      gender: {
        id: 'gender',
        name: 'Gender',
        type: 'select',
        required: true,
      },
      maritalStatus: {
        id: 'maritalStatus',
        name: 'Marital Status',
        type: 'select',
        required: true,
      },
    };
  }

  private getCurrentInsuranceFields(): Record<string, FieldDefinition> {
    return {
      hasCurrentInsurance: {
        id: 'hasCurrentInsurance',
        name: 'Do you currently have auto insurance?',
        type: 'checkbox',
        required: true,
      },
      bodilyInjuryLimits: {
        id: 'bodilyInjuryLimits',
        name: 'Bodily Injury Limits',
        type: 'select',
        required: false,
      },
    };
  }

  private getDrivingRecordFields(): Record<string, FieldDefinition> {
    return {
      hasIncidents: {
        id: 'hasIncidents',
        name: 'Any accidents, tickets, or violations?',
        type: 'checkbox',
        required: true,
      },
    };
  }

  private getOrganizationalDiscountFields(): Record<string, FieldDefinition> {
    return {
      organization: {
        id: 'organization',
        name: 'Organization/Group Membership',
        type: 'select',
        required: false,
      },
    };
  }

  private getQuoteFinalizationFields(): Record<string, FieldDefinition> {
    return {
      email: {
        id: 'email',
        name: 'Email Address',
        type: 'email',
        required: true,
      },
      phone: {
        id: 'phone',
        name: 'Phone Number',
        type: 'tel',
        required: true,
      },
    };
  }
}

// Export a default instance
export const geicoAgent = new GeicoAgent();