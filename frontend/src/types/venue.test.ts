import { describe, it, expect } from 'vitest';
import { PRICE_TIERS, STATUS_COLORS } from './venue';

describe('venue constants', () => {
  describe('PRICE_TIERS', () => {
    it('has 4 tiers', () => {
      expect(Object.keys(PRICE_TIERS)).toHaveLength(4);
    });

    it('tier 1 is the most expensive', () => {
      expect(PRICE_TIERS[1]).toBeGreaterThan(PRICE_TIERS[2]);
      expect(PRICE_TIERS[2]).toBeGreaterThan(PRICE_TIERS[3]);
      expect(PRICE_TIERS[3]).toBeGreaterThan(PRICE_TIERS[4]);
    });

    it('all prices are positive numbers', () => {
      for (const price of Object.values(PRICE_TIERS)) {
        expect(price).toBeGreaterThan(0);
      }
    });
  });

  describe('STATUS_COLORS', () => {
    it('has colors for all 4 statuses', () => {
      expect(STATUS_COLORS).toHaveProperty('available');
      expect(STATUS_COLORS).toHaveProperty('reserved');
      expect(STATUS_COLORS).toHaveProperty('sold');
      expect(STATUS_COLORS).toHaveProperty('held');
    });

    it('each color is a valid hex string', () => {
      for (const color of Object.values(STATUS_COLORS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('each status has a unique color', () => {
      const colors = Object.values(STATUS_COLORS);
      expect(new Set(colors).size).toBe(colors.length);
    });
  });
});
