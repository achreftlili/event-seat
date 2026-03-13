import { describe, it, expect } from 'vitest';
import { formatPrice, getTierLabel } from './pricing';

describe('formatPrice', () => {
  it('returns $150 for tier 1 (Premium)', () => {
    expect(formatPrice(1)).toBe('$150');
  });

  it('returns $100 for tier 2 (Standard Plus)', () => {
    expect(formatPrice(2)).toBe('$100');
  });

  it('returns $75 for tier 3 (Standard)', () => {
    expect(formatPrice(3)).toBe('$75');
  });

  it('returns $50 for tier 4 (Economy)', () => {
    expect(formatPrice(4)).toBe('$50');
  });

  it('returns $0 for unknown tier', () => {
    expect(formatPrice(99)).toBe('$0');
  });
});

describe('getTierLabel', () => {
  it('returns Premium for tier 1', () => {
    expect(getTierLabel(1)).toBe('Premium');
  });

  it('returns Standard Plus for tier 2', () => {
    expect(getTierLabel(2)).toBe('Standard Plus');
  });

  it('returns Standard for tier 3', () => {
    expect(getTierLabel(3)).toBe('Standard');
  });

  it('returns Economy for tier 4', () => {
    expect(getTierLabel(4)).toBe('Economy');
  });

  it('returns Unknown for invalid tier', () => {
    expect(getTierLabel(0)).toBe('Unknown');
    expect(getTierLabel(-1)).toBe('Unknown');
    expect(getTierLabel(5)).toBe('Unknown');
  });
});
