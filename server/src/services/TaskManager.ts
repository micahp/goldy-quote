import { TaskState, CarrierContext, CarrierResponse, FieldDefinition } from '../types/index.js';
import { createUnifiedSchema, getAllFields, mergeCarrierFields } from '../schemas/unifiedSchema.js';
import { config } from '../config.js';

export class TaskManager {
  private tasks: Map<string, TaskState> = new Map();
  private userDataCache: Map<string, Record<string, any>> = new Map();

  // Generate a unique task ID
  generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Start a new task for multiple carriers
  async startMultiCarrierTask(carriers: string[]): Promise<{
    taskId: string;
    status: string;
    requiredFields: Record<string, FieldDefinition>;
  }> {
    const taskId = this.generateTaskId();
    
    // Create a unified schema with all possible fields
    const unifiedSchema = createUnifiedSchema();
    const allFields = getAllFields(unifiedSchema);
    
    // Create task state
    const task: TaskState = {
      taskId,
      carrier: 'multi', // Special carrier for multi-carrier tasks
      status: 'waiting_for_input',
      currentStep: 1,
      requiredFields: allFields,
      userData: {},
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.tasks.set(taskId, task);
    
    // Initialize user data cache
    this.userDataCache.set(taskId, {});

    console.log(`Started multi-carrier task ${taskId} for carriers: ${carriers.join(', ')}`);

    return {
      taskId,
      status: task.status,
      requiredFields: allFields,
    };
  }

  // Update user data for a task (this accumulates data across steps)
  updateUserData(taskId: string, newData: Record<string, any>): void {
    const existingData = this.userDataCache.get(taskId) || {};
    const updatedData = { ...existingData, ...newData };
    
    this.userDataCache.set(taskId, updatedData);
    
    // Also update the task state
    const task = this.tasks.get(taskId);
    if (task) {
      task.userData = updatedData;
      task.lastActivity = new Date();
      this.tasks.set(taskId, task);
    }

    console.log(`Updated user data for task ${taskId}:`, Object.keys(newData));
  }

  // Get cached user data for a task
  getUserData(taskId: string): Record<string, any> {
    return this.userDataCache.get(taskId) || {};
  }

  // Create carrier context from cached user data
  createCarrierContext(taskId: string): CarrierContext {
    const userData = this.getUserData(taskId);
    
    return {
      taskId,
      userData,
      stepTimeout: config.stepTimeout,
      screenshotsDir: config.screenshotsDir,
      headful: config.headful,
    };
  }

  // Get task state
  getTask(taskId: string): TaskState | null {
    return this.tasks.get(taskId) || null;
  }

  // Update task state
  updateTask(taskId: string, updates: Partial<TaskState>): TaskState | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const updatedTask = {
      ...task,
      ...updates,
      lastActivity: new Date(),
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  // Check if all required data is collected for a carrier
  hasRequiredDataForCarrier(taskId: string, carrierRequiredFields: Record<string, FieldDefinition>): boolean {
    const userData = this.getUserData(taskId);
    
    for (const [fieldId, field] of Object.entries(carrierRequiredFields)) {
      if (field.required && !userData[fieldId]) {
        return false;
      }
    }
    
    return true;
  }

  // Get missing fields for a carrier
  getMissingFieldsForCarrier(taskId: string, carrierRequiredFields: Record<string, FieldDefinition>): Record<string, FieldDefinition> {
    const userData = this.getUserData(taskId);
    const missingFields: Record<string, FieldDefinition> = {};
    
    for (const [fieldId, field] of Object.entries(carrierRequiredFields)) {
      if (field.required && !userData[fieldId]) {
        missingFields[fieldId] = field;
      }
    }
    
    return missingFields;
  }

  // Clean up task and its cached data
  cleanupTask(taskId: string): { success: boolean; message?: string } {
    try {
      this.tasks.delete(taskId);
      this.userDataCache.delete(taskId);
      
      console.log(`Cleaned up task ${taskId} and its cached data`);
      
      return { success: true, message: 'Task cleaned up successfully' };
    } catch (error) {
      console.error(`Error cleaning up task ${taskId}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown cleanup error' 
      };
    }
  }

  // Get all active tasks (for debugging/monitoring)
  getActiveTasks(): Array<{ taskId: string; carrier: string; status: string; createdAt: Date; lastActivity: Date }> {
    return Array.from(this.tasks.values()).map(task => ({
      taskId: task.taskId,
      carrier: task.carrier,
      status: task.status,
      createdAt: task.createdAt,
      lastActivity: task.lastActivity,
    }));
  }

  // Clean up old tasks (older than 1 hour)
  cleanupOldTasks(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.lastActivity < oneHourAgo) {
        this.cleanupTask(taskId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old tasks`);
    }
    
    return cleanedCount;
  }

  // Validate collected data against field definitions
  validateUserData(taskId: string, fields: Record<string, FieldDefinition>): { valid: boolean; errors: Record<string, string> } {
    const userData = this.getUserData(taskId);
    const errors: Record<string, string> = {};
    
    for (const [fieldId, field] of Object.entries(fields)) {
      const value = userData[fieldId];
      
      // Check required fields
      if (field.required && (!value || value === '')) {
        errors[fieldId] = `${field.name} is required`;
        continue;
      }
      
      // Skip validation if field is empty and not required
      if (!value) continue;
      
      // Validate based on field type and validation rules
      if (field.validation) {
        const validation = field.validation;
        
        // Pattern validation
        if (validation.pattern && typeof value === 'string') {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors[fieldId] = `${field.name} format is invalid`;
          }
        }
        
        // Length validation
        if (typeof value === 'string') {
          if (validation.minLength && value.length < validation.minLength) {
            errors[fieldId] = `${field.name} must be at least ${validation.minLength} characters`;
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            errors[fieldId] = `${field.name} must be no more than ${validation.maxLength} characters`;
          }
        }
        
        // Numeric validation
        if (typeof value === 'number') {
          if (validation.min !== undefined && value < validation.min) {
            errors[fieldId] = `${field.name} must be at least ${validation.min}`;
          }
          if (validation.max !== undefined && value > validation.max) {
            errors[fieldId] = `${field.name} must be no more than ${validation.max}`;
          }
        }
      }
      
      // Validate select options
      if (field.type === 'select' && field.options && !field.options.includes(value)) {
        errors[fieldId] = `${field.name} must be one of: ${field.options.join(', ')}`;
      }
      
      // Validate email format
      if (field.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[fieldId] = `${field.name} must be a valid email address`;
        }
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const taskManager = new TaskManager();

// Set up periodic cleanup of old tasks
setInterval(() => {
  taskManager.cleanupOldTasks();
}, 15 * 60 * 1000); // Run every 15 minutes 