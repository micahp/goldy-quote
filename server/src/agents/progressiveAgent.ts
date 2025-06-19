import { BaseCarrierAgent } from './BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, QuoteResult } from '../types/index.js';

export class ProgressiveAgent extends BaseCarrierAgent {
  readonly name = 'progressive';

  async start(context: CarrierContext): Promise<CarrierResponse> {
    try {
      console.log(`[${this.name}] Starting quote process for task: ${context.taskId}`);
      
      // Create task
      const task = this.createTask(context.taskId, this.name);
      
      // Get browser page
      const page = await this.getBrowserPage(context.taskId);
      
      // Navigate to Progressive
      await page.goto('https://www.progressive.com/auto/', {
        waitUntil: 'networkidle',
        timeout: context.stepTimeout,
      });
      
      await this.waitForPageLoad(page);
      await this.takeScreenshot(page, 'progressive-homepage');
      
      // Analyze the current page
      const pageAnalysis = await this.analyzeCurrentPage(page);
      console.log(`[${this.name}] Page analysis:`, pageAnalysis);
      
      // Update task status
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 1,
        requiredFields: this.getInitialFields(),
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
      
      // Process the current step based on form type
      const pageAnalysis = await this.analyzeCurrentPage(page);
      
      switch (pageAnalysis.formType) {
        case 'zipCode':
          return await this.handleZipCodeStep(page, context, stepData);
        case 'personalInfo':
          return await this.handlePersonalInfoStep(page, context, stepData);
        case 'address':
          return await this.handleAddressStep(page, context, stepData);
        case 'vehicle':
          return await this.handleVehicleStep(page, context, stepData);
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

  private async handleZipCodeStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    const helpers = this.createLocatorHelpers(page);
    
    try {
      // Fill ZIP code
      if (stepData.zipCode) {
        const zipField = helpers.getZipCodeField();
        await helpers.fillField(zipField, stepData.zipCode);
      }
      
      // Click continue or start quote button
      await this.retryWithScreenshot(page, async () => {
        const startButton = helpers.getStartQuoteButton();
        await helpers.clickButton(startButton);
      }, 'click-start-quote');
      
      await this.waitForPageLoad(page);
      await this.takeScreenshot(page, 'after-zipcode');
      
      // Analyze next page
      const nextPageAnalysis = await this.analyzeCurrentPage(page);
      const nextFields = this.getFieldsForFormType(nextPageAnalysis.formType);
      
      this.updateTask(context.taskId, {
        status: 'waiting_for_input',
        currentStep: 2,
        requiredFields: nextFields,
      });
      
      return this.createWaitingResponse(nextFields);
      
    } catch (error) {
      await this.takeScreenshot(page, 'error-zipcode');
      throw error;
    }
  }

  private async handlePersonalInfoStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      // Map our field IDs to Progressive field names (may differ from Geico)
      const fieldMappings = {
        firstName: 'firstName',
        lastName: 'lastName',
        dateOfBirth: 'birthDate', // Progressive might use different field names
        email: 'emailAddress',
        phone: 'phoneNumber',
      };
      
      await this.fillFormFields(page, stepData, fieldMappings);
      await this.clickContinueButton(page);
      await this.waitForPageLoad(page);
      await this.takeScreenshot(page, 'after-personal-info');
      
      return await this.proceedToNextStep(page, context);
      
    } catch (error) {
      await this.takeScreenshot(page, 'error-personal-info');
      throw error;
    }
  }

  private async handleAddressStep(page: any, context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    try {
      const fieldMappings = {
        streetAddress: 'streetAddress',
        apt: 'aptNumber',
        city: 'city',
        state: 'state',
        zipCode: 'zipCode',
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
        vehicleYear: 'vehicleYear',
        vehicleMake: 'vehicleMake',
        vehicleModel: 'vehicleModel',
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
          coverageDetails: quoteInfo.details,
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
        coverageDetails: quoteInfo.details,
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
export const progressiveAgent = new ProgressiveAgent(); 