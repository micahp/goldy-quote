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
  browserUseApiKey: process.env.BROWSER_USE_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Add a note about getting a Browser-Use API key
  browserUseApiKeyNote: 'Get your API key from cloud.browser-use.com/billing',

  // Screenshots directory for debugging
  screenshotsDir
}; 