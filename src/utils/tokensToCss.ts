import { Database } from '../types/supabase';

type DesignTokenBase = Database['public']['Tables']['design_tokens']['Row'];
type DesignToken = Omit<DesignTokenBase, 'value'> & { value: TokenValue };

interface ColorValue {
  h: number;
  s: number;
  l: number;
  a: number;
}

interface TypographyValue {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
}

interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
}

interface BorderValue {
  width: string;
  style: string;
  color: string;
}

type TokenValue = ColorValue | TypographyValue | ShadowValue | BorderValue | string;

function isColorValue(value: unknown): value is ColorValue {
  return typeof value === 'object' && value !== null && 'h' in value && 's' in value && 'l' in value && 'a' in value;
}

function isTypographyValue(value: unknown): value is TypographyValue {
  return typeof value === 'object' && value !== null && 'fontFamily' in value && 'fontSize' in value && 'fontWeight' in value && 'lineHeight' in value;
}

function isShadowValue(value: unknown): value is ShadowValue {
  return typeof value === 'object' && value !== null && 'offsetX' in value && 'offsetY' in value && 'blur' in value && 'spread' in value && 'color' in value;
}

function isBorderValue(value: unknown): value is BorderValue {
  return typeof value === 'object' && value !== null && 'width' in value && 'style' in value && 'color' in value;
}

export function convertTokensToCSS(tokens: DesignToken[]): string {
  return tokens.reduce((css, token) => {
    const cssVarName = `--${token.type}-${token.name}`.toLowerCase().replace(/\s+/g, '-');
    let cssValue = '';

    switch (token.type) {
      case 'color': {
        if (!isColorValue(token.value)) break;
        cssValue = `hsl(${token.value.h}deg ${token.value.s}% ${token.value.l}% / ${token.value.a})`;
        break;
      }
      case 'typography': {
        if (!isTypographyValue(token.value)) break;
        return `${css}
  --typography-${token.name}-family: ${token.value.fontFamily};
  --typography-${token.name}-size: ${token.value.fontSize};
  --typography-${token.name}-weight: ${token.value.fontWeight};
  --typography-${token.name}-line-height: ${token.value.lineHeight};`;
      }
      case 'shadow': {
        if (!isShadowValue(token.value)) break;
        cssValue = `${token.value.offsetX} ${token.value.offsetY} ${token.value.blur} ${token.value.spread} ${token.value.color}`;
        break;
      }
      case 'border': {
        if (!isBorderValue(token.value)) break;
        return `${css}
  --border-${token.name}-width: ${token.value.width};
  --border-${token.name}-style: ${token.value.style};
  --border-${token.name}-color: ${token.value.color};`;
      }
      case 'spacing': {
        cssValue = String(token.value);
        break;
      }
      default:
        cssValue = String(token.value);
    }

    return `${css}\n  ${cssVarName}: ${cssValue};`;
  }, ':root {') + '\n}';
} 