export interface CustomFontAsset {
  id: string;
  family: string;
  source: string;
  format?: 'woff2' | 'woff' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg';
}

export const CUSTOM_FONT_STORAGE_KEY = 'xstudio.custom-fonts';

function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function inferFontFormatFromName(fileName: string): CustomFontAsset['format'] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.woff2')) return 'woff2';
  if (lower.endsWith('.woff')) return 'woff';
  if (lower.endsWith('.ttf')) return 'truetype';
  if (lower.endsWith('.otf')) return 'opentype';
  if (lower.endsWith('.eot')) return 'embedded-opentype';
  if (lower.endsWith('.svg')) return 'svg';
  return undefined;
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

export function buildCustomFontFaceCss(fonts: CustomFontAsset[]): string {
  if (fonts.length === 0) return '';

  return fonts
    .filter((font) => font.family.trim() && font.source.trim())
    .map((font) => {
      const family = escapeCssString(font.family.trim());
      const src = font.source.trim();
      const format = font.format ? ` format('${font.format}')` : '';

      return `@font-face {\n  font-family: "${family}";\n  src: url("${src}")${format};\n  font-display: swap;\n}`;
    })
    .join('\n\n');
}
