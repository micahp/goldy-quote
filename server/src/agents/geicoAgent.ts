import puppeteer, { Browser, Page, ElementHandle, JSHandle } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
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
  
  // First try to detect if we're on a specific known form
  const pageTitle = await page.evaluate(() => {
    const h1 = document.querySelector('h1, .page-title, .form-title');
    return h1 ? h1.textContent?.trim() : null;
  });
  
  console.log('Page title detected:', pageTitle);
  
  // Check if we're on the initial Geico page with zip code entry
  const isInitialPage = await page.evaluate(() => {
    return document.querySelector('input[name="POL_ratedZip5"], input[name="zip"]') !== null &&
           !document.querySelector('input[name="firstName"], input[id="firstName"]');
  });

  if (isInitialPage) {
    console.log('Detected initial ZIP code entry page');
    
    // Only return the ZIP code field and Auto insurance selection
    return {
      'zipCode': {
        name: 'ZIP Code',
        type: 'text',
        required: true
      }
    };
  }
  
  // Check if we're on an address input page
  const isAddressPage = await page.evaluate(() => {
    // Check for address-related fields
    const addressSelectors = [
      'input[name="address"]', 'input[id="address"]', 'input[placeholder*="address"]', 
      'input[aria-label*="address"]', 'input[name="streetAddress"]', 'input[id="streetAddress"]',
      'input[placeholder*="street"]', 'input[aria-label*="street"]'
    ];
    
    const aptSelectors = [
      'input[name="apt"]', 'input[id="apt"]', 'input[placeholder*="apt"]', 
      'input[aria-label*="apartment"]', 'input[name="apartment"]', 'input[id="apartment"]'
    ];
    
    const zipSelectors = [
      'input[name="zip"]', 'input[id="zip"]', 'input[placeholder*="ZIP"]', 
      'input[aria-label*="ZIP"]', 'input[name="zipCode"]', 'input[id="zipCode"]'
    ];
    
    // Check if any of these selectors match elements on the page
    const hasAddress = addressSelectors.some(selector => document.querySelector(selector) !== null);
    const hasApt = aptSelectors.some(selector => document.querySelector(selector) !== null);
    const hasZip = zipSelectors.some(selector => document.querySelector(selector) !== null);
    
    // Also check for text in the page content that would indicate this is an address form
    const pageContent = document.body.textContent || '';
    const hasAddressText = 
      pageContent.includes('Address') || 
      pageContent.includes('Street') || 
      pageContent.includes('Apartment') ||
      pageContent.includes('Apt') ||
      pageContent.includes('ZIP');
    
    return (hasAddress || hasApt || hasZip || hasAddressText) && 
           !pageContent.includes('First Name') && 
           !pageContent.includes('Last Name');
  });

  if (isAddressPage) {
    console.log('Detected address form page');
    
    // Define a specific set of fields for the address page
    return {
      'streetAddress': {
        name: 'Street Address',
        type: 'text',
        required: true
      },
      'apt': {
        name: 'Apt #',
        type: 'text',
        required: false
      },
      'zipCode': {
        name: '5-Digit ZIP Code',
        type: 'text',
        required: true
      }
    };
  }
  
  // Check if we're on the personal information page with First Name, Last Name, etc.
  const isPersonalInfoPage = await page.evaluate(() => {
    // Check for inputs with name, id, placeholder, or aria-label containing these terms
    const firstNameSelectors = [
      'input[name="firstName"]', 
      'input[id="firstName"]',
      'input[placeholder*="First"]',
      'input[aria-label*="First Name"]',
      'input[data-testid*="first"]'
    ];
    
    const lastNameSelectors = [
      'input[name="lastName"]',
      'input[id="lastName"]',
      'input[placeholder*="Last"]',
      'input[aria-label*="Last Name"]',
      'input[data-testid*="last"]'
    ];
    
    const dobSelectors = [
      'input[name="dateOfBirth"]',
      'input[id="dateOfBirth"]',
      'input[name="dob"]',
      'input[id="dob"]',
      'input[placeholder*="Birth"]',
      'input[placeholder*="Date of Birth"]',
      'input[aria-label*="birth"]',
      'input[data-testid*="dob"]'
    ];
    
    // Check if any of these selectors match elements on the page
    const hasFirstName = firstNameSelectors.some(selector => document.querySelector(selector) !== null);
    const hasLastName = lastNameSelectors.some(selector => document.querySelector(selector) !== null);
    const hasDOB = dobSelectors.some(selector => document.querySelector(selector) !== null);
    
    // Also check for text in the page content that would indicate this is a personal info form
    const pageContent = document.body.textContent || '';
    const hasPersonalInfoText = 
      pageContent.includes('First Name') || 
      pageContent.includes('Last Name') || 
      pageContent.includes('Date of Birth') ||
      pageContent.includes('Date Of Birth') ||
      pageContent.includes('DOB') ||
      pageContent.includes('Personal Information');
    
    return hasFirstName || hasLastName || hasDOB || hasPersonalInfoText;
  });

  if (isPersonalInfoPage) {
    console.log('Detected personal information form page');
    
    // Define a specific set of fields for the personal info page
    return {
      'firstName': {
        name: 'First Name',
        type: 'text',
        required: true
      },
      'lastName': {
        name: 'Last Name',
        type: 'text',
        required: true
      },
      'dateOfBirth': {
        name: 'Date of Birth (MM/DD/YYYY)',
        type: 'text',
        required: true
      }
    };
  }
  
  // Default behavior - extract all form fields
  const fields = await page.evaluate(() => {
    const fields: Record<string, { name: string, type: string, options?: string[], required: boolean }> = {};
    
    // Find all input elements, selects, and textareas
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea');
    
    inputs.forEach((input: Element, index) => {
      const inputElement = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = inputElement.name || inputElement.id || `field_${index}`;
      let type = inputElement.tagName.toLowerCase();
      const required = inputElement.hasAttribute('required');
      
      // Skip invisible elements and common UI controls
      const style = window.getComputedStyle(inputElement);
      if (style.display === 'none' || style.visibility === 'hidden' || 
          name.includes('cookie') || name.includes('modal') || 
          name.includes('switch') || name.includes('darkMode')) {
        return;
      }
      
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
  
  return fields;
}

// Helper function for direct ZIP code submission on Geico homepage
async function submitZipCode(page: Page, zipCode: string): Promise<boolean> {
  console.log(`Attempting direct ZIP code submission for ${zipCode}`);
  
  try {
    // Take screenshot before any action
    await page.screenshot({ path: path.join(config.screenshotsDir, 'before_zip_submission.png'), fullPage: true });
    
    // First check if we have any alert or overlay
    const hasOverlay = await page.evaluate(() => {
      const overlays = document.querySelectorAll('.modal, .overlay, .popup, [role="dialog"]');
      for (const overlay of overlays) {
        const style = window.getComputedStyle(overlay);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          console.log('Found overlay:', overlay.className);
          return true;
        }
      }
      return false;
    });
    
    if (hasOverlay) {
      console.log('Overlay detected, attempting to close it first');
      await page.evaluate(() => {
        // Try to find and click close buttons
        const closeButtons = [
          ...document.querySelectorAll('.close, .close-button, .dismiss, button[aria-label="Close"]'),
          ...Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('×') || b.textContent?.includes('Close'))
        ];
        
        for (const btn of closeButtons) {
          try {
            (btn as HTMLElement).click();
            console.log('Clicked close button');
            return true;
          } catch (e) {
            // Continue if one fails
          }
        }
        return false;
      });
      
      // Wait a moment for any animation to complete
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    }
    
    // Use direct approach - this selector is specific to the GEICO homepage
    await page.waitForSelector('input[name="POL_ratedZip5"], input[name="zip"], input[placeholder*="ZIP"], input[type="tel"]', { timeout: 5000 })
      .catch(() => console.log('ZIP input selector not found, will try different approach'));
    
    const result = await page.evaluate((zip: string) => {
      // First try using a very specific ZIP code input and button on Geico homepage
      try {
        // Log available ZIP fields for debugging
        const allZipFields = document.querySelectorAll('input[name="POL_ratedZip5"], input[name="zip"], input[placeholder*="ZIP"], input[type="tel"]');
        console.log(`Found ${allZipFields.length} potential ZIP code fields`);
        Array.from(allZipFields).forEach((el, i) => {
          const input = el as HTMLInputElement;
          console.log(`Field ${i}: name=${input.name}, type=${input.type}, placeholder=${input.placeholder}, visible=${window.getComputedStyle(input).display !== 'none'}`);
        });
        
        // Focus on POL_ratedZip5 input field (main Geico ZIP field)
        const zipField = document.querySelector('input[name="POL_ratedZip5"]') as HTMLInputElement;
        if (zipField) {
          // Clear and set value
          zipField.value = zip;
          zipField.dispatchEvent(new Event('input', { bubbles: true }));
          zipField.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Successfully filled ZIP code field');
          
          // Log all available buttons for debugging
          const allButtons = document.querySelectorAll('button, input[type="submit"]');
          console.log(`Found ${allButtons.length} potential buttons`);
          Array.from(allButtons).forEach((btn, i) => {
            console.log(`Button ${i}: text="${btn.textContent?.trim()}", type=${(btn as HTMLButtonElement).type}, visible=${window.getComputedStyle(btn).display !== 'none'}`);
          });
          
          // Find the Start My Quote button specific to Geico homepage
          // Try multiple approaches to find the button
          let startButton = null;
          
          // 1. Try by button text content
          startButton = Array.from(document.querySelectorAll('button'))
            .find(btn => {
              const text = (btn.textContent || '').trim().toLowerCase();
              return text.includes('start my quote') || text === 'start quote' || text === 'get quote';
            });
            
          // 2. Try by button class or id
          if (!startButton) {
            startButton = document.querySelector('button.quote-btn, button.start-quote-btn, button#start-quote, button#get-quote');
          }
          
          // 3. Try by button parent container
          if (!startButton) {
            const zipContainer = zipField.closest('form, div.zip-form, div.quote-form');
            if (zipContainer) {
              startButton = zipContainer.querySelector('button');
            }
          }
          
          if (startButton) {
            console.log('Found Start Quote button, clicking...');
            (startButton as HTMLButtonElement).click();
            return true;
          }
          
          // Alternative approach - find any button after the ZIP field
          const zipForm = zipField.closest('form');
          if (zipForm) {
            const submitButton = zipForm.querySelector('button[type="submit"]');
            if (submitButton) {
              console.log('Found form submit button, clicking...');
              (submitButton as HTMLButtonElement).click();
              return true;
            }
          }
        }
      } catch (e) {
        console.log('Error in primary ZIP code approach:', e);
      }
      
      // If the above didn't work, try a more general approach
      try {
        // Find any visible ZIP field
        const zipInputs = document.querySelectorAll('input[name="POL_ratedZip5"], input[name="zip"], input[placeholder*="ZIP"], input[type="tel"]');
        let zipFilled = false;
        
        for (const input of zipInputs) {
          const inputEl = input as HTMLInputElement;
          // Skip invisible elements
          const style = window.getComputedStyle(inputEl);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          
          inputEl.value = zip;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          zipFilled = true;
          console.log('Filled ZIP field via alternative method');
          break;
        }
        
        if (!zipFilled) return false;
        
        // Find and click any action button
        const actionButtons = [
          ...document.querySelectorAll('button[type="submit"]'),
          ...document.querySelectorAll('button.btn-primary'),
          ...document.querySelectorAll('input[type="submit"]'),
          ...Array.from(document.querySelectorAll('button')).filter(b => {
            const text = (b.textContent || '').toLowerCase().trim();
            return text.includes('start') || text.includes('quote') || text.includes('continue') || text.includes('submit');
          })
        ];
        
        for (const button of actionButtons) {
          // Skip invisible buttons
          const style = window.getComputedStyle(button);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          
          console.log('Clicking button:', button.textContent || 'No text');
          (button as HTMLElement).click();
          return true;
        }
        
        // Last resort: Try to submit the form directly
        if (zipFilled) {
          const form = document.querySelector('form');
          if (form) {
            console.log('Trying to submit form directly');
            form.submit();
            return true;
          }
        }
      } catch (e) {
        console.log('Error in secondary ZIP code approach:', e);
      }
      
      return false;
    }, zipCode);
    
    // If evaluate method didn't work, try a direct approach
    if (!result) {
      console.log('Direct JavaScript approach failed, trying Puppeteer actions');
      
      // Try to find and fill the ZIP code field
      await page.waitForSelector('input[name="POL_ratedZip5"], input[name="zip"], input[placeholder*="ZIP"]', { timeout: 3000 })
        .catch(() => console.log('No ZIP input found'));
      
      await page.evaluate((zip) => {
        const inputs = document.querySelectorAll('input[name="POL_ratedZip5"], input[name="zip"], input[placeholder*="ZIP"], input[type="tel"]');
        for (const input of inputs) {
          try {
            (input as HTMLInputElement).value = zip;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {
            // Continue if one fails
          }
        }
      }, zipCode);
      
      // Try to click the submit button
      try {
        // First try to find by text content and click
        const startQuoteButtonFound = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const quoteButton = buttons.find(b => 
            (b.textContent || '').toLowerCase().includes('start my quote') || 
            (b.textContent || '').toLowerCase().includes('get quote')
          );
          
          if (quoteButton) {
            (quoteButton as HTMLElement).click();
            return true;
          }
          return false;
        });
        
        if (!startQuoteButtonFound) {
          console.log('No Start My Quote button found via JS evaluation');
          
          // If that fails, try any submit button
          const submitButtonFound = await page.evaluate(() => {
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) {
              (submitButton as HTMLElement).click();
              return true;
            }
            return false;
          });
          
          if (!submitButtonFound) {
            console.log('No submit button found via JS evaluation');
            
            // As a last resort, press Enter key on the ZIP field
            await page.keyboard.press('Enter');
          }
        }
        
        // Wait for potential navigation
        await page.waitForNavigation({ timeout: 5000 })
          .catch(() => console.log('No navigation after button click or Enter key'));
      } catch (e: unknown) {
        console.log('Error in direct Puppeteer approach:', e instanceof Error ? e.message : String(e));
      }
    }
    
    // Take screenshot after action
    await page.screenshot({ path: path.join(config.screenshotsDir, 'after_zip_submission.png'), fullPage: true });
    
    // Save HTML for debugging
    const html = await page.content();
    fs.writeFileSync(path.join(config.screenshotsDir, 'page_after_submission.html'), html);
    
    console.log(`Direct ZIP code submission ${result ? 'succeeded' : 'attempted with fallback methods'}`);
    
    // Give some time for any potential navigation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true; // We've at least attempted multiple approaches
  } catch (error) {
    console.error('Error in submitZipCode function:', error);
    return false;
  }
}

// Start a new Geico quote process
export const geicoAgent = {
  async startQuoteProcess(zipCode?: string) {
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
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1280,920',
          '--start-maximized',
          '--disable-notifications',
          '--disable-popup-blocking',
          '--disable-extensions'
        ],
        defaultViewport: null // Allow the browser to control viewport size
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
      await page.goto('https://www.geico.com/', {
        waitUntil: 'networkidle2',
        timeout: 60000 // Increase timeout to 60 seconds to ensure full page load
      });
      console.log('Navigated to Geico auto insurance page');
      
      // Wait longer for the page to fully load - sometimes JS needs more time
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
      
      // Take a screenshot to see what's actually loading
      const initialScreenshotPath = path.join(screenshotDir, `${taskId}_initial.png`);
      await page.screenshot({ path: initialScreenshotPath, fullPage: true });
      console.log(`Initial screenshot saved to ${initialScreenshotPath}`);
      
      // Simplified approach: If we have a ZIP code, try to submit it directly
      let zipSubmitted = false;
      if (zipCode) {
        console.log(`Submitting ZIP code: ${zipCode}`);
        zipSubmitted = await submitZipCode(page, zipCode);
      }
      
      // If submitting ZIP code directly didn't work (or no ZIP provided), 
      // continue with extracting form fields for user input
      if (!zipSubmitted) {
        // Wait for any redirects or page changes to settle
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
      }
      
      // Take another screenshot to see the result
      const afterInteractionScreenshot = path.join(screenshotDir, `${taskId}_after_interaction.png`);
      await page.screenshot({ path: afterInteractionScreenshot, fullPage: true });
      console.log(`Screenshot after interaction saved to: ${afterInteractionScreenshot}`);
      
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
      
      // Take a screenshot before submitting form
      const screenshotPath = path.join(config.screenshotsDir, `${taskId}_before_submit_step${taskState.currentStep}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Check if we need to handle a specific form type based on our field detection
      const pageTitle = await page.evaluate(() => {
        const h1 = document.querySelector('h1, .page-title, .form-title');
        return h1 ? h1.textContent?.trim() : null;
      });
      
      console.log(`Submitting data for page with title: "${pageTitle}"`);
      
      // Check if we're on the initial ZIP code page
      const isZipCodePage = await page.evaluate(() => {
        return document.querySelector('input[name="POL_ratedZip5"], input[name="zip"]') !== null &&
               !document.querySelector('input[name="firstName"], input[id="firstName"]');
      });
      
      if (isZipCodePage && formData.zipCode) {
        console.log(`Entering ZIP code: ${formData.zipCode}`);
        
        // Find and fill any ZIP code fields
        const zipSelectors = [
          'input[name="POL_ratedZip5"]',
          'input[name="zip"]',
          'input[placeholder*="ZIP"]',
          'input[placeholder*="Zip"]',
          'input[aria-label*="ZIP"]',
          'input[type="tel"]'
        ];
        
        // Try each ZIP field selector
        let zipFilled = false;
        for (const selector of zipSelectors) {
          const inputs = await page.$$(selector);
          for (const input of inputs) {
            try {
              // Clear and fill the input
              await input.click({ clickCount: 3 });
              await input.press('Backspace');
              await input.type(formData.zipCode.toString());
              zipFilled = true;
              console.log(`Filled ZIP code using selector: ${selector}`);
              break;
            } catch (err) {
              console.log(`Failed to fill ZIP with selector ${selector}:`, err instanceof Error ? err.message : 'Unknown error');
            }
          }
          if (zipFilled) break;
        }
        
        // If direct input failed, try JavaScript approach
        if (!zipFilled) {
          console.log('Using JavaScript to fill ZIP code fields');
          await page.evaluate((zip: string) => {
            const inputs = document.querySelectorAll('input[type="tel"], input[placeholder*="ZIP"], input[name="zip"]');
            for (const input of inputs) {
              try {
                (input as HTMLInputElement).value = zip;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              } catch (e) {
                // Continue if one fails
              }
            }
          }, formData.zipCode.toString());
        }
      } else if (await page.evaluate(() => {
        // Check for address form fields
        const addressSelectors = [
          'input[name="address"]', 'input[id="address"]', 'input[placeholder*="address"]', 
          'input[aria-label*="address"]', 'input[name="streetAddress"]', 'input[id="streetAddress"]'
        ];
        
        const aptSelectors = [
          'input[name="apt"]', 'input[id="apt"]', 'input[placeholder*="apt"]', 
          'input[name="apartment"]', 'input[id="apartment"]'
        ];
        
        const zipSelectors = [
          'input[name="zip"]', 'input[id="zip"]', 'input[placeholder*="ZIP"]', 
          'input[name="zipCode"]', 'input[id="zipCode"]'
        ];
        
        return addressSelectors.some(selector => document.querySelector(selector) !== null) ||
               aptSelectors.some(selector => document.querySelector(selector) !== null) ||
               zipSelectors.some(selector => document.querySelector(selector) !== null);
      })) {
        // Handle address form
        console.log('Filling address form');
        
        // Enhanced mappings for address fields
        const fieldMappings = {
          'streetAddress': [
            'input[name="address"]', 
            'input[id="address"]', 
            'input[placeholder*="address"]',
            'input[aria-label*="address"]',
            'input[name="streetAddress"]',
            'input[id="streetAddress"]',
            'input[placeholder*="street"]',
            // Try to find by label text
            'label:contains("Address") + input',
            'label:contains("Street") + input',
            // Look for inputs near text indicating address
            'div:contains("Address") input'
          ],
          'apt': [
            'input[name="apt"]', 
            'input[id="apt"]', 
            'input[placeholder*="apt"]',
            'input[aria-label*="apartment"]',
            'input[name="apartment"]',
            'input[id="apartment"]',
            // Try to find by label text
            'label:contains("Apt") + input',
            'label:contains("Apartment") + input',
            // Look for inputs near text indicating apartment
            'div:contains("Apt") input',
            'div:contains("Apartment") input'
          ],
          'zipCode': [
            'input[name="zip"]', 
            'input[id="zip"]', 
            'input[placeholder*="ZIP"]',
            'input[aria-label*="ZIP"]',
            'input[name="zipCode"]',
            'input[id="zipCode"]',
            // Try to find by label text
            'label:contains("ZIP") + input',
            'label:contains("Zip") + input',
            // Look for inputs near text indicating ZIP code
            'div:contains("ZIP") input'
          ]
        };
        
        // Fill each field using the mappings
        for (const [fieldName, selectors] of Object.entries(fieldMappings)) {
          if (formData[fieldName]) {
            console.log(`Attempting to fill ${fieldName} with value ${formData[fieldName]}`);
            let fieldFilled = false;
            
            // First try using Puppeteer's direct element interaction
            for (const selector of selectors) {
              try {
                // First check if selector is valid
                await page.evaluate((sel) => {
                  try {
                    document.querySelector(sel);
                    return true;
                  } catch {
                    return false;
                  }
                }, selector).catch(() => false);
                
                // Use $$ to get all matching elements
                const elements = await page.$$(selector).catch(() => []);
                
                for (const element of elements) {
                  try {
                    // Check if element is visible
                    const isVisible = await page.evaluate(el => {
                      const style = window.getComputedStyle(el);
                      return style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             (el as HTMLElement).offsetWidth > 0 && 
                             (el as HTMLElement).offsetHeight > 0;
                    }, element);
                    
                    if (!isVisible) continue;
                    
                    // Clear and fill
                    await element.click({ clickCount: 3 });
                    await element.press('Backspace');
                    await element.type(formData[fieldName].toString());
                    
                    // Verify the value was actually set
                    const valueSet = await page.evaluate((el, value) => {
                      return (el as HTMLInputElement).value === value;
                    }, element, formData[fieldName].toString());
                    
                    if (valueSet) {
                      fieldFilled = true;
                      console.log(`Successfully filled ${fieldName} using selector: ${selector}`);
                      break;
                    }
                  } catch (err) {
                    console.log(`Failed to fill ${fieldName} element with selector ${selector}:`, err instanceof Error ? err.message : 'Unknown error');
                  }
                }
                if (fieldFilled) break;
              } catch (err) {
                console.log(`Error with selector ${selector}:`, err instanceof Error ? err.message : 'Unknown error');
              }
            }
            
            // If direct input failed, try JavaScript approach
            if (!fieldFilled) {
              console.log(`Using JavaScript to fill ${fieldName}`);
              
              const jsResult = await page.evaluate((field, value, selectors) => {
                // Helper to check visibility
                const isVisible = (el: Element) => {
                  const style = window.getComputedStyle(el);
                  return style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         (el as HTMLElement).offsetWidth > 0 && 
                         (el as HTMLElement).offsetHeight > 0;
                };
                
                // Try each selector
                for (const selector of selectors) {
                  try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                      try {
                        if (!isVisible(element)) continue;
                        
                        const input = element as HTMLInputElement;
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Verify value was set
                        if (input.value === value) {
                          return { success: true, message: `Filled ${field} with selector ${selector}` };
                        }
                      } catch (e) {
                        // Continue if one fails
                      }
                    }
                  } catch (e) {
                    // Continue if selector fails
                  }
                }
                
                // If all selectors failed, try using placeholder or contextual approach
                const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
                for (const input of allInputs) {
                  try {
                    if (!isVisible(input)) continue;
                    
                    const placeholder = (input as HTMLInputElement).placeholder?.toLowerCase() || '';
                    const parentText = input.parentElement?.textContent?.toLowerCase() || '';
                    const inputId = input.id?.toLowerCase() || '';
                    const inputName = (input as HTMLInputElement).name?.toLowerCase() || '';
                    
                    let isTargetField = false;
                    
                    if (field === 'streetAddress' && (
                      placeholder.includes('address') || placeholder.includes('street') ||
                      parentText.includes('address') || parentText.includes('street') ||
                      inputId.includes('address') || inputId.includes('street') ||
                      inputName.includes('address') || inputName.includes('street')
                    )) {
                      isTargetField = true;
                    } else if (field === 'apt' && (
                      placeholder.includes('apt') || placeholder.includes('apartment') ||
                      parentText.includes('apt') || parentText.includes('apartment') ||
                      inputId.includes('apt') || inputId.includes('apartment') ||
                      inputName.includes('apt') || inputName.includes('apartment')
                    )) {
                      isTargetField = true;
                    } else if (field === 'zipCode' && (
                      placeholder.includes('zip') || 
                      parentText.includes('zip') ||
                      inputId.includes('zip') ||
                      inputName.includes('zip')
                    )) {
                      isTargetField = true;
                    }
                    
                    if (isTargetField) {
                      (input as HTMLInputElement).value = value;
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                      return { success: true, message: `Filled ${field} using contextual detection` };
                    }
                  } catch (e) {
                    // Continue to next input
                  }
                }
                
                return { success: false, message: `Could not find or fill ${field} field` };
              }, fieldName, formData[fieldName].toString(), selectors);
              
              if (jsResult && jsResult.success) {
                console.log(jsResult.message);
                fieldFilled = true;
              } else {
                console.log(`Field ${fieldName} not found on the page using any selector`);
              }
            }
          }
        }
      } else if (await page.evaluate(() => {
        // Check for any personal information fields
        const selectors = [
          'input[name="firstName"]', 'input[id="firstName"]', 'input[placeholder*="First"]', 'input[aria-label*="First"]',
          'input[name="lastName"]', 'input[id="lastName"]', 'input[placeholder*="Last"]', 'input[aria-label*="Last"]',
          'input[name="dateOfBirth"]', 'input[name="dob"]', 'input[id="dateOfBirth"]', 'input[id="dob"]',
          'input[placeholder*="Birth"]', 'input[placeholder*="Date"]', 'input[aria-label*="Birth"]'
        ];
        return selectors.some(selector => document.querySelector(selector) !== null);
      })) {
        // Handle personal information form with first name, last name, DOB
        console.log('Filling personal information form');

        // Enhanced mappings with more potential selectors
        const fieldMappings = {
          'firstName': [
            'input[name="firstName"]', 
            'input[id="firstName"]', 
            'input[placeholder*="First"]',
            'input[aria-label*="First"]',
            'input[data-testid*="first"]',
            // Try to find by label text
            'label:contains("First Name") + input',
            'label:contains("First Name") ~ input',
            // Look for inputs near text indicating first name
            'div:contains("First Name") input'
          ],
          'lastName': [
            'input[name="lastName"]', 
            'input[id="lastName"]', 
            'input[placeholder*="Last"]',
            'input[aria-label*="Last"]',
            'input[data-testid*="last"]',
            // Try to find by label text
            'label:contains("Last Name") + input',
            'label:contains("Last Name") ~ input',
            // Look for inputs near text indicating last name
            'div:contains("Last Name") input'
          ],
          'dateOfBirth': [
            'input[name="dateOfBirth"]', 
            'input[id="dateOfBirth"]',
            'input[name="dob"]', 
            'input[id="dob"]',
            'input[placeholder*="Birth"]', 
            'input[placeholder*="MM/DD/YYYY"]',
            'input[aria-label*="Birth"]',
            'input[data-testid*="dob"]',
            // Try to find by label text
            'label:contains("Date of Birth") + input',
            'label:contains("Date of Birth") ~ input',
            'label:contains("DOB") + input',
            'label:contains("DOB") ~ input',
            // Look for inputs near text indicating date of birth
            'div:contains("Date of Birth") input',
            'div:contains("DOB") input'
          ]
        };

        // Fill each field using the mappings
        for (const [fieldName, selectors] of Object.entries(fieldMappings)) {
          if (formData[fieldName]) {
            console.log(`Attempting to fill ${fieldName} with value ${formData[fieldName]}`);
            let fieldFilled = false;

            // First try using Puppeteer's direct element interaction
            for (const selector of selectors) {
              try {
                // First check if selector is valid
                await page.evaluate((sel) => {
                  try {
                    document.querySelector(sel);
                    return true;
                  } catch {
                    return false;
                  }
                }, selector).catch(() => false);

                // Use $$ to get all matching elements
                const elements = await page.$$(selector).catch(() => []);
                
                for (const element of elements) {
                  try {
                    // Check if element is visible
                    const isVisible = await page.evaluate(el => {
                      const style = window.getComputedStyle(el);
                      return style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             (el as HTMLElement).offsetWidth > 0 && 
                             (el as HTMLElement).offsetHeight > 0;
                    }, element);

                    if (!isVisible) continue;

                    // Clear and fill
                    await element.click({ clickCount: 3 });
                    await element.press('Backspace');
                    await element.type(formData[fieldName].toString());
                    
                    // Verify the value was actually set
                    const valueSet = await page.evaluate((el, value) => {
                      return (el as HTMLInputElement).value === value;
                    }, element, formData[fieldName].toString());
                    
                    if (valueSet) {
                      fieldFilled = true;
                      console.log(`Successfully filled ${fieldName} using selector: ${selector}`);
                      break;
                    }
                  } catch (err) {
                    console.log(`Failed to fill ${fieldName} element with selector ${selector}:`, err instanceof Error ? err.message : 'Unknown error');
                  }
                }
                if (fieldFilled) break;
              } catch (err) {
                console.log(`Error with selector ${selector}:`, err instanceof Error ? err.message : 'Unknown error');
              }
            }

            // If direct input failed, try JavaScript approach
            if (!fieldFilled) {
              console.log(`Using JavaScript to fill ${fieldName}`);
              
              // First approach: Try direct selectors
              const jsResult = await page.evaluate((field, value, selectors) => {
                // Helper to check visibility
                const isVisible = (el: Element) => {
                  const style = window.getComputedStyle(el);
                  return style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         (el as HTMLElement).offsetWidth > 0 && 
                         (el as HTMLElement).offsetHeight > 0;
                };

                // Try each selector
                for (const selector of selectors) {
                  try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                      try {
                        if (!isVisible(element)) continue;
                        
                        const input = element as HTMLInputElement;
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Verify value was set
                        if (input.value === value) {
                          return { success: true, message: `Filled ${field} with selector ${selector}` };
                        }
                      } catch (e) {
                        // Continue if one fails
                      }
                    }
                  } catch (e) {
                    // Continue if selector fails
                  }
                }

                // If no success with direct selectors, try a more generic approach
                // Look for any input-like element that might be for this field
                const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
                for (const input of allInputs) {
                  try {
                    // Skip if not visible
                    if (!isVisible(input)) continue;
                    
                    // Look for clues in surrounding text that this might be the right field
                    const parentText = input.parentElement?.textContent?.toLowerCase() || '';
                    const grandparentText = input.parentElement?.parentElement?.textContent?.toLowerCase() || '';
                    
                    let isTargetField = false;
                    
                    // Check if this input might be for the field we're looking for
                    if (field === 'firstName' && (parentText.includes('first') || grandparentText.includes('first'))) {
                      isTargetField = true;
                    } else if (field === 'lastName' && (parentText.includes('last') || grandparentText.includes('last'))) {
                      isTargetField = true;
                    } else if (field === 'dateOfBirth' && (
                      parentText.includes('birth') || grandparentText.includes('birth') ||
                      parentText.includes('dob') || grandparentText.includes('dob')
                    )) {
                      isTargetField = true;
                    }
                    
                    if (isTargetField) {
                      (input as HTMLInputElement).value = value;
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                      return { success: true, message: `Filled ${field} using text context detection` };
                    }
                  } catch (e) {
                    // Continue to next input
                  }
                }
                
                return { success: false, message: `Could not find or fill ${field} field` };
              }, fieldName, formData[fieldName].toString(), selectors);
              
              if (jsResult && jsResult.success) {
                console.log(jsResult.message);
                fieldFilled = true;
              } else {
                console.log(`Field ${fieldName} not found on the page using any selector`);
              }
            }
          }
        }

        // After filling personal information form, find and click the Next/Continue button
        console.log('Looking for Next/Continue button to submit the form');
        const buttonSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button.submit-button',
          'button.next-button',
          'button.continue-button',
          'button:contains("Next")',
          'button:contains("Continue")',
          'button:contains("Submit")',
          'a.button:contains("Next")',
          'a.button:contains("Continue")',
          'a.button:contains("Submit")',
          '.btn:contains("Next")',
          '.btn:contains("Continue")',
          '.btn:contains("Submit")'
        ];

        // Try to find buttons matching these selectors
        const buttons = await page.evaluate((selectors) => {
          const allButtons: Array<{element: Element, text: string, isVisible: boolean, priority: number}> = [];
          
          // Find all button elements that match our selectors
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                // Check if the button is visible
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && 
                                  style.visibility !== 'hidden' && 
                                  (element as HTMLElement).offsetWidth > 0 && 
                                  (element as HTMLElement).offsetHeight > 0;
                
                const text = element.textContent?.trim() || '';
                let priority = 0;
                
                // Prioritize buttons with relevant text
                if (text.toLowerCase().includes('next')) priority += 10;
                if (text.toLowerCase().includes('continue')) priority += 8;
                if (text.toLowerCase().includes('submit')) priority += 6;
                if (element.getAttribute('type') === 'submit') priority += 5;
                if (element.classList.contains('primary')) priority += 3;
                if (element.classList.contains('submit')) priority += 3;
                if (element.classList.contains('next')) priority += 3;
                
                allButtons.push({element, text, isVisible, priority});
              });
            } catch (e) {
              // Continue if selector fails
            }
          });
          
          // Also find all generic buttons that might be submit buttons
          const allGenericButtons = document.querySelectorAll('button, input[type="submit"], a.button, .btn');
          allGenericButtons.forEach(element => {
            // Skip if we already have this element
            if (allButtons.some(btn => btn.element === element)) return;
            
            const style = window.getComputedStyle(element);
            const isVisible = style.display !== 'none' && 
                              style.visibility !== 'hidden' && 
                              (element as HTMLElement).offsetWidth > 0 && 
                              (element as HTMLElement).offsetHeight > 0;
            
            const text = element.textContent?.trim() || '';
            let priority = 0;
            
            // Check for text content to determine if this might be a submit button
            if (text.toLowerCase().includes('next')) priority += 10;
            if (text.toLowerCase().includes('continue')) priority += 8;
            if (text.toLowerCase().includes('submit')) priority += 6;
            if (element.getAttribute('type') === 'submit') priority += 5;
            
            allButtons.push({element, text, isVisible, priority});
          });
          
          // Return buttons in order of priority (highest first)
          return allButtons
            .filter(btn => btn.isVisible)
            .sort((a, b) => b.priority - a.priority)
            .map(btn => ({
              text: btn.text,
              tag: (btn.element as HTMLElement).tagName,
              id: btn.element.id || '',
              className: btn.element.className || '',
              type: btn.element.getAttribute('type') || '',
              priority: btn.priority
            }));
        }, buttonSelectors);
        
        console.log(`Found ${buttons.length} buttons with selector: button[type="submit"]`);
        
        for (const button of buttons) {
          console.log(`Attempting to click button: ${button.text}`);
          
          // Construct a selector for this specific button
          let buttonSelector = '';
          if (button.id) {
            buttonSelector = `#${button.id}`;
          } else if (button.text) {
            // Try to find button by its text content using a more reliable method
            try {
              // Look for buttons with matching text
              const buttons = await page.$$('button, input[type="submit"], a.button, .btn');
              
              for (const buttonElement of buttons) {
                const buttonText = await buttonElement.evaluate(el => el.textContent?.trim() || '');
                
                if (buttonText === button.text) {
                  // This is the button we want
                  await buttonElement.click();
                  console.log(`Found button with relevant text, prioritizing this one`);
                  
                  // Wait a moment to see if we navigate
                  await page.waitForNavigation({ timeout: 5000 }).catch(() => {
                    console.log('No navigation occurred, continuing...');
                  });
                  
                  // Take a screenshot after interaction
                  await page.screenshot({ path: path.join(config.screenshotsDir, `${taskId}_after_form_submit.png`), fullPage: true });
                  break;
                }
              }
            } catch (err) {
              console.log(`Direct button finding failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
              // Fall back to trying with a selector
              buttonSelector = `${button.tag}:contains("${button.text}")`;
            }
          } else {
            // Try a less specific selector
            buttonSelector = button.className ? `.${button.className.split(' ')[0]}` : button.tag;
          }
          
          // If we have a selector, try to click
          if (buttonSelector) {
            try {
              await page.evaluate((selector) => {
                try {
                  const el = document.querySelector(selector);
                  if (el) {
                    (el as HTMLElement).click();
                    return true;
                  }
                } catch (e) {
                  return false;
                }
                return false;
              }, buttonSelector);
              
              // Wait a moment to see if we navigate
              await page.waitForNavigation({ timeout: 5000 }).catch(() => {
                console.log('No navigation occurred, continuing...');
              });
              
              console.log(`Successfully clicked button with selector: ${buttonSelector}`);
              break;
            } catch (err) {
              console.log(`Failed to click button with selector ${buttonSelector}:`, err instanceof Error ? err.message : 'Unknown error');
            }
          }
        }
        
        // If no specific button worked, try a more generic approach
        if (buttons.length === 0) {
          console.log('No buttons found, trying generic form submission');
          
          // Try to submit the form directly
          const formSubmitted = await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            for (const form of forms) {
              try {
                form.submit();
                return true;
              } catch (e) {
                // Continue if one fails
              }
            }
            return false;
          });
          
          if (formSubmitted) {
            console.log('Successfully submitted form directly');
            
            // Wait for navigation
            await page.waitForNavigation({ timeout: 5000 }).catch(() => {
              console.log('No navigation occurred after form submission');
            });
          } else {
            console.log('Could not find or submit any forms');
          }
        }
      } else {
        // Default behavior - fill in all form fields with the provided data
        console.log('Using general form filling for miscellaneous fields');
        
        for (const [fieldName, value] of Object.entries(formData)) {
          if (!value) continue; // Skip empty values
          
          console.log(`Filling field ${fieldName} with value ${value}`);
          
          try {
            // Handle different input types
            const fieldSelectors = [
              `[name="${fieldName}"]`, 
              `#${fieldName}`,
              `[aria-label="${fieldName}"]`,
              `[data-field-name="${fieldName}"]`
            ];
            
            let fieldElement = null;
            
            // Try each selector until we find the element
            for (const selector of fieldSelectors) {
              const element = await page.$(selector);
              if (element) {
                fieldElement = element;
                console.log(`Found field using selector: ${selector}`);
                break;
              }
            }
            
            if (fieldElement) {
              // Scroll element into view
              await fieldElement.evaluate((el: Element) => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));
              
              // Check the element type
              const tagName = await page.evaluate((el: Element) => el.tagName.toLowerCase(), fieldElement);
              
              // For select elements, use the select method
              if (tagName === 'select') {
                console.log(`Selecting option ${value} for field ${fieldName}`);
                await page.select(`select[name="${fieldName}"], select#${fieldName}`, value.toString());
              } 
              // For checkboxes and radio buttons
              else if (await page.evaluate((el: Element) => {
                return el.tagName.toLowerCase() === 'input' && 
                      (el.getAttribute('type') === 'checkbox' || el.getAttribute('type') === 'radio');
              }, fieldElement)) {
                console.log(`Setting checkbox/radio button ${fieldName} to ${value}`);
                
                // Get current checkbox state
                const isChecked = await page.evaluate((el: Element) => {
                  return (el as HTMLInputElement).checked;
                }, fieldElement);
                
                // Only click if we need to change the state
                if ((value && !isChecked) || (!value && isChecked)) {
                  try {
                    await fieldElement.click();
                  } catch (clickError) {
                    console.log(`Could not click checkbox directly, trying JavaScript click`);
                    // Try JavaScript click as fallback
                    await page.evaluate((selector) => {
                      const elem = document.querySelector(selector);
                      if (elem) (elem as HTMLElement).click();
                    }, fieldSelectors[0]);
                  }
                }
              } 
              // For text inputs, textareas, etc.
              else {
                try {
                  // For text inputs, first clear the field
                  await fieldElement.click({ clickCount: 3 }); // Select all text
                  await fieldElement.press('Backspace'); // Delete it
                  await fieldElement.type(value.toString());
                } catch (inputError) {
                  console.log(`Could not interact with field normally, trying JavaScript approach`);
                  // Try JavaScript approach as fallback
                  await page.evaluate((selector, val) => {
                    const elem = document.querySelector(selector);
                    if (elem) {
                      (elem as HTMLInputElement).value = val;
                      // Trigger input and change events
                      elem.dispatchEvent(new Event('input', { bubbles: true }));
                      elem.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }, fieldSelectors[0], value.toString());
                }
              }
            } else {
              console.warn(`Field ${fieldName} not found on the page using any selector`);
            }
          } catch (fieldError) {
            console.warn(`Error filling field ${fieldName}: ${fieldError instanceof Error ? fieldError.message : 'Unknown error'}`);
          }
        }
      }
      
      // Take screenshot after filling form
      const afterFillScreenshot = path.join(config.screenshotsDir, `${taskId}_after_fill_step${taskState.currentStep}.png`);
      await page.screenshot({ path: afterFillScreenshot, fullPage: true });
      
      // Find and click the continue/submit button
      const submitButtonSelectors = [
        'button[type="submit"]', 
        'input[type="submit"]',
        'button.submit',
        'button.continue',
        'button.next-btn',
        'button.btn-primary',
        'a.btn-primary',
        '.btn-primary',
        'button:contains("Continue")',
        'button:contains("Next")',
        'button:contains("Submit")'
      ];
      
      let clicked = false;
      
      // Try each submit button selector
      for (const selector of submitButtonSelectors) {
        try {
          // Find all matching buttons
          const buttons = await page.$$(selector);
          console.log(`Found ${buttons.length} buttons with selector: ${selector}`);
          
          for (const button of buttons) {
            try {
              // Check if button is visible
              const isVisible = await button.evaluate((el: Element) => {
                const style = window.getComputedStyle(el);
                return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
              });
              
              if (isVisible) {
                // Get button text for logging
                const buttonText = await button.evaluate((el: Element) => el.textContent || 'No text');
                console.log(`Attempting to click button: ${buttonText}`);
                
                // Check if the button text contains continue/next/submit
                const hasRelevantText = await button.evaluate((el: Element) => {
                  const text = (el.textContent || '').toLowerCase().trim();
                  return text.includes('continue') || 
                         text.includes('next') || 
                         text.includes('submit') ||
                         text.includes('start');
                });
                
                if (hasRelevantText) {
                  console.log('Found button with relevant text, prioritizing this one');
                  
                  // Scroll button into view
                  await button.evaluate((el: Element) => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  });
                  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
                  
                  // Click the button
                  await Promise.race([
                    button.click().catch(e => console.log(`Direct click failed: ${e.message}`)),
                    button.evaluate(b => (b as HTMLElement).click()).catch(e => console.log(`JS click failed: ${e.message}`))
                  ]);
                  
                  clicked = true;
                  console.log(`Successfully clicked button with text: ${buttonText}`);
                  break;
                }
                
                // Otherwise save this button as a fallback option
                console.log(`Saving button as potential fallback option: ${buttonText}`);
              }
            } catch (buttonError) {
              console.log(`Could not click button: ${buttonError instanceof Error ? buttonError.message : 'Unknown error'}`);
            }
          }
          
          if (clicked) break;
        } catch (selectorError) {
          console.log(`Error with selector ${selector}: ${selectorError instanceof Error ? selectorError.message : 'Unknown error'}`);
        }
      }
      
      // If no button was clickable, try direct JavaScript evaluation
      if (!clicked) {
        console.log('Trying direct JavaScript evaluation to find and click submit button');
        
        clicked = await page.evaluate(() => {
          // Define button text patterns in priority order
          const buttonTexts = ['continue', 'next', 'submit', 'go', 'start my quote', 'get quote'];
          
          // Find all visible interactive elements
          const isVisible = (el: Element) => {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && 
                  style.visibility !== 'hidden' && 
                  style.opacity !== '0' &&
                  rect.width > 0 && 
                  rect.height > 0;
          };
          
          // Get all potentially clickable elements
          const allClickableElements = Array.from(document.querySelectorAll(
            'button, input[type="submit"], a.btn, .btn, .button, [role="button"], a[href]:not([href="#"])'
          )).filter(isVisible);
          
          console.log(`Found ${allClickableElements.length} visible clickable elements`);
          
          // Check for buttons with exact matching text first
          for (const text of buttonTexts) {
            for (const el of allClickableElements) {
              const buttonText = (el.textContent || '').toLowerCase().trim();
              if (buttonText === text) {
                console.log(`Clicking exact match button: "${buttonText}"`);
                (el as HTMLElement).click();
                return true;
              }
            }
          }
          
          // Then check for buttons containing the text
          for (const text of buttonTexts) {
            for (const el of allClickableElements) {
              const buttonText = (el.textContent || '').toLowerCase().trim();
              if (buttonText.includes(text)) {
                console.log(`Clicking button containing text: "${buttonText}"`);
                (el as HTMLElement).click();
                return true;
              }
            }
          }
          
          // Try to find buttons in specific areas of the page
          // 1. Bottom-right corner buttons are often "Continue" or "Next"
          const bottomRightElements = [...allClickableElements]
            .filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.bottom > window.innerHeight / 2 && rect.left > window.innerWidth / 2;
            })
            .sort((a, b) => {
              const rectA = a.getBoundingClientRect();
              const rectB = b.getBoundingClientRect();
              return rectB.bottom - rectA.bottom; // Sort by position from bottom
            });
          
          if (bottomRightElements.length > 0) {
            const el = bottomRightElements[0];
            console.log(`Clicking bottom-right positioned element: "${el.textContent || 'No text'}"`);
            (el as HTMLElement).click();
            return true;
          }
          
          // 2. Try buttons with relevant CSS classes
          const buttonWithClasses = allClickableElements.find(el => {
            const classes = Array.from(el.classList).join(' ').toLowerCase();
            return classes.includes('primary') || classes.includes('submit') || classes.includes('continue');
          });
          
          if (buttonWithClasses) {
            console.log(`Clicking button with relevant classes: "${buttonWithClasses.textContent || 'No text'}"`);
            (buttonWithClasses as HTMLElement).click();
            return true;
          }
          
          // 3. Last resort - try form submission
          const form = document.querySelector('form');
          if (form) {
            console.log('Submitting form directly');
            form.submit();
            return true;
          }
          
          console.log('Could not find any suitable button to click');
          return false;
        });
        
        if (clicked) {
          console.log('Successfully clicked button via JavaScript evaluation');
        } else {
          console.log('Failed to click any button via JavaScript');
          
          // As an absolute last resort, try pressing Enter
          console.log('Trying Enter key as last resort');
          await page.keyboard.press('Enter');
        }
      }
      
      // Take screenshot after clicking button
      const afterClickScreenshot = path.join(config.screenshotsDir, `${taskId}_after_click_step${taskState.currentStep}.png`);
      await page.screenshot({ path: afterClickScreenshot, fullPage: true });
      
      // Wait for navigation or new content to load
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        console.log('No navigation occurred, continuing...');
      });
      
      // Check if we've reached a quote page
      const isQuotePage = await page.evaluate(() => {
        // First check if we're still on a form page - if so, this is definitely NOT a quote page
        const formIndicators = [
          // Check for personal information form fields
          !!document.querySelector('input[name="firstName"], input[id="firstName"], input[placeholder*="First"]'),
          !!document.querySelector('input[name="lastName"], input[id="lastName"], input[placeholder*="Last"]'),
          !!document.querySelector('input[name="dateOfBirth"], input[id="dateOfBirth"], input[name="dob"], input[placeholder*="Birth"]'),
          
          // Check for text in labels or headers indicating form fields
          document.body.textContent?.includes('First Name'),
          document.body.textContent?.includes('Last Name'),
          document.body.textContent?.includes('Date of Birth'),
          document.body.textContent?.includes('DOB'),
          
          // Check for form elements
          document.querySelectorAll('form').length > 0 && document.querySelectorAll('input').length > 3,
          
          // Check if the page has "Next" buttons which typically indicate a form
          !!document.querySelector('button:not([disabled])'),

          // Check URL patterns for form pages
          window.location.href.includes('/quote/') && !window.location.href.includes('/quote-result'),
          window.location.href.includes('/applicant-info'),
          window.location.href.includes('/personal-info')
        ];
        
        // If ANY form indicators are true, this is probably not a quote page
        const isFormPage = formIndicators.some(indicator => indicator);
        
        if (isFormPage) {
          console.log('Page appears to be a form page, not a quote result');
          return false;
        }
        
        // Now check for actual quote result indicators
        const quoteIndicators = [
          // URL indicators specific to quote results
          window.location.href.includes('/quote-result'),
          window.location.href.includes('/quote/summary'),
          window.location.href.includes('/quote/details'),
          
          // Text content that strongly indicates quote results
          document.body.textContent?.includes('Your Quote Summary') || 
          document.body.textContent?.includes('Quote Summary') ||
          document.body.textContent?.includes('Quote Details') ||
          document.body.textContent?.includes('Your Rate') ||
          document.body.textContent?.includes('Your Premium'),
          
          // Price elements that would be on a quote page
          !!document.querySelector('.price, .premium, .amount, .rate, [data-amount], .quote-price'),
          
          // Quote-specific UI elements
          !!document.querySelector('.quote-summary, .quote-result, .policy-summary, .quote-details'),
          
          // Check for currency symbols near numbers which often indicate a price
          !!Array.from(document.querySelectorAll('*')).find(el => 
            el.textContent?.match(/\$\s*[\d,]+\.\d{2}/) &&
            !el.textContent?.includes('First Name') &&
            !el.textContent?.includes('Last Name')
          )
        ];
        
        console.log('Quote page detection indicators:', quoteIndicators);
        
        // Return true if ANY of the quote indicators are true AND we're not on a form page
        return quoteIndicators.some(indicator => indicator) && !isFormPage;
      });
      
      console.log(`Is quote result page: ${isQuotePage}`);
      
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
      console.log(`Task ${taskId} not found during cleanup, it may have already been cleaned up.`);
      return { success: true, message: `Task ${taskId} was already cleaned up or doesn't exist` };
    }
    
    // Close the browser if it exists
    if (activeTasks[taskId].browser) {
      try {
        await activeTasks[taskId].browser.close();
        console.log(`Browser for task ${taskId} closed successfully`);
      } catch (error) {
        console.error(`Error closing browser for task ${taskId}:`, error);
      }
    }
    
    // Remove the task from active tasks
    delete activeTasks[taskId];
    
    return { success: true, message: `Task ${taskId} cleaned up successfully` };
  }
}; 