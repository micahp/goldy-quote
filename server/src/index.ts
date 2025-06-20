import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { TaskManager } from './services/TaskManager.js';
import { getAvailableCarriers, isCarrierSupported, getCarrierAgent } from './agents/index.js';
import { initWebSocketServer, broadcast, wss } from './websocket.js';
import { browserManager } from './browser/BrowserManager.js';
import { mcpBrowserService } from './services/MCPBrowserService.js';

const app = express();
const server = createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Parse JSON request bodies
app.use(express.json());

// Enable CORS
app.use(cors());

// API Routes

// Get available carriers
app.get('/api/carriers', (req, res) => {
  try {
    const carriers = getAvailableCarriers();
    res.json({ carriers });
  } catch (error) {
    console.error('Error getting carriers:', error);
    res.status(500).json({ error: 'Failed to get available carriers' });
  }
});

// Start a multi-carrier quote process (unified data collection)
app.post('/api/quotes/start', async (req, res) => {
  try {
    const { carriers, zipCode, insuranceType = 'auto' } = req.body;
    
    if (!carriers || !Array.isArray(carriers) || carriers.length === 0) {
      return res.status(400).json({ error: 'At least one carrier must be selected.' });
    }
    
    if (!zipCode) {
      return res.status(400).json({ error: 'ZIP code is required.' });
    }
    
    const unsupportedCarriers = carriers.filter(carrier => !isCarrierSupported(carrier));
    if (unsupportedCarriers.length > 0) {
      return res.status(400).json({ 
        error: `Unsupported carriers: ${unsupportedCarriers.join(', ')}` 
      });
    }
    
    console.log(`🚀 Starting multi-carrier task with initial data:`, { 
      carriers, 
      zipCode, 
      insuranceType 
    });
    
    const taskManager = TaskManager.getInstance();
    const result = await taskManager.startMultiCarrierTask(carriers, { 
      zipCode, 
      insuranceType 
    });
    
    broadcast({
      type: 'task_started',
      taskId: result.taskId,
      carriers,
      zipCode,
      insuranceType,
      status: result.status
    });
    
    console.log(`✅ Multi-carrier task started with taskId: ${result.taskId}`);
    
    res.json(result);
  } catch (error) {
    console.error('Error starting multi-carrier quote process:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Submit user data for the unified collection process
app.post('/api/quotes/:taskId/data', async (req, res) => {
  try {
    const { taskId } = req.params;
    const userData = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const taskManager = TaskManager.getInstance();
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(`📥 Received step data for task ${taskId}:`, Object.keys(userData));
    
    // Update user data in cache
    taskManager.updateUserData(taskId, userData);
    
    // Validate the data
    const validation = taskManager.validateUserData(taskId, task.requiredFields);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed',
        validationErrors: validation.errors
      });
    }
    
    // Immediately send step data to all carriers for processing
    if (task.selectedCarriers && task.selectedCarriers.length > 0) {
      console.log(`🚀 Processing step data with carriers: ${task.selectedCarriers.join(', ')}`);
      
      // Process step for each carrier in parallel
      task.selectedCarriers.forEach(carrierId => {
        const agent = getCarrierAgent(carrierId);
        if (agent) {
          // Create carrier-specific context to avoid browser context sharing
          const context = taskManager.createCarrierContext(taskId, carrierId);
          
          // Process step asynchronously (don't wait for completion)
          agent.step(context, userData).then(() => {
            console.log(`✅ ${carrierId} processed step data successfully`);
            broadcast({
              type: 'carrier_step_completed',
              taskId,
              carrier: carrierId,
              status: 'processing'
            });
          }).catch((error: any) => {
            console.error(`❌ ${carrierId} failed to process step data:`, error);
            broadcast({
              type: 'carrier_step_error',
              taskId,
              carrier: carrierId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });
        }
      });
    }
    
    // Broadcast data update
    broadcast({
      type: 'data_updated',
      taskId,
      fields: Object.keys(userData),
      step: task.currentStep
    });
    
    res.json({ 
      success: true, 
      message: 'User data updated and sent to carriers',
      dataComplete: Object.keys(validation.errors).length === 0,
      carriersProcessing: task.selectedCarriers?.length || 0
    });
    
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Start quote process for a specific carrier using cached data
app.post('/api/quotes/:taskId/carriers/:carrier/start', async (req, res) => {
  try {
    const { taskId, carrier } = req.params;
    
    if (!isCarrierSupported(carrier)) {
      return res.status(400).json({ error: `Unsupported carrier: ${carrier}` });
    }
    
    const carrierAgent = getCarrierAgent(carrier);
    if (!carrierAgent) {
      return res.status(500).json({ error: 'Carrier agent not found' });
    }
    
    // Create carrier-specific context from cached user data
    const context = TaskManager.getInstance().createCarrierContext(taskId, carrier);
    
    console.log(`Starting ${carrier} quote process for task ${taskId}`);
    
    const response = await carrierAgent.start(context);
    
    // Broadcast carrier start
    broadcast({
      type: 'carrier_started',
      taskId,
      carrier,
      status: response.status
    });
    
    res.json({
      ...response,
      carrier,
      taskId,
    });
    
  } catch (error) {
    console.error(`Error starting ${req.params.carrier} quote process:`, error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Process step for a specific carrier
app.post('/api/quotes/:taskId/carriers/:carrier/step', async (req, res) => {
  try {
    const { taskId, carrier } = req.params;
    const stepData = req.body;
    
    if (!isCarrierSupported(carrier)) {
      return res.status(400).json({ error: `Unsupported carrier: ${carrier}` });
    }
    
    const carrierAgent = getCarrierAgent(carrier);
    if (!carrierAgent) {
      return res.status(500).json({ error: 'Carrier agent not found' });
    }
    
    // Update cached data with any new step data
    if (stepData && Object.keys(stepData).length > 0) {
      TaskManager.getInstance().updateUserData(taskId, stepData);
    }
    
    // Create carrier-specific context from cached user data
    const context = TaskManager.getInstance().createCarrierContext(taskId, carrier);
    
    console.log(`Processing ${carrier} step for task ${taskId}`);
    
    const response = await carrierAgent.step(context, stepData);
    
    // Broadcast step completion
    broadcast({
      type: 'carrier_step_completed',
      taskId,
      carrier,
      status: response.status
    });
    
    // If quote is completed, broadcast that too
    if (response.status === 'completed' && response.quote) {
      broadcast({
        type: 'quote_completed',
        taskId,
        carrier,
        quote: response.quote
      });
    }
    
    res.json({
      ...response,
      carrier,
      taskId,
    });
    
  } catch (error) {
    console.error(`Error processing ${req.params.carrier} step:`, error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get status for a specific carrier task
app.get('/api/quotes/:taskId/carriers/:carrier/status', async (req, res) => {
  try {
    const { taskId, carrier } = req.params;
    
    if (!isCarrierSupported(carrier)) {
      return res.status(400).json({ error: `Unsupported carrier: ${carrier}` });
    }
    
    const carrierAgent = getCarrierAgent(carrier);
    if (!carrierAgent) {
      return res.status(500).json({ error: 'Carrier agent not found' });
    }
    
    const status = await carrierAgent.status(taskId);
    
    res.json({
      ...status,
      carrier,
      taskId,
    });
    
  } catch (error) {
    console.error(`Error getting ${req.params.carrier} status:`, error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Clean up a specific carrier task
app.delete('/api/quotes/:taskId/carriers/:carrier', async (req, res) => {
  try {
    const { taskId, carrier } = req.params;
    
    if (!isCarrierSupported(carrier)) {
      return res.status(400).json({ error: `Unsupported carrier: ${carrier}` });
    }
    
    const carrierAgent = getCarrierAgent(carrier);
    if (!carrierAgent) {
      return res.status(500).json({ error: 'Carrier agent not found' });
    }
    
    console.log(`Cleaning up ${carrier} task ${taskId}`);
    
    const result = await carrierAgent.cleanup(taskId);
    
    // Broadcast cleanup
    broadcast({
      type: 'carrier_cleaned_up',
      taskId,
      carrier
    });
    
    res.json({
      ...result,
      carrier,
      taskId,
    });
    
  } catch (error) {
    console.error(`Error cleaning up ${req.params.carrier} task:`, error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Clean up entire task (all carriers and cached data)
app.delete('/api/quotes/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    console.log(`Cleaning up entire task ${taskId}`);
    
    // Clean up all carrier agents that might have this task
    const carriers = getAvailableCarriers();
    const cleanupPromises = carriers.map(async (carrierName) => {
      const agent = getCarrierAgent(carrierName);
      if (agent) {
        try {
          await agent.cleanup(taskId);
        } catch (error) {
          console.warn(`Failed to cleanup ${carrierName} for task ${taskId}:`, error);
        }
      }
    });
    
    await Promise.all(cleanupPromises);
    
    // Clean up task manager data
    const result = TaskManager.getInstance().cleanupTask(taskId);
    
    // Broadcast task cleanup
    broadcast({
      type: 'task_cleaned_up',
      taskId
    });
    
    res.json({
      ...result,
      taskId,
    });
    
  } catch (error) {
    console.error('Error cleaning up task:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get browser manager status (for debugging)
app.get('/api/browser/status', (req, res) => {
  try {
    const status = browserManager.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting browser status:', error);
    res.status(500).json({ error: 'Failed to get browser status' });
  }
});

// Process step data for all carriers in a task
app.post('/api/quotes/:taskId/step', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { step, data } = req.body;

    if (!step || !data) {
      return res.status(400).json({ error: 'Step and data are required' });
    }

    const taskManager = TaskManager.getInstance();
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log(`Processing step ${step} for task ${taskId} with data:`, Object.keys(data));
    
    await taskManager.processCarrierStep(taskId, step, data);
    
    // Broadcast step completion
    broadcast({
      type: 'step_processed',
      taskId,
      step,
      dataFields: Object.keys(data)
    });
    
    res.json({ 
      success: true, 
      message: `Step ${step} processed successfully`,
      taskId,
      step
    });
  } catch (error) {
    console.error(`Error processing step for task ${req.params.taskId}:`, error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get task status and data
app.get('/api/quotes/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const taskManager = TaskManager.getInstance();
    const task = taskManager.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({
      taskId: task.taskId,
      status: task.status,
      currentStep: task.currentStep,
      selectedCarriers: task.selectedCarriers,
      createdAt: task.createdAt,
      lastActivity: task.lastActivity,
      dataComplete: Object.keys(task.userData).length > 0
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Get active tasks (for debugging)
app.get('/api/tasks', (req, res) => {
  try {
    const taskManager = TaskManager.getInstance();
    const tasks = taskManager.getActiveTasks();
    res.json({ tasks });
  } catch (error) {
    console.error('Error getting active tasks:', error);
    res.status(500).json({ error: 'Failed to get active tasks' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    headful: config.headful
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? error.message : undefined
  });
});

// Initialize MCP Browser Service with proper fallback
async function initializeMCP() {
  try {
    // Create a new MCP service instance with the browser manager
    const mcpService = new (await import('./services/MCPBrowserService.js')).MCPBrowserService(browserManager);
    
    if (config.mcp.enabled) {
      console.log('Initializing MCP Browser Service...');
      await mcpService.initialize(config.mcp.serverUrl);
      console.log('MCP Browser Service initialized successfully');
    } else {
      console.log('MCP disabled, using direct Playwright fallback');
      await mcpService.initialize(); // Initialize without MCP server
    }
    
    // Replace the singleton with the properly initialized instance
    Object.assign(mcpBrowserService, mcpService);
  } catch (error) {
    console.error('Failed to initialize MCP Browser Service:', error);
    console.log('Continuing with direct Playwright fallback');
  }
}

// Start the server
const PORT = config.port;

async function startServer() {
  // Initialize MCP first only if enabled
  if (config.mcp.enabled) {
    await initializeMCP();
  }
  
  // Initialize TaskManager with WebSocket broadcast function
  const taskManager = TaskManager.getInstance();
  taskManager.setBroadcastFunction(broadcast);
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Headful mode: ${config.headful ? 'enabled' : 'disabled'}`);
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`MCP enabled: ${config.mcp.enabled}`);
    console.log(`Available carriers: ${getAvailableCarriers().join(', ')}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Clean up browser manager
  await browserManager.cleanup();
  
  // Clean up MCP service if enabled
  if (config.mcp.enabled) {
    await mcpBrowserService.cleanup();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  wss.close();
  server.close();
  await browserManager.cleanup();
  
  // Clean up MCP service if enabled
  if (config.mcp.enabled) {
    await mcpBrowserService.cleanup();
  }
  
  process.exit(0);
});

 