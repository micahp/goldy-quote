import { BrowserManager } from './dist/browser/BrowserManager.js';

async function fingerprintProgressive() {
  const manager = new BrowserManager();
  let page;
  
  try {
    console.log('🚀 Starting Progressive fingerprinting...');
    const taskId = 'progressive-fingerprint-' + Date.now();
    const browserInfo = await manager.getBrowserContext(taskId);
    page = browserInfo.page;
    
    // Set viewport and user agent with anti-detection
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'no-cache'
    });
    
    console.log('📄 Navigating to Progressive...');
    
    // Retry logic for navigation
    let navigationSuccess = false;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Navigation attempt ${attempt}/${maxRetries}...`);
        await page.goto('https://www.progressive.com', { 
          waitUntil: 'domcontentloaded', 
          timeout: 180000 // Increased to 3 minutes
        });
        navigationSuccess = true;
        break;
      } catch (error) {
        console.log(`⚠️ Navigation attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    if (!navigationSuccess) {
      throw new Error('Failed to navigate after all retries');
    }
    
    console.log('✅ Page loaded, title:', await page.title());
    console.log('🔗 Current URL:', page.url());
    
    // Take initial screenshot
    await page.screenshot({ path: 'progressive-homepage.png' });
    console.log('📸 Screenshot saved: progressive-homepage.png');
    
    // === STEP 1: Find quote entry points ===
    console.log('\n🔍 === STEP 1: Analyzing quote entry points ===');
    
    const quoteElements = await page.locator('a, button').evaluateAll(elements => 
      elements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('quote') || text.includes('get started') || text.includes('start');
      }).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        href: el.href || null,
        id: el.id || null,
        className: el.className || null,
        visible: el.offsetParent !== null
      }))
    );
    
    console.log('📋 Found quote entry elements:', JSON.stringify(quoteElements.slice(0, 5), null, 2));
    
    // === STEP 2: Try to start quote process ===
    console.log('\n🎯 === STEP 2: Starting quote process ===');
    
    try {
      // Look for auto insurance quote button
      const autoQuoteButton = await page.locator('a[href*="auto"], a:has-text("Auto"), button:has-text("Auto")').first();
      if (await autoQuoteButton.count() > 0) {
        console.log('🚗 Found auto insurance link, clicking...');
        await autoQuoteButton.click();
        await page.waitForLoadState('networkidle');
        console.log('🔗 Navigated to:', page.url());
        await page.screenshot({ path: 'progressive-auto-page.png' });
      }
      
      // Look for "Get Quote" or similar button
      const getQuoteSelectors = [
        'button:has-text("Get")',
        'a:has-text("Get")',
        'button:has-text("Start")',
        'a:has-text("Start")',
        '[data-testid*="quote"]',
        '.quote-button',
        '.get-quote'
      ];
      
      let quoteStarted = false;
      for (const selector of getQuoteSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0 && await element.isVisible()) {
            const text = await element.textContent();
            console.log(`🎯 Found quote button: "${text}" with selector: ${selector}`);
            await element.click();
            await page.waitForTimeout(3000);
            console.log('🔗 After click, URL:', page.url());
            await page.screenshot({ path: 'progressive-quote-started.png' });
            quoteStarted = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!quoteStarted) {
        console.log('⚠️ Could not find quote start button, exploring page...');
        
        // Look for ZIP code fields as alternative entry
        const zipSelectors = [
          'input[name*="zip"]',
          'input[placeholder*="ZIP"]',
          'input[id*="zip"]',
          'input[type="text"]'
        ];
        
        for (const selector of zipSelectors) {
          try {
            const zipField = page.locator(selector).first();
            if (await zipField.count() > 0 && await zipField.isVisible()) {
              console.log(`📮 Found ZIP field with selector: ${selector}`);
              await zipField.fill('94105');
              
              // Look for associated submit button
              const submitButton = page.locator('button[type="submit"], button:near(' + selector + ')').first();
              if (await submitButton.count() > 0) {
                console.log('▶️ Found submit button, clicking...');
                await submitButton.click();
                await page.waitForTimeout(3000);
                console.log('🔗 After submit, URL:', page.url());
                await page.screenshot({ path: 'progressive-zip-submitted.png' });
                quoteStarted = true;
                break;
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      }
      
    } catch (error) {
      console.log('⚠️ Error starting quote:', error.message);
    }
    
    // === STEP 3: Analyze current page structure ===
    console.log('\n📊 === STEP 3: Analyzing page structure ===');
    
    const pageAnalysis = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        id: form.id,
        className: form.className,
        fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
          type: field.type,
          name: field.name,
          id: field.id,
          placeholder: field.placeholder,
          required: field.required
        }))
      }));
      
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        required: input.required,
        value: input.value
      }));
      
      return {
        title: document.title,
        url: window.location.href,
        forms: forms.slice(0, 3),
        inputs: inputs.slice(0, 10),
        hasZipField: !!document.querySelector('input[name*="zip"], input[placeholder*="ZIP"], input[id*="zip"]'),
        hasStartButton: Array.from(document.querySelectorAll('button, a')).some(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('start') || text.includes('get');
        })
      };
    });
    
    console.log('📊 Page Analysis:', JSON.stringify(pageAnalysis, null, 2));
    
    // === STEP 4: Automated quote flow attempt ===
    console.log('\n🤖 === STEP 4: Automated quote flow ===');
    
    const urlHistory = [page.url()];
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`\n🔄 Attempt ${attempts}/${maxAttempts} to proceed with quote...`);
      
      try {
        // Fill common form fields with test data
        const testData = {
          'LastName': 'Smith',
          'EmailAddress': 'test@example.com',
          'dob': '01/01/1990',
          'ZipCode': '94105',
          'zipCode': '94105',
          'firstName': 'John',
          'FirstName': 'John'
        };
        
        // Try to fill any visible required fields
        for (const [fieldName, value] of Object.entries(testData)) {
          try {
            const selectors = [
              `input[name="${fieldName}"]`,
              `input[name*="${fieldName.toLowerCase()}"]`,
              `input[id*="${fieldName.toLowerCase()}"]`,
              `input[placeholder*="${fieldName}"]`
            ];
            
            for (const selector of selectors) {
              const field = page.locator(selector).first();
              if (await field.count() > 0 && await field.isVisible()) {
                console.log(`📝 Filling ${fieldName} with: ${value}`);
                await field.fill(value);
                await page.waitForTimeout(500);
                break;
              }
            }
          } catch (e) {
            // Continue to next field
          }
        }
        
        // Try to click any submit/continue button
        const buttonSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Get")',
          'button:has-text("Start")',
          'button:has-text("Continue")',
          'button:has-text("Next")',
          'a:has-text("Get")',
          'a:has-text("Start")',
          'a:has-text("Continue")'
        ];
        
        let buttonClicked = false;
        for (const selector of buttonSelectors) {
          try {
            const button = page.locator(selector).first();
            if (await button.count() > 0 && await button.isVisible()) {
              const text = await button.textContent();
              console.log(`🎯 Clicking button: "${text}" with selector: ${selector}`);
              
              await button.click();
              await page.waitForTimeout(3000);
              
              const newUrl = page.url();
              if (newUrl !== urlHistory[urlHistory.length - 1]) {
                console.log(`🔗 Navigated to: ${newUrl}`);
                urlHistory.push(newUrl);
                
                // Take screenshot
                const timestamp = Date.now();
                await page.screenshot({ path: `progressive-step-${attempts}-${timestamp}.png` });
                console.log(`📸 Screenshot saved: progressive-step-${attempts}-${timestamp}.png`);
                
                buttonClicked = true;
                break;
              }
            }
          } catch (e) {
            // Continue to next button selector
          }
        }
        
        if (!buttonClicked) {
          console.log('⚠️ No clickable buttons found, ending automation');
          break;
        }
        
        // Analyze current page
        const stepAnalysis = await page.evaluate(() => ({
          title: document.title,
          url: window.location.href,
          hasForm: !!document.querySelector('form'),
          formFields: Array.from(document.querySelectorAll('input, select, textarea')).map(field => ({
            type: field.type,
            name: field.name,
            placeholder: field.placeholder,
            required: field.required,
            visible: field.offsetParent !== null
          })).filter(field => field.visible).slice(0, 10)
        }));
        
        console.log(`📊 Current page analysis:`, JSON.stringify(stepAnalysis, null, 2));
        
      } catch (error) {
        console.log(`⚠️ Error in attempt ${attempts}:`, error.message);
        break;
      }
    }
    
    console.log('\n📋 === AUTOMATED FINGERPRINTING COMPLETE ===');
    console.log('🔗 URL History:', urlHistory);
    console.log('📁 Screenshots saved in server directory');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (page) {
      await page.screenshot({ path: 'progressive-final.png' });
    }
    await manager.cleanup();
    console.log('🔚 Browser closed');
  }
}

// Run the fingerprinting
fingerprintProgressive().catch(console.error); 