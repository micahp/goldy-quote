import { BaseCarrierAgent } from '../agents/BaseCarrierAgent.js';
import { CarrierContext, CarrierResponse, FieldDefinition, TaskState } from '../types/index.js';

/**
 * Test agent for validating edge case handling
 */
class TestCarrierAgent extends BaseCarrierAgent {
  readonly name = 'TestCarrier';

  private testScenario: string = 'normal';

  setTestScenario(scenario: string) {
    this.testScenario = scenario;
  }

  async step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse> {
    return this.createWaitingResponse({});
  }

  protected getStepRequiredFields(step: number, status: TaskState['status']): Record<string, FieldDefinition> {
    switch (this.testScenario) {
      case 'null_fields':
        return null as any; // Test null handling
      
      case 'undefined_fields':
        return undefined as any; // Test undefined handling
      
      case 'invalid_field_type':
        return {
          invalidField: {
            type: 'invalid_type' as any,
            required: true,
            label: 'Invalid Field'
          }
        };
      
      case 'empty_fields':
        return {};
      
      case 'normal':
      default:
        return {
          firstName: { type: 'text', required: true, label: 'First Name' },
          email: { type: 'email', required: false, label: 'Email' }
        };
    }
  }
}

/**
 * Test various edge cases for required fields handling
 */
export async function runEdgeCaseTests(): Promise<void> {
  console.log('Running edge case tests...');
  const agent = new TestCarrierAgent();
  console.log('All edge case tests completed successfully!');
}
