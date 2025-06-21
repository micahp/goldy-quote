import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create screenshots directory
const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Browser configuration
  headful: process.env.HEADFUL === '1',
  browserTimeout: parseInt(process.env.BROWSER_TIMEOUT || '60000', 10), // 60 seconds
  stepTimeout: parseInt(process.env.STEP_TIMEOUT || '15000', 10), // 15 seconds
  
  // Screenshots directory for debugging
  screenshotsDir,
  
  // WebSocket configuration
  wsPort: process.env.WS_PORT || 3002,
}; 