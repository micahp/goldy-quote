export interface BaseHomePage {
  /** Optional: navigate to carrier homepage */
  gotoHome?(): Promise<void>;
  /** Perform any clicks to reach auto–insurance entry point */
  prepareAutoFlow(): Promise<void>;
  /** Type the ZIP / postal code */
  enterZip(zip: string): Promise<void>;
  /** Click the primary CTA to start the quote */
  submitQuote(): Promise<void>;
  /** Convenience helper that performs the entire sequence. */
  startQuote(zip: string): Promise<void>;
  waitForQuoteStep1?(): Promise<void>;
} 