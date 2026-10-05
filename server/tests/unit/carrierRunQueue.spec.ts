import { test, expect } from '@playwright/test';
import { CarrierRunQueue } from '../../src/services/CarrierRunQueue.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('CarrierRunQueue', () => {
  test('never overlaps jobs for the same carrier page', async () => {
    const queue = new CarrierRunQueue();
    let active = 0;
    let maxActive = 0;
    const order: string[] = [];

    const job = (name: string, ms: number) => () =>
      (async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await sleep(ms);
        order.push(name);
        active--;
      })();

    await Promise.all([
      queue.run('t_geico', job('start', 30)),
      queue.run('t_geico', job('advance', 5)),
      queue.run('t_geico', job('step1', 1)),
    ]);

    expect(maxActive).toBe(1);
    expect(order).toEqual(['start', 'advance', 'step1']);
  });

  test('runs different carriers in parallel', async () => {
    const queue = new CarrierRunQueue();
    let active = 0;
    let maxActive = 0;
    const job = () => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await sleep(30);
      active--;
    };

    await Promise.all(
      ['geico', 'progressive', 'statefarm', 'libertymutual'].map((c) => queue.run(`t_${c}`, job())),
    );

    expect(maxActive).toBe(4);
  });

  test('a failing job does not block or poison the next one', async () => {
    const queue = new CarrierRunQueue();
    const failed = queue.run('t_statefarm', async () => {
      throw new Error('boom');
    });
    const next = queue.run('t_statefarm', async () => 'ok');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });

  test('releases bookkeeping once idle', async () => {
    const queue = new CarrierRunQueue();
    await queue.run('t_a', async () => 1);
    await sleep(0);
    expect(queue.pendingKeys).toBe(0);
  });
});
