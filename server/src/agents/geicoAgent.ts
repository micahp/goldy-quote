import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page, ElementHandle } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

// For ES modules in TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add stealth plugin to avoid detection
// @ts-ignore - TypeScript doesn't recognize the use method but it exists at runtime
puppeteerExtra.use(StealthPlugin());

// Define standard Chrome paths for different operating systems
const chromePaths = {
  mac: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  windows: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  linux: '/usr/bin/google-chrome'
};

// Active task tracking
interface TaskState {
  browser?: Browser;
  page?: Page;
  status: 'initializing' | 'waiting_for_input' | 'processing' | 'completed' | 'error';
  currentStep: number;
  requiredFields: Record<string, { 
    name: string, 
    type: string, 
    options?: string[],
    required: boolean 
  }>;
  lastFields?: Record<string, any>;
  error?: string;
  quote?: {
    price: string;
    term: string;
    details: Record<string, any>;
  };
}

const activeTasks: Record<string, TaskState> = {};

// Helper function to generate task ID
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to extract form fields from a page
async function extractFormFields(page: Page): Promise<Record<string, { name: string, type: string, options?: string[], required: boolean }>> {
  console.log('Extracting form fields from current page...');
  
  return await page.evaluate(() => {
    const fields: Record<string, { name: string, type: string, options?: string[], required: boolean }> = {};
    
    // Find all input elements, selects, and textareas
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea');
    
    inputs.forEach((input: Element, index) => {
      const inputElement = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = inputElement.name || inputElement.id || `field_${index}`;
      let type = inputElement.tagName.toLowerCase();
      const required = inputElement.hasAttribute('required');
      
      if (type === 'input') {
        type = (inputElement as HTMLInputElement).type || 'text';
      }
      
      // For select elements, get the options
      let options;
      if (type === 'select') {
        options = Array.from((inputElement as HTMLSelectElement).options).map(option => option.value);
      }
      
      // Label text can be helpful for identifying fields
      let labelText = '';
      const inputId = inputElement.id;
      if (inputId) {
        const label = document.querySelector(`label[for="${inputId}"]`);
        if (label) {
          labelText = label.textContent?.trim() || '';
        }
      }
      
      // Create a descriptive name using label when available
      const fieldName = labelText || name;
      
      fields[name] = {
        name: fieldName,
        type,
        ...(options && { options }),
        required
      };
    });
    
    return fields;
  });
}

// Start a new Geico quote process
export const geicoAgent = {
  async startQuoteProcess() {
    console.log('Starting Geico quote process...');
    const taskId = generateTaskId();
    
    try {
      // Initialize the task state
      activeTasks[taskId] = {
        status: 'initializing',
        currentStep: 1,
        requiredFields: {}
      };
      
      // Determine chrome executable path based on OS
      let executablePath = chromePaths.mac; // Default to Mac path since we're on macOS
      
      console.log(`Using Chrome at: ${executablePath}`);
      
      // Create screenshots directory for debugging
      const screenshotDir = path.join(config.screenshotsDir);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      // Launch browser using puppeteer-extra with stealth plugin
      // @ts-ignore - TypeScript doesn't recognize the launch method but it exists at runtime
      const browser = await puppeteerExtra.launch({
        headless: false, // Use non-headless mode for debugging
        executablePath,   // Use the system Chrome installation
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      // Create a new page
      const page = await browser.newPage();
      
      // Set a more realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 800 });
      
      // Enable console logging from the page
      page.on('console', (msg: any) => console.log('PAGE LOG:', msg.text()));
      
      // Store browser and page in the task state
      activeTasks[taskId].browser = browser;
      activeTasks[taskId].page = page;
      
      // Navigate to Geico's auto insurance quote page
      await page.goto('https://www.geico.com/auto-insurance/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('Navigated to Geico auto insurance page');
      
      // Take a screenshot to see what's actually loading
      const initialScreenshotPath = path.join(screenshotDir, `${taskId}_initial.png`);
      await page.screenshot({ path: initialScreenshotPath, fullPage: true });
      console.log(`Initial screenshot saved to ${initialScreenshotPath}`);
      
      // Instead of looking for a specific element, get all input elements
      const inputElements = await page.$$('input');
      console.log(`Found ${inputElements.length} input elements on the page`);
      
      // Check if the ZIP input exists using multiple possible selectors
      const zipSelectors = [
        'input[name="zip"]',
        'input[id*="zip"]',
        'input[placeholder*="ZIP"]',
        'input[placeholder*="Zip"]',
        'input[aria-label*="ZIP"]',
        'input[aria-label*="Zip"]'
      ];
      
      let zipInput = null;
      for (const selector of zipSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log(`Found ZIP input with selector: ${selector}`);
            zipInput = element;
            break;
          }
        } catch (err) {
          console.log(`Selector ${selector} not found`);
        }
      }
      
      if (!zipInput) {
        // If we still can't find it, let's extract all form fields and see what we can find
        console.log('ZIP input not found with standard selectors, extracting all form fields');
        
        // Extract HTML for debugging
        const pageContent = await page.content();
        const debugHtmlPath = path.join(screenshotDir, `${taskId}_page_content.html`);
        fs.writeFileSync(debugHtmlPath, pageContent);
        console.log(`Page HTML saved to ${debugHtmlPath}`);
      }
      
      // Extract all available form fields
      const fields = await extractFormFields(page);
      console.log('Extracted form fields:', fields);
      
      // Update the task state
      activeTasks[taskId].status = 'waiting_for_input';
      activeTasks[taskId].requiredFields = fields;
      
      return {
        taskId,
        status: activeTasks[taskId].status,
        step: activeTasks[taskId].currentStep,
        requiredFields: activeTasks[taskId].requiredFields
      };
    } catch (error) {
      console.error('Error starting Geico quote process:', error);
      
      // Update the task state to error
      if (activeTasks[taskId]) {
        activeTasks[taskId].status = 'error';
        activeTasks[taskId].error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      // Clean up browser if needed
      if (activeTasks[taskId]?.browser) {
        await activeTasks[taskId].browser.close();
      }
      
      throw error;
    }
  },
  
  async submitStepData(taskId: string, formData: Record<string, any>) {
    console.log(`Processing step data for task ${taskId}...`);
    
    if (!activeTasks[taskId]) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const taskState = activeTasks[taskId];
    
    // Make sure we have a page to work with
    if (!taskState.page || !taskState.browser) {
      throw new Error('Browser or page not initialized');
    }
    
    try {
      // Update task state
      taskState.status = 'processing';
      taskState.lastFields = formData;
      
      const page = taskState.page;
      
      // Fill in the form fields with the provided data
      for (const [fieldName, value] of Object.entries(formData)) {
        console.log(`Filling field ${fieldName} with value ${value}`);
        
        // Handle different input types
        const field = await page.$(`[name="${fieldName}"], #${fieldName}`);
        
        if (field) {
          // Check the element type
          const tagName = await page.evaluate((el: Element) => el.tagName.toLowerCase(), field);
          const type = tagName === 'input' 
            ? await page.evaluate((el: HTMLInputElement) => el.type, field as ElementHandle<HTMLInputElement>)
            : tagName;
          
          if (type === 'select') {
            await page.select(`select[name="${fieldName}"], select#${fieldName}`, value.toString());
          } else if (type === 'checkbox' || type === 'radio') {
            if (value) {
              await field.click();
            }
          } else {
            // For text inputs, first clear the field
            await field.click({ clickCount: 3 }); // Select all text
            await field.press('Backspace'); // Delete it
            await field.type(value.toString());
          }
        } else {
          console.warn(`Field ${fieldName} not found on the page`);
        }
      }
      
      // Find and click the continue/submit button
      const submitButtonSelectors = [
        'button[type="submit"]', 
        'input[type="submit"]',
        'button.submit',
        'button.continue',
        'button:contains("Continue")',
        'button:contains("Submit")',
        'button:contains("Next")'
      ];
      
      for (const selector of submitButtonSelectors) {
        const button = await page.$(selector);
        if (button) {
          console.log(`Clicking submit button with selector: ${selector}`);
          await button.click();
          break;
        }
      }
      
      // Wait for navigation or new content to load
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        console.log('No navigation occurred, continuing...');
      });
      
      // Check if we've reached a quote page
      const isQuotePage = await page.evaluate(() => {
        return window.location.href.includes('quote') || 
               document.body.innerHTML.includes('Your Quote') ||
               document.body.innerHTML.includes('Premium');
      });
      
      if (isQuotePage) {
        // Extract quote information
        const quote = await page.evaluate(() => {
          // This is a simple example - you'd need to adapt this to Geico's actual quote page structure
          const priceElement = document.querySelector('.price, .premium, .amount');
          const termElement = document.querySelector('.term, .policy-term');
          
          return {
            price: priceElement ? priceElement.textContent?.trim() || 'Price not found' : 'Price not found',
            term: termElement ? termElement.textContent?.trim() || '6 months' : '6 months',
            details: {
              // Add more quote details extraction logic here
              timestamp: new Date().toISOString()
            }
          };
        });
        
        // Update task state
        taskState.status = 'completed';
        taskState.quote = quote;
        
        // Return the completed quote
        return {
          taskId,
          status: taskState.status,
          quote: taskState.quote
        };
      } else {
        // Continue to the next step
        taskState.currentStep += 1;
        taskState.status = 'waiting_for_input';
        
        // Extract the new form fields
        const newFields = await extractFormFields(page);
        taskState.requiredFields = newFields;
        
        return {
          taskId,
          status: taskState.status,
          step: taskState.currentStep,
          requiredFields: taskState.requiredFields
        };
      }
    } catch (error) {
      console.error(`Error processing step data for task ${taskId}:`, error);
      
      // Update task state
      taskState.status = 'error';
      taskState.error = error instanceof Error ? error.message : 'Unknown error';
      
      throw error;
    }
  },
  
  async getTaskStatus(taskId: string) {
    if (!activeTasks[taskId]) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const taskState = activeTasks[taskId];
    
    // Take a screenshot of the current state for debugging
    if (taskState.page) {
      try {
        const screenshotPath = path.join(config.screenshotsDir, `${taskId}_step${taskState.currentStep}.png`);
        await taskState.page.screenshot({ path: screenshotPath });
      } catch (error) {
        console.error('Error taking screenshot:', error);
      }
    }
    
    return {
      taskId,
      status: taskState.status,
      step: taskState.currentStep,
      ...(taskState.requiredFields && { requiredFields: taskState.requiredFields }),
      ...(taskState.error && { error: taskState.error }),
      ...(taskState.quote && { quote: taskState.quote })
    };
  },
  
  async cleanupTask(taskId: string) {
    if (!activeTasks[taskId]) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Close the browser if it exists
    if (activeTasks[taskId].browser) {
      await activeTasks[taskId].browser.close();
    }
    
    // Remove the task from active tasks
    delete activeTasks[taskId];
    
    return { success: true, message: `Task ${taskId} cleaned up successfully` };
  }
}; 