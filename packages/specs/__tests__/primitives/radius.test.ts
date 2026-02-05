import { describe, it, expect } from 'vitest';
import { radius, getRadiusToken } from '../../src/primitives/radius';

describe('Radius Tokens', () => {
  it('올바른 키-값 매핑', () => {
    expect(radius.none).toBe(0);
    expect(radius.sm).toBe(4);
    expect(radius.md).toBe(6);
    expect(radius.lg).toBe(8);
    expect(radius.xl).toBe(12);
    expect(radius.full).toBe(9999);
  });

  it('none은 0', () => {
    expect(radius.none).toBe(0);
  });

  it('full은 pill shape (9999)', () => {
    expect(radius.full).toBe(9999);
  });

  it('sm < md < lg < xl 순서', () => {
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
    expect(radius.lg).toBeLessThan(radius.xl);
  });

  describe('getRadiusToken', () => {
    it('올바른 값 반환', () => {
      expect(getRadiusToken('md')).toBe(6);
      expect(getRadiusToken('none')).toBe(0);
      expect(getRadiusToken('full')).toBe(9999);
    });
  });
});
