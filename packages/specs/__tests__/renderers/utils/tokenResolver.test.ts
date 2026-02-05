import { describe, it, expect, vi } from 'vitest';
import {
  resolveToken,
  resolveColor,
  tokenToCSSVar,
  resolveBoxShadow,
  hexStringToNumber,
} from '../../../src/renderers/utils/tokenResolver';
import type { TokenRef } from '../../../src/types/token.types';

describe('resolveToken', () => {
  describe('color 카테고리', () => {
    it('light 테마에서 올바른 색상 반환', () => {
      expect(resolveToken('{color.primary}' as TokenRef, 'light')).toBe('#6750a4');
    });

    it('dark 테마에서 올바른 색상 반환', () => {
      expect(resolveToken('{color.primary}' as TokenRef, 'dark')).toBe('#d0bcff');
    });

    it('on-primary 등 하이픈 포함 이름', () => {
      expect(resolveToken('{color.on-primary}' as TokenRef, 'light')).toBe('#ffffff');
    });
  });

  describe('spacing 카테고리', () => {
    it('올바른 값 반환', () => {
      expect(resolveToken('{spacing.md}' as TokenRef, 'light')).toBe(16);
    });
  });

  describe('typography 카테고리', () => {
    it('올바른 값 반환', () => {
      expect(resolveToken('{typography.text-sm}' as TokenRef, 'light')).toBe(14);
    });
  });

  describe('radius 카테고리', () => {
    it('올바른 값 반환', () => {
      expect(resolveToken('{radius.lg}' as TokenRef, 'light')).toBe(8);
    });
  });

  describe('shadow 카테고리', () => {
    it('올바른 값 반환', () => {
      const result = resolveToken('{shadow.md}' as TokenRef, 'light');
      expect(typeof result).toBe('string');
      expect(result).toContain('rgba');
    });
  });

  describe('무효한 입력', () => {
    it('잘못된 형식 → 원본 반환 + console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = resolveToken('invalid' as TokenRef, 'light');
      expect(result).toBe('invalid');
      expect(warnSpy).toHaveBeenCalledWith('Invalid token reference: invalid');
      warnSpy.mockRestore();
    });

    it('알 수 없는 카테고리 → 원본 반환 + console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = resolveToken('{unknown.value}' as TokenRef, 'light');
      expect(result).toBe('{unknown.value}');
      expect(warnSpy).toHaveBeenCalledWith('Unknown token category: unknown');
      warnSpy.mockRestore();
    });
  });

  it('테마 미지정 시 light 기본값', () => {
    expect(resolveToken('{color.primary}' as TokenRef)).toBe('#6750a4');
  });
});

describe('resolveColor', () => {
  it('TokenRef → 색상값 반환', () => {
    expect(resolveColor('{color.primary}' as TokenRef, 'light')).toBe('#6750a4');
  });

  it('직접 hex 문자열 → 그대로 반환', () => {
    expect(resolveColor('#ff0000', 'light')).toBe('#ff0000');
  });

  it('직접 숫자 → 그대로 반환', () => {
    expect(resolveColor(0xff0000, 'light')).toBe(0xff0000);
  });

  it('중괄호로 시작하지 않는 문자열 → 그대로 반환', () => {
    expect(resolveColor('rgb(255,0,0)', 'light')).toBe('rgb(255,0,0)');
  });
});

describe('tokenToCSSVar', () => {
  it('color → var(--name)', () => {
    expect(tokenToCSSVar('{color.primary}' as TokenRef)).toBe('var(--primary)');
    expect(tokenToCSSVar('{color.on-primary}' as TokenRef)).toBe('var(--on-primary)');
  });

  it('spacing → var(--spacing-name)', () => {
    expect(tokenToCSSVar('{spacing.md}' as TokenRef)).toBe('var(--spacing-md)');
  });

  it('typography → var(--name)', () => {
    expect(tokenToCSSVar('{typography.text-sm}' as TokenRef)).toBe('var(--text-sm)');
  });

  it('radius → var(--radius-name)', () => {
    expect(tokenToCSSVar('{radius.lg}' as TokenRef)).toBe('var(--radius-lg)');
  });

  it('shadow → var(--shadow-name)', () => {
    expect(tokenToCSSVar('{shadow.md}' as TokenRef)).toBe('var(--shadow-md)');
  });

  it('잘못된 형식 → 원본 반환', () => {
    expect(tokenToCSSVar('invalid' as TokenRef)).toBe('invalid');
  });
});

describe('resolveBoxShadow', () => {
  it('shadow 토큰 참조 → resolve된 값', () => {
    const result = resolveBoxShadow('{shadow.md}', 'light');
    expect(typeof result).toBe('string');
    expect(result).toContain('rgba');
  });

  it('직접 CSS 문자열 → 그대로 반환', () => {
    const css = '0 2px 4px rgba(0,0,0,0.1)';
    expect(resolveBoxShadow(css, 'light')).toBe(css);
  });

  it('{shadow.} 외 토큰 → 그대로 반환', () => {
    expect(resolveBoxShadow('none', 'light')).toBe('none');
  });
});

describe('hexStringToNumber', () => {
  it('#hex → 숫자', () => {
    expect(hexStringToNumber('#ff0000')).toBe(0xff0000);
    expect(hexStringToNumber('#6750a4')).toBe(0x6750a4);
  });

  it('0xhex → 숫자', () => {
    expect(hexStringToNumber('0xff0000')).toBe(0xff0000);
  });

  it('기타 형식 → 0x000000 폴백', () => {
    expect(hexStringToNumber('rgb(255,0,0)')).toBe(0x000000);
  });
});
