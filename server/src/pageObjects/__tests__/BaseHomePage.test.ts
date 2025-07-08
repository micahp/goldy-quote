import { describe, it, expect } from 'vitest';
import { BaseHomePage } from '../BaseHomePage.js';
import { ProgressiveHomePage } from '../ProgressiveHomePage.js';
import { StateFarmHomePage } from '../StateFarmHomePage.js';
import { GeicoHomePage } from '../GeicoHomePage.js';
import { LibertyMutualHomePage } from '../LibertyMutualHomePage.js';

describe('BaseHomePage Interface Compliance', () => {
  it('should have all page objects implement BaseHomePage interface', () => {
    // This test verifies that all page objects have the required methods
    // by checking their prototypes
    
    const requiredMethods = ['prepareAutoFlow', 'enterZip', 'submitQuote', 'startQuote'];
    const optionalMethods = ['gotoHome', 'waitForQuoteStep1'];
    
    const pageObjects = [
      ProgressiveHomePage,
      StateFarmHomePage, 
      GeicoHomePage,
      LibertyMutualHomePage
    ];
    
    pageObjects.forEach(PageObjectClass => {
      requiredMethods.forEach(method => {
        expect(PageObjectClass.prototype[method]).toBeDefined();
        expect(typeof PageObjectClass.prototype[method]).toBe('function');
      });
      
      // Optional methods should exist but may be no-op
      optionalMethods.forEach(method => {
        if (PageObjectClass.prototype[method]) {
          expect(typeof PageObjectClass.prototype[method]).toBe('function');
        }
      });
    });
  });

  it('should have consistent startQuote method signature', () => {
    const pageObjects = [
      ProgressiveHomePage,
      StateFarmHomePage,
      GeicoHomePage, 
      LibertyMutualHomePage
    ];
    
    pageObjects.forEach(PageObjectClass => {
      const startQuoteMethod = PageObjectClass.prototype.startQuote;
      expect(startQuoteMethod).toBeDefined();
      expect(startQuoteMethod.length).toBe(1); // Should accept one parameter (zip)
    });
  });
}); 