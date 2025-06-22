/**
 * Test Email Service for handling email verification during carrier testing
 * 
 * This service provides utilities for:
 * - Generating valid test email addresses
 * - Handling email verification scenarios
 * - Bypassing email verification for testing purposes
 */

export interface TestEmailOptions {
  domain?: string;
  prefix?: string;
  includeTimestamp?: boolean;
  bypassVerification?: boolean;
}

export class TestEmailService {
  private static readonly DEFAULT_DOMAINS = [
    'gmail.com',
    'outlook.com', 
    'yahoo.com',
    'hotmail.com',
    'icloud.com'
  ];

  private static readonly TEST_DOMAINS = [
    'tempmail.io',
    '10minutemail.com',
    'guerrillamail.com',
    'maildrop.cc'
  ];

  /**
   * Generate a test email address for carrier testing
   */
  static generateTestEmail(options: TestEmailOptions = {}): string {
    const {
      domain = this.DEFAULT_DOMAINS[Math.floor(Math.random() * this.DEFAULT_DOMAINS.length)],
      prefix = 'test.user',
      includeTimestamp = true
    } = options;

    let emailPrefix = prefix;
    
    if (includeTimestamp) {
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits
      emailPrefix = `${prefix}.${timestamp}`;
    }

    return `${emailPrefix}@${domain}`;
  }

  /**
   * Generate a realistic test email for State Farm specifically
   */
  static generateStateFarmTestEmail(): string {
    const firstNames = ['michael', 'sarah', 'john', 'emma', 'david', 'lisa', 'robert', 'jennifer'];
    const lastNames = ['johnson', 'smith', 'brown', 'davis', 'wilson', 'miller', 'moore', 'taylor'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const year = Math.floor(Math.random() * 30) + 1985; // 1985-2014
    
    const domain = this.DEFAULT_DOMAINS[Math.floor(Math.random() * this.DEFAULT_DOMAINS.length)];
    
    return `${firstName}.${lastName}${year}@${domain}`;
  }

  /**
   * Get a disposable email for temporary testing
   */
  static generateDisposableEmail(): string {
    const domain = this.TEST_DOMAINS[Math.floor(Math.random() * this.TEST_DOMAINS.length)];
    const prefix = `test${Date.now().toString().slice(-6)}`;
    
    return `${prefix}@${domain}`;
  }

  /**
   * Check if an email domain is likely to pass validation
   */
  static isValidTestDomain(email: string): boolean {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Check against known working domains
    return this.DEFAULT_DOMAINS.includes(domain) || 
           this.TEST_DOMAINS.includes(domain) ||
           domain.endsWith('.com') || 
           domain.endsWith('.org') ||
           domain.endsWith('.net');
  }

  /**
   * Handle email verification bypass strategies
   */
  static getEmailVerificationBypassStrategies() {
    return {
      // Strategy 1: Use browser session storage to bypass verification
      sessionStorage: {
        name: 'Browser Session Storage',
        description: 'Store authenticated session state to skip email verification',
        implementation: 'Save browser context after successful verification'
      },
      
      // Strategy 2: Use known test email patterns
      testPatterns: {
        name: 'Test Email Patterns',
        description: 'Use email patterns known to work with carrier forms',
        implementation: 'Generate emails matching carrier validation rules'
      },
      
      // Strategy 3: Mock email verification endpoints
      mockEndpoints: {
        name: 'Mock Verification Endpoints',
        description: 'Intercept and mock email verification API calls',
        implementation: 'Use Playwright request interception'
      }
    };
  }

  /**
   * Create a complete test user profile with valid email
   */
  static generateTestUserProfile() {
    const email = this.generateStateFarmTestEmail();
    const [firstName, lastName] = email.split('@')[0].split('.');
    const year = email.match(/(\d{4})/)?.[1] || '1990';
    
    return {
      firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
      lastName: lastName.replace(/\d+/g, '').charAt(0).toUpperCase() + lastName.replace(/\d+/g, '').slice(1),
      email,
      dateOfBirth: `03-15-${year}`,
      phone: `555-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      streetAddress: '123 Main Street',
      city: 'Chicago', 
      state: 'IL',
      zipCode: '60601'
    };
  }
}

export const testEmailService = new TestEmailService(); 