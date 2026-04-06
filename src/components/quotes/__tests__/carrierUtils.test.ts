import { describe, it, expect } from 'vitest';
import { normalizeCarrierId } from '../carrierUtils';

describe('normalizeCarrierId', () => {
  it('normalizes known carrier display names', () => {
    expect(normalizeCarrierId('GEICO')).toBe('geico');
    expect(normalizeCarrierId('Progressive')).toBe('progressive');
    expect(normalizeCarrierId('State Farm')).toBe('statefarm');
    expect(normalizeCarrierId('Liberty Mutual')).toBe('libertymutual');
  });

  it('handles compact carrier names and whitespace', () => {
    expect(normalizeCarrierId(' statefarm ')).toBe('statefarm');
    expect(normalizeCarrierId('libertymutual')).toBe('libertymutual');
    expect(normalizeCarrierId('Some Carrier')).toBe('somecarrier');
  });
});
