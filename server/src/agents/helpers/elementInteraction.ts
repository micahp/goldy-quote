import { Page } from 'playwright';

export async function waitForElementVisible(
  agentName: string,
  page: Page,
  selector: string,
  timeout: number = 10000,
): Promise<void> {
  console.log(`[${agentName}] Waiting for element to be visible: ${selector}`);
  await page.locator(selector).first().waitFor({ state: 'visible', timeout });
}

export async function waitForElementAttached(
  agentName: string,
  page: Page,
  selector: string,
  timeout: number = 10000,
): Promise<void> {
  console.log(`[${agentName}] Waiting for element to be attached: ${selector}`);
  await page.locator(selector).first().waitFor({ state: 'attached', timeout });
}

export interface ClickOptions { timeout?: number; force?: boolean }
export async function safeClick(
  agentName: string,
  page: Page,
  selector: string,
  options: ClickOptions = {},
): Promise<void> {
  const timeout = options.timeout ?? 10000;
  console.log(`[${agentName}] Safe clicking element: ${selector}`);
  await waitForElementVisible(agentName, page, selector, timeout);
  await page.locator(selector).first().click({ timeout, force: options.force });
  console.log(`[${agentName}] Successfully clicked: ${selector}`);
}

export interface TypeOptions { timeout?: number; clear?: boolean }
export async function safeType(
  agentName: string,
  page: Page,
  selector: string,
  text: string,
  options: TypeOptions = {},
): Promise<void> {
  const timeout = options.timeout ?? 10000;
  console.log(`[${agentName}] Safe typing into element: ${selector}`);
  await waitForElementVisible(agentName, page, selector, timeout);
  const locator = page.locator(selector).first();
  if (options.clear !== false) {
    await locator.clear({ timeout });
  }
  await locator.fill(text, { timeout });
  console.log(`[${agentName}] Successfully typed into: ${selector}`);
} 