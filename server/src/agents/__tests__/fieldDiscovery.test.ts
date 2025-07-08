import { describe, it, expect } from 'vitest';
import { identifyFieldByPurpose, matchesAttributePattern } from '../helpers/fieldDiscovery.js';

describe('fieldDiscovery helpers', () => {
  it('matchesAttributePattern supports *= and =', () => {
    const attrs = { name: 'emailAddress', type: 'email' } as Record<string, any>;
    expect(matchesAttributePattern(attrs, 'name*=email')).toBe(true);
    expect(matchesAttributePattern(attrs, 'type=email')).toBe(true);
    expect(matchesAttributePattern(attrs, 'id=email')).toBe(false);
  });

  it('identifyFieldByPurpose detects street input', () => {
    const snapshotEl = {
      tag: 'input',
      attributes: { name: 'streetAddress', id: 'streetAddress' },
      text: '',
      ref: 'streetAddress',
    };
    const selector = identifyFieldByPurpose(snapshotEl, 'street');
    expect(selector).toContain('[name');
  });
}); 