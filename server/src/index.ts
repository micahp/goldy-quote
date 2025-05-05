import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { geicoAgent } from './agents/geicoAgent.js';

// For ES modules in TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Enable CORS
app.use(cors());

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// API endpoint to start the Geico quote process
app.post('/api/quotes/geico/start', async (req, res) => {
  try {
    console.log('Starting Geico quote process');
    const { zipCode } = req.body; // Extract zipCode from request
    console.log(`Initial zip code provided: ${zipCode || 'None'}`);
    const response = await geicoAgent.startQuoteProcess(zipCode);
    res.json(response);
  } catch (error) {
    console.error('Error starting quote process:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Simple test endpoint for direct ZIP code testing
app.get('/api/test/geico/:zipCode', async (req, res) => {
  try {
    const { zipCode } = req.params;
    if (!zipCode || zipCode.length !== 5) {
      return res.status(400).json({ error: 'Valid 5-digit ZIP code is required' });
    }
    
    console.log(`Running direct ZIP code test for: ${zipCode}`);
    const response = await geicoAgent.startQuoteProcess(zipCode);
    res.json(response);
  } catch (error) {
    console.error('Error in ZIP code test:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// API endpoint to provide data for the current step
app.post('/api/quotes/geico/step', async (req, res) => {
  try {
    const { taskId, data } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const response = await geicoAgent.submitStepData(taskId, data);
    res.json(response);
  } catch (error) {
    console.error('Error processing step data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// API endpoint to get the current status of a quote task
app.get('/api/quotes/geico/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const response = await geicoAgent.getTaskStatus(taskId);
    res.json(response);
  } catch (error) {
    console.error('Error getting task status:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// API endpoint to clean up a task
app.delete('/api/quotes/geico/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    // Even if there's an error, always return a success response
    // since the goal is simply to ensure resources are cleaned up
    try {
      const response = await geicoAgent.cleanupTask(taskId);
      res.json(response);
    } catch (error) {
      console.warn(`Error during task cleanup for ${taskId}, but proceeding anyway:`, error);
      // Return success even if cleanup fails, since browser will eventually be closed by OS
      res.json({ 
        success: true, 
        message: `Task ${taskId} cleanup attempted. Any browser instances will be cleaned up by the system.`,
        warning: error instanceof Error ? error.message : 'Unknown error during cleanup'
      });
    }
  } catch (error) {
    console.error('Unexpected error in cleanup endpoint:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
}); 