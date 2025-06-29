export interface BaseHomePage {
  gotoHome?(): Promise<void>;
  prepareAutoFlow(): Promise<void>;
  enterZip(zip: string): Promise<void>;
  submitQuote(): Promise<void>;
  startQuote(zip: string): Promise<void>;
  waitForQuoteStep1?(): Promise<void>;
} 