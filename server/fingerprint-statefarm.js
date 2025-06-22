import { BrowserManager } from './dist/browser/BrowserManager.js';

async function fingerprintStateFarm() {
  const manager = new BrowserManager();
  let page;
  
  try {
    console.log('🚀 Starting State Farm fingerprinting...');
    const taskId = 'statefarm-fingerprint-' + Date.now();
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
    
    console.log('📄 Navigating to State Farm...');
    
    // Retry logic for navigation
    let navigationSuccess = false;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Navigation attempt ${attempt}/${maxRetries}...`);
        await page.goto('https://www.statefarm.com', { 
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
    await page.screenshot({ path: 'statefarm-homepage.png' });
    console.log('📸 Screenshot saved: statefarm-homepage.png');
    
    // === STEP 1: Find quote entry points ===
    console.log('\n🔍 === STEP 1: Analyzing quote entry points ===');
    
    const quoteElements = await page.locator('a, button').evaluateAll(elements => 
      elements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('quote') || text.includes('get started') || text.includes('start') || text.includes('auto');
      }).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        href: el.href || null,
        id: el.id || null,
        className: el.className || null,
        visible: el.offsetParent !== null
      }))
    );
    
    console.log('📋 Found quote entry elements:', JSON.stringify(quoteElements.slice(0, 8), null, 2));
    
    // === STEP 2: Try to start quote process ===
    console.log('\n🎯 === STEP 2: Starting quote process ===');
    
    try {
      // State Farm specific navigation patterns
      const autoInsuranceSelectors = [
        'a[href*="auto"]',
        'a:has-text("Auto")',
        'button:has-text("Auto")',
        'nav a:has-text("Insurance")',
        '.auto-insurance',
        '[data-track*="auto"]'
      ];
      
      let navigatedToAuto = false;
      for (const selector of autoInsuranceSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0 && await element.isVisible()) {
            const text = await element.textContent();
            console.log(`🚗 Found auto insurance link: "${text}" with selector: ${selector}`);
            await element.click();
            await page.waitForLoadState('networkidle');
            console.log('🔗 Navigated to:', page.url());
            await page.screenshot({ path: 'statefarm-auto-page.png' });
            navigatedToAuto = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Look for "Get Quote", "Start Quote", etc.
      const getQuoteSelectors = [
        'button:has-text("Get")',
        'a:has-text("Get")',
        'button:has-text("Start")',
        'a:has-text("Start")',
        'button:has-text("Quote")',
        'a:has-text("Quote")',
        '[data-testid*="quote"]',
        '.quote-button',
        '.get-quote',
        '.start-quote'
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
            await page.screenshot({ path: 'statefarm-quote-started.png' });
            quoteStarted = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!quoteStarted) {
        console.log('⚠️ Could not find quote start button, looking for ZIP code entry...');
        
        // Look for ZIP code fields as alternative entry
        const zipSelectors = [
          'input[name*="zip"]',
          'input[placeholder*="ZIP"]',
          'input[placeholder*="zip"]',
          'input[id*="zip"]',
          'input[type="text"][placeholder*="postal"]',
          'input[aria-label*="zip"]'
        ];
        
        for (const selector of zipSelectors) {
          try {
            const zipField = page.locator(selector).first();
            if (await zipField.count() > 0 && await zipField.isVisible()) {
              console.log(`📮 Found ZIP field with selector: ${selector}`);
              await zipField.fill('94105');
              
              // Look for associated submit button
              const submitSelectors = [
                'button[type="submit"]',
                'button:near(' + selector + ')',
                'input[type="submit"]',
                'button:has-text("Go")',
                'button:has-text("Continue")',
                'button:has-text("Start")'
              ];
              
              for (const submitSelector of submitSelectors) {
                try {
                  const submitButton = page.locator(submitSelector).first();
                  if (await submitButton.count() > 0 && await submitButton.isVisible()) {
                    console.log(`▶️ Found submit button with selector: ${submitSelector}`);
                    await submitButton.click();
                    await page.waitForTimeout(3000);
                    console.log('🔗 After submit, URL:', page.url());
                    await page.screenshot({ path: 'statefarm-zip-submitted.png' });
                    quoteStarted = true;
                    break;
                  }
                } catch (e) {
                  // Continue to next submit selector
                }
              }
              
              if (quoteStarted) break;
            }
          } catch (e) {
            // Continue to next ZIP selector
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
          required: field.required,
          ariaLabel: field.getAttribute('aria-label')
        }))
      }));
      
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        required: input.required,
        value: input.value,
        ariaLabel: input.getAttribute('aria-label')
      }));
      
      return {
        title: document.title,
        url: window.location.href,
        forms: forms.slice(0, 3),
        inputs: inputs.slice(0, 15),
        hasZipField: !!document.querySelector('input[name*="zip"], input[placeholder*="ZIP"], input[id*="zip"]'),
        hasStartButton: Array.from(document.querySelectorAll('button, a')).some(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('start') || text.includes('get');
        }),
        bodyClasses: document.body.className,
        headingTexts: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).slice(0, 5)
      };
    });
    
    console.log('📊 Page Analysis:', JSON.stringify(pageAnalysis, null, 2));
    
    // === STEP 4: Manual exploration time ===
    console.log('\n👁️  === STEP 4: Manual exploration phase ===');
    console.log('🌐 Browser is open for manual exploration.');
    console.log('📝 Please manually navigate through State Farm\'s quote flow');
    console.log('📸 Screenshots will be saved automatically');
    console.log('⏰ Browser will stay open for 10 minutes...');
    
    // Monitor URL changes and form submissions
    let lastUrl = page.url();
    const urlHistory = [lastUrl];
    const screenshots = [];
    
    const checkUrlChange = setInterval(async () => {
      try {
        const currentUrl = page.url();
        if (currentUrl !== lastUrl) {
          console.log(`🔄 URL changed: ${currentUrl}`);
          urlHistory.push(currentUrl);
          lastUrl = currentUrl;
          
          // Take screenshot on URL change
          const timestamp = Date.now();
          const screenshotPath = `statefarm-step-${timestamp}.png`;
          await page.screenshot({ path: screenshotPath });
          screenshots.push(screenshotPath);
          console.log(`📸 Screenshot saved: ${screenshotPath}`);
          
          // Analyze new page
          const stepAnalysis = await page.evaluate(() => ({
            title: document.title,
            url: window.location.href,
            hasForm: !!document.querySelector('form'),
            formFields: Array.from(document.querySelectorAll('input, select, textarea')).map(field => ({
              type: field.type,
              name: field.name,
              placeholder: field.placeholder,
              required: field.required,
              ariaLabel: field.getAttribute('aria-label'),
              id: field.id
            })).slice(0, 15),
            mainHeading: document.querySelector('h1')?.textContent?.trim(),
            progressIndicators: Array.from(document.querySelectorAll('[class*="progress"], [class*="step"], [data-step]')).map(el => ({
              text: el.textContent?.trim(),
              className: el.className
            })).slice(0, 5)
          }));
          
          console.log(`📊 Step Analysis:`, JSON.stringify(stepAnalysis, null, 2));
        }
      } catch (e) {
        console.log('⚠️ Error monitoring URL changes:', e.message);
      }
    }, 2000);
    
    // Wait for manual exploration
    await page.waitForTimeout(600000); // 10 minutes
    clearInterval(checkUrlChange);
    
    console.log('\n📋 === STATE FARM FINGERPRINTING COMPLETE ===');
    console.log('🔗 URL History:', urlHistory);
    console.log('📸 Screenshots saved:', screenshots);
    console.log('📁 All files saved in server directory');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (page) {
      await page.screenshot({ path: 'statefarm-final.png' });
    }
    await manager.cleanup();
    console.log('🔚 Browser closed');
  }
}

// Run the fingerprinting
fingerprintStateFarm().catch(console.error); 