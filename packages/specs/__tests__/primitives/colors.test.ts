import { describe, it, expect } from 'vitest';
import { lightColors, darkColors, getColorToken, getColorTokens } from '../../src/primitives/colors';
import type { ColorTokens } from '../../src/types/token.types';

const ALL_COLOR_KEYS: (keyof ColorTokens)[] = [
  'primary', 'primary-hover', 'primary-pressed', 'on-primary',
  'secondary', 'secondary-hover', 'secondary-pressed', 'on-secondary',
  'tertiary', 'tertiary-hover', 'tertiary-pressed', 'on-tertiary',
  'error', 'error-hover', 'error-pressed', 'on-error',
  'surface', 'surface-container', 'surface-container-high', 'surface-container-highest', 'on-surface',
  'outline', 'outline-variant',
];

describe('Color Tokens', () => {
  describe('lightColors', () => {
    it('모든 ColorTokens 키를 포함해야 함', () => {
      for (const key of ALL_COLOR_KEYS) {
        expect(lightColors).toHaveProperty(key);
      }
    });

    it('모든 값이 유효한 hex 색상이어야 함', () => {
      for (const value of Object.values(lightColors)) {
        expect(value).toMatch(/^#[a-fA-F0-9]{6}$/);
      }
    });
  });

  describe('darkColors', () => {
    it('모든 ColorTokens 키를 포함해야 함', () => {
      for (const key of ALL_COLOR_KEYS) {
        expect(darkColors).toHaveProperty(key);
      }
    });

    it('모든 값이 유효한 hex 색상이어야 함', () => {
      for (const value of Object.values(darkColors)) {
        expect(value).toMatch(/^#[a-fA-F0-9]{6}$/);
      }
    });
  });

  it('light와 dark 테마가 동일한 키를 가져야 함', () => {
    const lightKeys = Object.keys(lightColors).sort();
    const darkKeys = Object.keys(darkColors).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  describe('getColorToken', () => {
    it('light 테마에서 올바른 색상 반환', () => {
      expect(getColorToken('primary', 'light')).toBe('#6750a4');
    });

    it('dark 테마에서 올바른 색상 반환', () => {
      expect(getColorToken('primary', 'dark')).toBe('#d0bcff');
    });

    it('테마 미지정 시 light 기본값', () => {
      expect(getColorToken('primary')).toBe('#6750a4');
    });
  });

  describe('getColorTokens', () => {
    it('light 테마 전체 반환', () => {
      expect(getColorTokens('light')).toBe(lightColors);
    });

    it('dark 테마 전체 반환', () => {
      expect(getColorTokens('dark')).toBe(darkColors);
    });

    it('테마 미지정 시 light 기본값', () => {
      expect(getColorTokens()).toBe(lightColors);
    });
  });
});
