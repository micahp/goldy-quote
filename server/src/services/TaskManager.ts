import { TaskState, CarrierContext, CarrierResponse, FieldDefinition } from '../types/index.js';
import { createUnifiedSchema, getAllFields, mergeCarrierFields } from '../schemas/unifiedSchema.js';
import { config } from '../config.js';
import { getCarrierAgent } from '../agents/index.js';

export class TaskManager {
  private static instance: TaskManager;
  private broadcastFunction: ((message: any) => void) | null = null;
  
  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }
  
  // Set the broadcast function from the main server
  public setBroadcastFunction(broadcastFn: (message: any) => void): void {
    this.broadcastFunction = broadcastFn;
  }

  private tasks: Map<string, TaskState> = new Map();
  private userDataCache: Map<string, Record<string, any>> = new Map();

  // Broadcast function that uses the injected WebSocket broadcaster
  private broadcast(message: any): void {
    if (this.broadcastFunction) {
      this.broadcastFunction(message);
    } else {
      console.log('WebSocket not available, logging message:', message);
    }
  }

  // Generate a unique task ID
  generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Start a new task for multiple carriers
  async startMultiCarrierTask(carriers: string[], initialData: Record<string, any>): Promise<{
    taskId: string;
    status: string;
  }> {
    const taskId = this.generateTaskId();
    
    const task: TaskState = {
      taskId,
      carrier: 'multi',
      status: 'starting',
      currentStep: 0,
      requiredFields: {},
      userData: initialData,
      createdAt: new Date(),
      lastActivity: new Date(),
      selectedCarriers: carriers,
    };

    this.tasks.set(taskId, task);
    this.userDataCache.set(taskId, initialData);

    console.log(`Started multi-carrier task ${taskId} for carriers: ${carriers.join(', ')}`);
    
    // Asynchronously start each carrier agent
    carriers.forEach(carrierId => {
      this.startCarrierAgent(taskId, carrierId);
    });

    return {
      taskId,
      status: task.status,
    };
  }

  async startCarrierAgent(taskId: string, carrierId: string) {
    const agent = getCarrierAgent(carrierId);
    if (!agent) {
      console.error(`No agent found for carrier: ${carrierId}`);
      return;
    }

    try {
      console.log(`🎯 Starting ${carrierId} agent for task ${taskId}`);
      this.broadcast({ type: 'carrier_started', taskId, carrier: carrierId });
      
      const context = this.createCarrierContext(taskId, carrierId);
      const userData = this.getUserData(taskId);
      
      // Start the carrier with initial context
      await agent.start(context);
      
      // If we have zipcode and insurance type, immediately advance to page 2
      if (userData.zipCode && userData.insuranceType) {
        console.log(`📍 Advancing ${carrierId} to page 2 with zipCode: ${userData.zipCode}, insuranceType: ${userData.insuranceType}`);
        
        try {
          // Send initial step with zipcode and insurance type
          await agent.step(context, {
            zipCode: userData.zipCode,
            insuranceType: userData.insuranceType
          });
          
          this.broadcast({ 
            type: 'carrier_advanced', 
            taskId, 
            carrier: carrierId, 
            message: `Advanced to page 2 with zipCode and insurance type` 
          });
          
        } catch (stepError) {
          console.error(`⚠️ Could not advance ${carrierId} to page 2:`, stepError);
          // Don't fail the entire process, just log the error
          this.broadcast({ 
            type: 'carrier_warning', 
            taskId, 
            carrier: carrierId, 
            message: `Could not auto-advance: ${stepError instanceof Error ? stepError.message : 'Unknown error'}` 
          });
        }
      } else {
        console.log(`⏳ ${carrierId} started but waiting for zipCode and insuranceType to advance`);
      }
      
    } catch (error) {
      console.error(`❌ Error starting agent for ${carrierId}:`, error);
      this.broadcast({ 
        type: 'carrier_error', 
        taskId, 
        carrier: carrierId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async processCarrierStep(taskId: string, step: number, stepData: Record<string, any>): Promise<void> {
    const task = this.getTask(taskId);
    if (!task || !task.selectedCarriers) {
      console.error(`Task not found or no carriers selected for task ${taskId}`);
      return;
    }

    this.updateUserData(taskId, stepData);

    task.currentStep = step;
    this.updateTask(taskId, { currentStep: step });

    for (const carrierId of task.selectedCarriers) {
      const agent = getCarrierAgent(carrierId);
      if (agent) {
        // Create carrier-specific context to avoid browser context sharing
        const context = this.createCarrierContext(taskId, carrierId);
        
        // Run in parallel without waiting for completion
        agent.step(context, stepData).catch((error: any) => {
          console.error(`Error processing step for ${carrierId}:`, error);
          this.broadcast({ type: 'carrier_error', taskId, carrier: carrierId, error: error instanceof Error ? error.message : 'Unknown error' });
        });
      }
    }
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
  createCarrierContext(taskId: string, carrierId?: string): CarrierContext {
    const userData = this.getUserData(taskId);
    
    // Create carrier-specific context ID to avoid browser context sharing
    const contextId = carrierId ? `${taskId}_${carrierId}` : taskId;
    
    return {
      taskId: contextId,
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
    
    const valid = Object.keys(errors).length === 0;
    return { valid, errors };
  }
}

export const taskManager = new TaskManager();

// Set up periodic cleanup of old tasks
setInterval(() => {
  taskManager.cleanupOldTasks();
}, 15 * 60 * 1000); // Run every 15 minutes 