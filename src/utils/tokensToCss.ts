import { Database } from '../types/supabase';

type DesignToken = Database['public']['Tables']['design_tokens']['Row'];

export function convertTokensToCSS(tokens: DesignToken[]): string {
  return tokens.reduce((css, token) => {
    const cssVarName = `--${token.name}-${token.type}`.toLowerCase().replace(/\s+/g, '-');
    let cssValue = '';

    switch (token.type) {
      case 'color': {
        const colorValue = token.value as { r: number; g: number; b: number; a: number };
        cssValue = `rgba(${colorValue.r}, ${colorValue.g}, ${colorValue.b}, ${colorValue.a})`;
        break;
      }
      case 'typography': {
        const typographyValue = token.value as {
          fontFamily: string;
          fontSize: string;
          fontWeight: number;
          lineHeight: number;
        };
        cssValue = `${typographyValue.fontWeight} ${typographyValue.fontSize}/${typographyValue.lineHeight} ${typographyValue.fontFamily}`;
        break;
      }
      case 'shadow': {
        const shadowValue = token.value as {
          offsetX: string;
          offsetY: string;
          blur: string;
          spread: string;
          color: string;
        };
        cssValue = `${shadowValue.offsetX} ${shadowValue.offsetY} ${shadowValue.blur} ${shadowValue.spread} ${shadowValue.color}`;
        break;
      }
      case 'border': {
        const borderValue = token.value as {
          width: string;
          style: string;
          color: string;
        };
        cssValue = `${borderValue.width} ${borderValue.style} ${borderValue.color}`;
        break;
      }
      default:
        cssValue = String(token.value);
    }
    console.log(`${css}\n  ${cssVarName}: ${cssValue};`);
    return `${css}\n  ${cssVarName}: ${cssValue};`;
  }, ':root {') + '\n}';
} 