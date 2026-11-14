import { describe, it, expect } from 'vitest';
import {
  validateShortfallAllocations,
} from './shortfall-allocation';

describe('shortfall-allocation in @money-matters/types', () => {
  describe('validateShortfallAllocations', () => {
    it('is valid when there is no shortfall', () => {
      const res = validateShortfallAllocations(0, {});
      expect(res.isValid).toBe(true);
      expect(res.hasShortfall).toBe(false);
      expect(res.isOverAllocated).toBe(false);
      expect(res.isUnderAllocated).toBe(false);
    });

    it('is valid when total allocated exactly matches shortfall', () => {
      const res = validateShortfallAllocations(75.5, {
        p1: '50.00',
        p2: '25.50',
      });
      expect(res.isValid).toBe(true);
      expect(res.isOverAllocated).toBe(false);
      expect(res.isUnderAllocated).toBe(false);
      expect(res.difference).toBe(0);
    });

    it('flags over-allocation when total exceeds shortfall', () => {
      const res = validateShortfallAllocations(50, {
        p1: '40.00',
        p2: '20.00',
      });
      expect(res.isValid).toBe(false);
      expect(res.isOverAllocated).toBe(true);
      expect(res.isUnderAllocated).toBe(false);
      expect(res.difference).toBe(10);
    });

    it('flags under-allocation when total is less than shortfall', () => {
      const res = validateShortfallAllocations(50, {
        p1: '30.00',
      });
      expect(res.isValid).toBe(false);
      expect(res.isOverAllocated).toBe(false);
      expect(res.isUnderAllocated).toBe(true);
      expect(res.difference).toBe(20);
    });
  });
});
