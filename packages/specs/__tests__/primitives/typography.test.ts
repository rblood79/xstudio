import { describe, it, expect } from 'vitest';
import { typography, fontFamily, fontWeight, lineHeight, getTypographyToken } from '../../src/primitives/typography';

describe('Typography Tokens', () => {
  describe('typography (font sizes)', () => {
    it('올바른 키-값 매핑', () => {
      expect(typography['text-xs']).toBe(12);
      expect(typography['text-sm']).toBe(14);
      expect(typography['text-md']).toBe(16);
      expect(typography['text-lg']).toBe(18);
      expect(typography['text-xl']).toBe(20);
      expect(typography['text-2xl']).toBe(24);
    });

    it('값이 증가하는 순서', () => {
      const values = [
        typography['text-xs'], typography['text-sm'], typography['text-md'],
        typography['text-lg'], typography['text-xl'], typography['text-2xl'],
      ];
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe('fontFamily', () => {
    it('sans와 mono 패밀리 존재', () => {
      expect(fontFamily.sans).toBeDefined();
      expect(fontFamily.mono).toBeDefined();
    });

    it('sans에 Pretendard 포함', () => {
      expect(fontFamily.sans).toContain('Pretendard');
    });

    it('mono에 JetBrains Mono 포함', () => {
      expect(fontFamily.mono).toContain('JetBrains Mono');
    });
  });

  describe('fontWeight', () => {
    it('4단계 두께 정의', () => {
      expect(fontWeight.normal).toBe(400);
      expect(fontWeight.medium).toBe(500);
      expect(fontWeight.semibold).toBe(600);
      expect(fontWeight.bold).toBe(700);
    });
  });

  describe('lineHeight', () => {
    it('3단계 줄 높이 정의', () => {
      expect(lineHeight.tight).toBe(1.25);
      expect(lineHeight.normal).toBe(1.5);
      expect(lineHeight.relaxed).toBe(1.75);
    });
  });

  describe('getTypographyToken', () => {
    it('올바른 값 반환', () => {
      expect(getTypographyToken('text-md')).toBe(16);
      expect(getTypographyToken('text-xs')).toBe(12);
    });
  });
});
