import { describe, it, expect } from 'vitest';
import { shadows, getShadowToken, parseShadow } from '../../src/primitives/shadows';
import type { ParsedShadow } from '../../src/primitives/shadows';

describe('Shadow Tokens', () => {
  it('7개 그림자 토큰 존재', () => {
    const keys = ['none', 'sm', 'md', 'lg', 'xl', 'inset', 'focus-ring'];
    for (const key of keys) {
      expect(shadows).toHaveProperty(key);
    }
  });

  it('none은 "none" 문자열', () => {
    expect(shadows.none).toBe('none');
  });

  it('sm은 유효한 box-shadow 문자열', () => {
    expect(shadows.sm).toContain('rgba');
  });

  describe('getShadowToken', () => {
    it('올바른 값 반환', () => {
      expect(getShadowToken('none')).toBe('none');
      expect(getShadowToken('md')).toBe(shadows.md);
      expect(getShadowToken('focus-ring')).toBe(shadows['focus-ring']);
    });
  });

  describe('parseShadow', () => {
    it('"none" → 빈 배열', () => {
      expect(parseShadow('none')).toEqual([]);
    });

    it('sm → 단일 그림자', () => {
      const result = parseShadow(shadows.sm);
      expect(result).toHaveLength(1);
      expect(result[0].offsetX).toBe(0);
      expect(result[0].offsetY).toBe(1);
      expect(result[0].blur).toBe(2);
      expect(result[0].spread).toBe(0);
      expect(result[0].inset).toBe(false);
    });

    it('md → 복합 그림자 (2개)', () => {
      const result = parseShadow(shadows.md);
      expect(result).toHaveLength(2);
      // 첫 번째: 0 4px 6px -1px
      expect(result[0].offsetX).toBe(0);
      expect(result[0].offsetY).toBe(4);
      expect(result[0].blur).toBe(6);
      expect(result[0].spread).toBe(-1);
      // 두 번째: 0 2px 4px -2px
      expect(result[1].offsetX).toBe(0);
      expect(result[1].offsetY).toBe(2);
      expect(result[1].blur).toBe(4);
      expect(result[1].spread).toBe(-2);
    });

    it('inset → inset 플래그 true', () => {
      const result = parseShadow(shadows.inset);
      expect(result).toHaveLength(1);
      expect(result[0].inset).toBe(true);
      expect(result[0].offsetX).toBe(0);
      expect(result[0].offsetY).toBe(2);
    });

    it('파싱 결과에 필수 필드 존재', () => {
      const result = parseShadow(shadows.sm);
      const shadow: ParsedShadow = result[0];
      expect(shadow).toHaveProperty('offsetX');
      expect(shadow).toHaveProperty('offsetY');
      expect(shadow).toHaveProperty('blur');
      expect(shadow).toHaveProperty('spread');
      expect(shadow).toHaveProperty('color');
      expect(shadow).toHaveProperty('alpha');
      expect(shadow).toHaveProperty('inset');
    });

    it('alpha 값 추출', () => {
      const result = parseShadow(shadows.sm);
      expect(result[0].alpha).toBe(0.05);
    });

    it('color에 rgba 포함', () => {
      const result = parseShadow(shadows.sm);
      expect(result[0].color).toContain('rgba');
    });
  });
});
