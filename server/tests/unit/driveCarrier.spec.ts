import { test, expect } from '@playwright/test';
import { carrierAgents } from '../../src/agents/index.js';
import { TaskManager } from '../../src/services/TaskManager.js';

type Page = { label: string; result: any };

// Fake agent: each step() call serves the next scripted "page".
function fakeAgent(pages: Page[], opts: { startError?: string } = {}) {
  let step = 0;
  let currentStep = 0;
  let status: any = 'initializing';
  let error: string | undefined;
  let label = 'start';
  const calls = { start: 0, step: 0, failed: [] as string[] };
  return {
    calls,
    name: 'fake',
    start: async () => {
      calls.start++;
      if (opts.startError) return { status: 'error', error: opts.startError };
      status = 'waiting_for_input';
      return { status };
    },
    step: async () => {
      calls.step++;
      const page = pages[Math.min(step, pages.length - 1)];
      step++;
      if (page.result.advance !== false) {
        label = page.label;
        currentStep++;
      }
      status = page.result.status === 'error' ? 'error' : page.result.status;
      return page.result;
    },
    status: async () => ({ status, currentStep, currentStepLabel: label, lastActivity: new Date(), error }),
    progressMarker: async () => `${currentStep}:${label}`,
    markWaiting: () => { status = 'waiting_for_input'; },
    markFailed: (_id: string, message: string) => {
      status = 'error';
      error = message;
      calls.failed.push(message);
    },
    cleanup: async () => ({ success: true }),
  };
}

async function run(agent: any, userData: Record<string, any> = { zipCode: '55330', insuranceType: 'auto' }, opts: { skipDrive?: boolean } = {}) {
  (carrierAgents as any).geico = agent;
  const tm = TaskManager.getInstance();
  const events: any[] = [];
  tm.setBroadcastFunction((m: any) => events.push(m));
  const { taskId } = await tm.startMultiCarrierTask([], userData);
  await tm.startCarrierAgent(taskId, 'geico');
  if (!opts.skipDrive) await tm.driveCarrier(taskId, 'geico');
  return { tm, taskId, events };
}

test.describe('TaskManager.driveCarrier', () => {
  test('walks every page with accumulated data until a quote', async () => {
    const quote = { carrier: 'geico', premium: 100 };
    const agent = fakeAgent([
      { label: 'personal', result: { status: 'waiting_for_input', requiredFields: {} } },
      { label: 'vehicle', result: { status: 'waiting_for_input', requiredFields: {} } },
      { label: 'done', result: { status: 'completed', quote } },
    ]);
    const { events } = await run(agent);
    expect(agent.calls.step).toBe(3);
    expect(events.find((e) => e.type === 'quote_completed')?.quote).toEqual(quote);
    expect(agent.calls.failed).toEqual([]);
  });

  test('a failed start is reported and never auto-advanced', async () => {
    const agent = fakeAgent([{ label: 'x', result: { status: 'waiting_for_input' } }], { startError: 'selector gone' });
    const { events } = await run(agent);
    expect(agent.calls.step).toBe(0);
    expect(agent.calls.failed).toEqual(['selector gone']);
    expect(events.some((e) => e.type === 'carrier_error' && e.error === 'selector gone')).toBe(true);
  });

  test('fails loudly when the page does not advance', async () => {
    const agent = fakeAgent([{ label: 'personal', result: { status: 'waiting_for_input', requiredFields: {}, advance: false } }]);
    const { tm, taskId } = await run(agent);
    expect(agent.calls.failed[0]).toMatch(/No progress/);
    // Posting more data must not flip a failed carrier back to processing.
    tm.updateUserData(taskId, { firstName: 'A' });
    const before = agent.calls.step;
    await tm.driveCarrier(taskId, 'geico');
    expect(agent.calls.step).toBe(before);
  });

  test('waits (does not fail) when required fields are still missing', async () => {
    const agent = fakeAgent([
      { label: 'personal', result: { status: 'waiting_for_input', requiredFields: { firstName: { required: true } }, advance: false } },
    ]);
    await run(agent);
    expect(agent.calls.failed).toEqual([]);
  });

  test('a missing-data error pauses the carrier instead of failing it', async () => {
    const agent = fakeAgent([{ label: 'personal', result: { status: 'error', error: 'Missing data: First name' } }]);
    const { events } = await run(agent);
    expect(agent.calls.failed).toEqual([]);
    expect(events.some((e) => e.type === 'carrier_error')).toBe(false);
  });

  test('does not step a carrier right after start (no data yet)', async () => {
    const agent = fakeAgent([{ label: 'personal', result: { status: 'waiting_for_input' } }]);
    await run(agent, undefined, { skipDrive: true });
    expect(agent.calls.start).toBe(1);
    expect(agent.calls.step).toBe(0);
  });

  test('an error response marks the carrier failed with its message', async () => {
    const agent = fakeAgent([{ label: 'personal', result: { status: 'error', error: 'Could not fill First name' } }]);
    const { events } = await run(agent);
    expect(agent.calls.failed).toEqual(['Could not fill First name']);
    expect(events.some((e) => e.type === 'carrier_error')).toBe(true);
  });
});
