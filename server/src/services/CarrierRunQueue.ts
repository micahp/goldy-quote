/**
 * Serialises async work per key (one key per task+carrier browser page).
 *
 * Every carrier agent drives a single Playwright page, so two overlapping
 * `start`/`step` calls on the same page (e.g. the auto-advance after start
 * racing with step data posted from the form) interleave clicks and typing and
 * leave the carrier stuck. Different keys run fully in parallel, so one slow or
 * failing carrier never blocks the others.
 */
export class CarrierRunQueue {
  private tails = new Map<string, Promise<unknown>>();

  run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    // Run after the previous job settles, whether it succeeded or failed.
    const result = previous.then(work, work);
    const tail = result.catch(() => undefined);
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }

  get pendingKeys(): number {
    return this.tails.size;
  }
}

export const carrierRunQueue = new CarrierRunQueue();
