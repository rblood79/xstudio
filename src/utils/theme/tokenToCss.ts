/**
 * Token to CSS Conversion Utility
 * 타입별 디자인 토큰을 CSS 변수로 변환
 */

import { hslToString, rgbToString } from './colorUtils';
import type { DesignToken } from '../../types/theme';

/**
 * 단일 토큰을 CSS 변수로 변환
 * 복잡한 객체 타입(Typography, Shadow, Border)은 여러 CSS 변수로 분해
 */
export function tokenToCSS(token: DesignToken): Record<string, string> {
  const cssVar = token.css_variable || `--${token.name.replace(/\./g, '-')}`;
  const vars: Record<string, string> = {};

  switch (token.type) {
    case 'color': {
      // HSL, RGB, HEX 모두 처리
      if (typeof token.value === 'object' && token.value !== null) {
        if ('h' in token.value && token.value.h !== undefined) {
          // HSL 객체 → "hsla(h, s%, l%, a)"
          vars[cssVar] = hslToString(token.value);
        } else if ('r' in token.value && token.value.r !== undefined) {
          // RGB 객체 → "rgba(r, g, b, a)"
          vars[cssVar] = rgbToString(token.value);
        } else {
          // 예상치 못한 객체 → JSON 문자열
          vars[cssVar] = JSON.stringify(token.value);
        }
      } else {
        // HEX 문자열 또는 기타 → 그대로 사용
        vars[cssVar] = String(token.value);
      }
      break;
    }

    case 'typography': {
      // 객체를 여러 CSS 변수로 분해
      // typography.heading.h1 { fontFamily, fontSize, fontWeight, lineHeight }
      // → --typography-heading-h1-font-family: "Inter"
      // → --typography-heading-h1-font-size: "2rem"
      const value = token.value as Record<string, unknown>;

      if (typeof value === 'object' && value !== null) {
        if (value.fontFamily) vars[`${cssVar}-font-family`] = value.fontFamily;
        if (value.fontSize) vars[`${cssVar}-font-size`] = value.fontSize;
        if (value.fontWeight !== undefined) vars[`${cssVar}-font-weight`] = String(value.fontWeight);
        if (value.lineHeight !== undefined) vars[`${cssVar}-line-height`] = String(value.lineHeight);
        if (value.letterSpacing) vars[`${cssVar}-letter-spacing`] = value.letterSpacing;
      } else {
        // 단순 문자열 값
        vars[cssVar] = String(value);
      }
      break;
    }

    case 'shadow': {
      // 객체 → CSS box-shadow 문자열
      // { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: {...} }
      // → "0px 4px 8px 0px rgba(0,0,0,0.1)"
      const value = token.value as Record<string, unknown>;

      if (typeof value === 'object' && value !== null) {
        const offsetX = value.offsetX || 0;
        const offsetY = value.offsetY || 0;
        const blur = value.blur || 0;
        const spread = value.spread || 0;

        // Color 변환
        let colorStr = 'rgba(0,0,0,0.1)'; // 기본값
        if (value.color) {
          if (typeof value.color === 'object') {
            if ('h' in value.color) {
              colorStr = hslToString(value.color);
            } else if ('r' in value.color) {
              colorStr = rgbToString(value.color);
            }
          } else {
            colorStr = String(value.color);
          }
        }

        vars[cssVar] = `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${colorStr}`;
      } else {
        // 이미 문자열 형태
        vars[cssVar] = String(value);
      }
      break;
    }

    case 'border': {
      // { width: "1px", style: "solid", color: {...} }
      // → "1px solid #e5e7eb"
      const value = token.value as Record<string, unknown>;

      if (typeof value === 'object' && value !== null) {
        const width = value.width || '1px';
        const style = value.style || 'solid';

        // Color 변환
        let colorStr = '#e5e7eb'; // 기본값
        if (value.color) {
          if (typeof value.color === 'object') {
            if ('h' in value.color) {
              colorStr = hslToString(value.color);
            } else if ('r' in value.color) {
              colorStr = rgbToString(value.color);
            }
          } else {
            colorStr = String(value.color);
          }
        }

        vars[cssVar] = `${width} ${style} ${colorStr}`;
      } else {
        // 이미 문자열 형태
        vars[cssVar] = String(value);
      }
      break;
    }

    case 'spacing':
    case 'radius':
    case 'motion':
    default: {
      // 문자열 그대로 사용
      if (typeof token.value === 'string') {
        vars[cssVar] = token.value;
      } else if (typeof token.value === 'number') {
        // 숫자는 px 단위 추가
        vars[cssVar] = `${token.value}px`;
      } else if (typeof token.value === 'object' && token.value !== null) {
        // 복잡한 객체는 JSON 문자열 (fallback)
        vars[cssVar] = JSON.stringify(token.value);
      } else {
        vars[cssVar] = String(token.value);
      }
      break;
    }
  }

  return vars;
}

/**
 * 여러 토큰을 한 번에 CSS 변수로 변환
 */
export function tokensToCSS(tokens: DesignToken[]): Record<string, string> {
  const allVars: Record<string, string> = {};

  tokens.forEach((token) => {
    const tokenVars = tokenToCSS(token);
    Object.assign(allVars, tokenVars);
  });

  return allVars;
}

/**
 * CSS 변수를 :root {} 블록으로 포맷팅
 */
export function formatCSSVars(vars: Record<string, string>): string {
  const entries = Object.entries(vars);

  if (entries.length === 0) {
    return ':root {}';
  }

  const cssText = entries
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {\n${cssText}\n}`;
}
