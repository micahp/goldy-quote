import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';
import { TestEmailService } from '../helpers/testEmailService.js';

export class StateFarmAgent extends BaseCarrierAgent {
  readonly name = 'statefarm';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Starting quote process for task: ${context.taskId}`);
      
      // Create task
      const task = this.createTask(context.taskId, this.name);
      
      // Navigate to State Farm using hybrid method
      await this.hybridNavigate(context.taskId, 'https://www.statefarm.com/insurance/auto');
      
      // Wait for page to load
      await this.mcpWaitFor(context.taskId, { time: 3 });
      
      // Take screenshot for debugging
      await this.mcpTakeScreenshot(context.taskId, 'statefarm-homepage');
      
      // Update task status to request ZIP code only
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        requiredFields: this.getInitialFields(),
        userData: context.userData,
      });
      
      return this.createWaitingResponse(this.getInitialFields());
      
    } catch (error) {
      console.error(`[${this.name}] Error starting quote process:`, error);
      this.updateTask(context.taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
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
      
      // Check if we've reached the quote results page FIRST
      const quoteInfo = await this.extractRealQuoteInfo(page);
      if (quoteInfo) {
        this.updateTask(context.taskId, {
          status: 'completed',
          quote: quoteInfo,
        });
        
        return this.createCompletedResponse(quoteInfo);
      }
      
      // Identify current step based on URL and page content
      const currentStep = await this.identifyCurrentStep(page);
      console.log(`[${this.name}] Current step: ${currentStep}, URL: ${page.url()}`);
      
      switch (currentStep) {
        case 'zip_code':
          return await this.handleZipCodeStep(page, context, stepData);
        case 'personal_info':
          return await this.handlePersonalInfoStep(page, context, stepData);
        case 'address_info':
          return await this.handleAddressStep(page, context, stepData);
        case 'vehicle_info':
          return await this.handleVehicleStep(page, context, stepData);
        case 'driver_details':
          return await this.handleDriverDetailsStep(page, context, stepData);
        case 'coverage_selection':
          return await this.handleCoverageStep(page, context, stepData);
        default:
          return await this.handleGenericStep(page, context, stepData);
      }
      
    } catch (error) {
      console.error(`[${this.name}] Error processing step:`, error);
      this.updateTask(context.taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async identifyCurrentStep(page: any): Promise<string> {
    const url = page.url();
    const content = await page.textContent('body') || '';
    const title = await page.title();
    
    // Check URL patterns first
    if (url.includes('/quote') && url.includes('/personal')) {
      return 'personal_info';
    }
    if (url.includes('/quote') && url.includes('/address')) {
      return 'address_info';
    }
    if (url.includes('/quote') && url.includes('/vehicle')) {
      return 'vehicle_info';
    }
    if (url.includes('/quote') && url.includes('/driver')) {
      return 'driver_details';
    }
    if (url.includes('/quote') && url.includes('/coverage')) {
      return 'coverage_selection';
    }
    if (url.includes('/quote') && (url.includes('/results') || url.includes('/rates'))) {
      return 'quote_results';
    }
    
    // Fallback to content-based detection
    if (content.includes('ZIP') || content.includes('postal code')) {
      return 'zip_code';
    }
    if (content.includes('first name') || content.includes('last name')) {
      return 'personal_info';
    }
    if (content.includes('street address') || content.includes('home address')) {
      return 'address_info';
    }
    if (content.includes('vehicle year') || content.includes('make and model')) {
      return 'vehicle_info';
    }
    if (content.includes('gender') || content.includes('marital status')) {
      return 'driver_details';
    }
    if (content.includes('coverage') || content.includes('liability') || content.includes('deductible')) {
      return 'coverage_selection';
    }
    
    return 'unknown';
  }

  private async extractRealQuoteInfo(page: any): Promise<any | null> {
    try {
      const url = page.url();
      const content = await page.textContent('body') || '';
      
      // Only extract quotes from actual quote results pages
      if (!url.includes('/quote') || (!url.includes('/results') && !url.includes('/rates') && !content.includes('monthly premium'))) {
        return null;
      }
      
      // Look for actual dollar amounts, not marketing text
      const priceSelectors = [
        '[data-testid*="premium"]',
        '[data-testid*="price"]',
        '.premium-amount',
        '.quote-price',
        'text=/\\$\\d{2,}/'
      ];
      
      for (const selector of priceSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            const priceText = await element.textContent();
            if (priceText && priceText.includes('$') && /\$\d{2,}/.test(priceText)) {
              return {
                price: priceText.trim(),
                term: 'month',
                carrier: this.name,
                coverageDetails: {
                  timestamp: new Date().toISOString(),
                  url: page.url(),
                  pageTitle: await page.title(),
                }
              };
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      return null;
    } catch (error) {
      console.error(`[${this.name}] Error extracting quote info:`, error);
      return null;
    }
  }

  private async handleZipCodeStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      // Use MCP/hybrid methods to interact with State Farm
      if (stepData.zipCode) {
        await this.hybridType(context.taskId, 'ZIP code field', 'input[name*="zip"], input[placeholder*="ZIP"], input[id*="zip"]', stepData.zipCode);
      }
      
      // Click the start quote or continue button
      await this.hybridClick(context.taskId, 'Start quote button', 'button:has-text("Start"), button:has-text("Get"), button:has-text("Continue")');
      
      // Wait for navigation
      await this.mcpWaitFor(context.taskId, { time: 3 });
      
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 2,
        requiredFields: this.getPersonalInfoFields(),
      });
      
      return this.createWaitingResponse(this.getPersonalInfoFields());
      
    } catch (error) {
      await this.mcpTakeScreenshot(context.taskId, 'error-zipcode');
      throw error;
    }
  }

  private async handlePersonalInfoStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      // Use hybrid methods to fill personal information
      if (stepData.firstName) {
        await this.hybridType(context.taskId, 'First name field', 'input[name*="first"], input[id*="first"]', stepData.firstName);
      }
      if (stepData.lastName) {
        await this.hybridType(context.taskId, 'Last name field', 'input[name*="last"], input[id*="last"]', stepData.lastName);
      }
      if (stepData.dateOfBirth) {
        await this.hybridType(context.taskId, 'Date of birth field', 'input[name*="birth"], input[id*="birth"]', stepData.dateOfBirth);
      }
      
      // Handle email with test email service for better validation success
      if (stepData.email) {
        let emailToUse = stepData.email;
        
        // If email validation fails, generate a test email
        if (!TestEmailService.isValidTestDomain(stepData.email)) {
          emailToUse = TestEmailService.generateStateFarmTestEmail();
          console.log(`[${this.name}] Using generated test email: ${emailToUse}`);
        }
        
        await this.hybridType(context.taskId, 'Email field', 'input[type="email"], input[name*="email"]', emailToUse);
      }
      
      if (stepData.phone) {
        await this.hybridType(context.taskId, 'Phone field', 'input[type="tel"], input[name*="phone"]', stepData.phone);
      }
      
      await this.hybridClick(context.taskId, 'Continue button', 'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]');
      await this.mcpWaitFor(context.taskId, { time: 3 });
      
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 3,
        requiredFields: this.getAddressFields(),
      });
      
      return this.createWaitingResponse(this.getAddressFields());
      
    } catch (error) {
      await this.mcpTakeScreenshot(context.taskId, 'error-personal-info');
      throw error;
    }
  }

  private async handleDriverDetailsStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      // Handle driver details like gender, marital status, etc.
      if (stepData.gender) {
        await this.hybridSelectOption(context.taskId, 'Gender field', 'select[name*="gender"], select[id*="gender"]', [stepData.gender]);
      }
      if (stepData.maritalStatus) {
        await this.hybridSelectOption(context.taskId, 'Marital status field', 'select[name*="marital"], select[id*="marital"]', [stepData.maritalStatus]);
      }
      
      await this.hybridClick(context.taskId, 'Continue button', 'button:has-text("Continue"), button:has-text("Next")');
      await this.mcpWaitFor(context.taskId, { time: 3 });
      
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 5,
        requiredFields: this.getCoverageFields(),
      });
      
      return this.createWaitingResponse(this.getCoverageFields());
      
    } catch (error) {
      await this.mcpTakeScreenshot(context.taskId, 'error-driver-details');
      throw error;
    }
  }

  private async handleCoverageStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      // Handle coverage selections
      if (stepData.liabilityLimit) {
        await this.hybridSelectOption(context.taskId, 'Liability coverage field', 'select[name*="liability"], select[id*="liability"]', [stepData.liabilityLimit]);
      }
      if (stepData.collisionDeductible) {
        await this.hybridSelectOption(context.taskId, 'Collision deductible field', 'select[name*="collision"], select[id*="collision"]', [stepData.collisionDeductible]);
      }
      
      await this.hybridClick(context.taskId, 'Get quote button', 'button:has-text("Get Quote"), button:has-text("View Rates"), button:has-text("Continue")');
      await this.mcpWaitFor(context.taskId, { time: 5 });
      
      // This should hopefully lead to quote results
      this.updateTask(context.taskId, {
        status: 'processing',
        currentStep: 6,
      });
      
      // Return a processing status, the next step call will check for quote results
      return this.createSuccessResponse({
        message: 'Coverage selected, fetching quote...',
        processing: true,
      });
      
    } catch (error) {
      await this.mcpTakeScreenshot(context.taskId, 'error-coverage');
      throw error;
    }
  }

  private async handleAddressStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      const fieldMappings = {
        streetAddress: 'street_address',
        apt: 'apartment',
        city: 'city',
        state: 'state',
        zipCode: 'postal_code',
      };
      
      await this.fillFormFields(page, stepData, fieldMappings);
      await this.clickContinueButton(page);
      await this.waitForPageLoad(page);
      await this.takeScreenshot(page, 'after-address');
      
      return await this.proceedToNextStep(page, context);
      
    } catch (error) {
      await this.takeScreenshot(page, 'error-address');
      throw error;
    }
  }

  private async handleVehicleStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      const fieldMappings = {
        vehicleYear: 'year',
        vehicleMake: 'make',
        vehicleModel: 'model',
      };
      
      await this.fillFormFields(page, stepData, fieldMappings);
      await this.clickContinueButton(page);
      await this.waitForPageLoad(page);
      await this.takeScreenshot(page, 'after-vehicle');
      
      return await this.proceedToNextStep(page, context);
      
    } catch (error) {
      await this.takeScreenshot(page, 'error-vehicle');
      throw error;
    }
  }

  private async handleGenericStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      // Try to click continue button and see what happens
      await this.clickContinueButton(page);
      await this.waitForPageLoad(page);
      await this.takeScreenshot(page, 'after-generic');
      
      // Check if we reached a quote page
      const quoteInfo = await this.extractQuoteInfo(page);
      if (quoteInfo) {
        const quote: QuoteResult = {
          price: quoteInfo.price,
          term: quoteInfo.term,
          carrier: this.name,
          coverageDetails: quoteInfo.coverageDetails,
        };
        
        this.updateTask(context.taskId, {
          status: 'completed',
          quote,
        });
        
        return this.createCompletedResponse(quote);
      }
      
      return await this.proceedToNextStep(page, context);
      
    } catch (error) {
      await this.takeScreenshot(page, 'error-generic');
      throw error;
    }
  }

  private async proceedToNextStep(page: any, context: CarrierContext): Promise<CarrierResponse> {
    const task = this.getTask(context.taskId);
    if (!task) {
      return this.createErrorResponse('Task not found');
    }
    
    // Check if we've reached a quote page
    const quoteInfo = await this.extractQuoteInfo(page);
    if (quoteInfo) {
      const quote: QuoteResult = {
        price: quoteInfo.price,
        term: quoteInfo.term,
        carrier: this.name,
        coverageDetails: quoteInfo.coverageDetails,
      };
      
      this.updateTask(context.taskId, {
        status: 'completed',
        quote,
      });
      
      return this.createCompletedResponse(quote);
    }
    
    // Analyze next page and get required fields
    const pageAnalysis = await this.analyzeCurrentPage(page);
    const nextFields = this.getFieldsForFormType(pageAnalysis.formType);
    
    this.updateTask(context.taskId, {
      status: 'waiting_for_input',
      currentStep: task.currentStep + 1,
      requiredFields: nextFields,
    });
    
    return this.createWaitingResponse(nextFields);
  }

  private getInitialFields(): Record<string, FieldDefinition> {
    return {
      zipCode: {
        id: 'zipCode',
        name: 'ZIP Code',
        type: 'text',
        required: true,
        placeholder: '12345',
        validation: {
          pattern: '^[0-9]{5}$',
          minLength: 5,
          maxLength: 5,
        },
      },
    };
  }

  private getPersonalInfoFields(): Record<string, FieldDefinition> {
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
      dateOfBirth: {
        id: 'dateOfBirth',
        name: 'Date of Birth',
        type: 'date',
        required: true,
      },
      email: {
        id: 'email',
        name: 'Email',
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

  private getAddressFields(): Record<string, FieldDefinition> {
    return {
      streetAddress: {
        id: 'streetAddress',
        name: 'Street Address',
        type: 'text',
        required: true,
      },
      city: {
        id: 'city',
        name: 'City',
        type: 'text',
        required: true,
      },
      state: {
        id: 'state',
        name: 'State',
        type: 'select',
        required: true,
        options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
      },
    };
  }

  private getCoverageFields(): Record<string, FieldDefinition> {
    return {
      liabilityLimit: {
        id: 'liabilityLimit',
        name: 'Liability Coverage',
        type: 'select',
        required: true,
        options: ['State Minimum', '25/50/25', '50/100/50', '100/300/100', '250/500/250'],
      },
      collisionDeductible: {
        id: 'collisionDeductible',
        name: 'Collision Deductible',
        type: 'select',
        required: true,
        options: ['$250', '$500', '$1,000', '$2,500'],
      },
      comprehensiveDeductible: {
        id: 'comprehensiveDeductible',
        name: 'Comprehensive Deductible',
        type: 'select',
        required: true,
        options: ['$250', '$500', '$1,000', '$2,500'],
      },
    };
  }

  private getFieldsForFormType(formType: string): Record<string, FieldDefinition> {
    switch (formType) {
      case 'personalInfo':
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
          dateOfBirth: {
            id: 'dateOfBirth',
            name: 'Date of Birth',
            type: 'date',
            required: true,
          },
          email: {
            id: 'email',
            name: 'Email',
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
      
      case 'address':
        return {
          streetAddress: {
            id: 'streetAddress',
            name: 'Street Address',
            type: 'text',
            required: true,
          },
          apt: {
            id: 'apt',
            name: 'Apartment #',
            type: 'text',
            required: false,
          },
          city: {
            id: 'city',
            name: 'City',
            type: 'text',
            required: true,
          },
          state: {
            id: 'state',
            name: 'State',
            type: 'select',
            required: true,
            options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
          },
        };
      
      case 'vehicle':
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
            options: ['Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Pontiac', 'Porsche', 'Ram', 'Subaru', 'Toyota', 'Volkswagen', 'Volvo'],
          },
          vehicleModel: {
            id: 'vehicleModel',
            name: 'Vehicle Model',
            type: 'text',
            required: true,
          },
        };
      
      default:
        return {};
    }
  }

  private generateYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    
    for (let year = currentYear + 1; year >= 1990; year--) {
      years.push(year.toString());
    }
    
    return years;
  }
}

// Export singleton instance
export const stateFarmAgent = new StateFarmAgent(); 