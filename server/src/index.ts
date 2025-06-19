import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { taskManager } from './services/TaskManager.js';
import { getCarrierAgent, getAvailableCarriers, isCarrierSupported } from './agents/index.js';
import { browserManager } from './browser/BrowserManager.js';

const app = express();
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Parse JSON request bodies
app.use(express.json());

// Enable CORS
app.use(cors());

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('WebSocket message received:', data);
      
      // Handle different message types if needed
      if (data.type === 'subscribe' && data.taskId) {
        // Subscribe to task updates
        ws.send(JSON.stringify({
          type: 'subscribed',
          taskId: data.taskId,
          message: 'Subscribed to task updates'
        }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Helper function to broadcast to WebSocket clients
function broadcast(message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

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
    const { carriers } = req.body;
    
    if (!carriers || !Array.isArray(carriers) || carriers.length === 0) {
      return res.status(400).json({ error: 'Carriers array is required' });
    }
    
    // Validate all carriers are supported
    const unsupportedCarriers = carriers.filter(carrier => !isCarrierSupported(carrier));
    if (unsupportedCarriers.length > 0) {
      return res.status(400).json({ 
        error: `Unsupported carriers: ${unsupportedCarriers.join(', ')}` 
      });
    }
    
    console.log('Starting multi-carrier quote process for:', carriers);
    
    const result = await taskManager.startMultiCarrierTask(carriers);
    
    // Broadcast to WebSocket clients
    broadcast({
      type: 'task_started',
      taskId: result.taskId,
      carriers,
      status: result.status
    });
    
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
    
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(`Updating user data for task ${taskId}:`, Object.keys(userData));
    
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
    
    // Broadcast data update
    broadcast({
      type: 'data_updated',
      taskId,
      fields: Object.keys(userData)
    });
    
    res.json({ 
      success: true, 
      message: 'User data updated successfully',
      dataComplete: Object.keys(validation.errors).length === 0
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
    
    // Create carrier context from cached user data
    const context = taskManager.createCarrierContext(taskId);
    
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
      taskManager.updateUserData(taskId, stepData);
    }
    
    // Create carrier context from cached user data
    const context = taskManager.createCarrierContext(taskId);
    
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
    const result = taskManager.cleanupTask(taskId);
    
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

// Get active tasks (for debugging)
app.get('/api/tasks', (req, res) => {
  try {
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

// Start the server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Headful mode: ${config.headful ? 'enabled' : 'disabled'}`);
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Available carriers: ${getAvailableCarriers().join(', ')}`);
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
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  wss.close();
  server.close();
  await browserManager.cleanup();
  
  process.exit(0);
}); 