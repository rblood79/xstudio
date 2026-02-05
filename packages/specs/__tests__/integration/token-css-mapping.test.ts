import { describe, it, expect } from 'vitest';
import { lightColors } from '../../src/primitives/colors';
import { spacing } from '../../src/primitives/spacing';
import { typography } from '../../src/primitives/typography';
import { radius } from '../../src/primitives/radius';
import { shadows } from '../../src/primitives/shadows';
import { resolveToken, tokenToCSSVar } from '../../src/renderers/utils/tokenResolver';
import type { TokenRef } from '../../src/types/token.types';

describe('토큰-CSS 변수 매핑 일관성', () => {
  describe('color 토큰', () => {
    const colorKeys = Object.keys(lightColors);

    it.each(colorKeys)('color.%s → 유효한 CSS var()', (key) => {
      const ref = `{color.${key}}` as TokenRef;
      const cssVar = tokenToCSSVar(ref);
      expect(cssVar).toMatch(/^var\(--[\w-]+\)$/);
    });

    it.each(colorKeys)('color.%s → resolve 결과가 프리미티브와 일치 (light)', (key) => {
      const ref = `{color.${key}}` as TokenRef;
      const resolved = resolveToken(ref, 'light');
      expect(resolved).toBe(lightColors[key as keyof typeof lightColors]);
    });
  });

  describe('spacing 토큰', () => {
    const spacingKeys = Object.keys(spacing);

    it.each(spacingKeys)('spacing.%s → 유효한 CSS var()', (key) => {
      const ref = `{spacing.${key}}` as TokenRef;
      const cssVar = tokenToCSSVar(ref);
      expect(cssVar).toMatch(/^var\(--[\w-]+\)$/);
    });

    it.each(spacingKeys)('spacing.%s → resolve 결과가 프리미티브와 일치', (key) => {
      const ref = `{spacing.${key}}` as TokenRef;
      const resolved = resolveToken(ref, 'light');
      expect(resolved).toBe(spacing[key as keyof typeof spacing]);
    });
  });

  describe('typography 토큰', () => {
    const typographyKeys = Object.keys(typography);

    it.each(typographyKeys)('typography.%s → 유효한 CSS var()', (key) => {
      const ref = `{typography.${key}}` as TokenRef;
      const cssVar = tokenToCSSVar(ref);
      expect(cssVar).toMatch(/^var\(--[\w-]+\)$/);
    });

    it.each(typographyKeys)('typography.%s → resolve 결과가 프리미티브와 일치', (key) => {
      const ref = `{typography.${key}}` as TokenRef;
      const resolved = resolveToken(ref, 'light');
      expect(resolved).toBe(typography[key as keyof typeof typography]);
    });
  });

  describe('radius 토큰', () => {
    const radiusKeys = Object.keys(radius);

    it.each(radiusKeys)('radius.%s → 유효한 CSS var()', (key) => {
      const ref = `{radius.${key}}` as TokenRef;
      const cssVar = tokenToCSSVar(ref);
      expect(cssVar).toMatch(/^var\(--[\w-]+\)$/);
    });

    it.each(radiusKeys)('radius.%s → resolve 결과가 프리미티브와 일치', (key) => {
      const ref = `{radius.${key}}` as TokenRef;
      const resolved = resolveToken(ref, 'light');
      expect(resolved).toBe(radius[key as keyof typeof radius]);
    });
  });

  describe('shadow 토큰', () => {
    const shadowKeys = Object.keys(shadows);

    it.each(shadowKeys)('shadow.%s → 유효한 CSS var()', (key) => {
      const ref = `{shadow.${key}}` as TokenRef;
      const cssVar = tokenToCSSVar(ref);
      expect(cssVar).toMatch(/^var\(--[\w-]+\)$/);
    });

    it.each(shadowKeys)('shadow.%s → resolve 결과가 프리미티브와 일치', (key) => {
      const ref = `{shadow.${key}}` as TokenRef;
      const resolved = resolveToken(ref, 'light');
      expect(resolved).toBe(shadows[key as keyof typeof shadows]);
    });
  });
});
