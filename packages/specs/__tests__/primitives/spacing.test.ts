import { describe, it, expect } from 'vitest';
import { spacing, getSpacingToken } from '../../src/primitives/spacing';

describe('Spacing Tokens', () => {
  it('올바른 키-값 매핑', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing['2xl']).toBe(48);
  });

  it('모든 값이 양수', () => {
    for (const value of Object.values(spacing)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('값이 증가하는 순서', () => {
    const values = [spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl, spacing['2xl']];
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  describe('getSpacingToken', () => {
    it('올바른 값 반환', () => {
      expect(getSpacingToken('md')).toBe(16);
      expect(getSpacingToken('xs')).toBe(4);
      expect(getSpacingToken('2xl')).toBe(48);
    });
  });
});
