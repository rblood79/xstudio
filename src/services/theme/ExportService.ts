/**
 * Export Service
 * 토큰을 다양한 형식으로 Export
 */

import type { DesignToken, ColorValueHSL } from '../../types/theme';
import { hslToString, hslToHex } from '../../utils/theme/colorUtils';
import { isShadowValue } from '../../types/theme';

export type ExportFormat = 'css' | 'tailwind' | 'scss' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeComments?: boolean;
  groupByCategory?: boolean;
  minify?: boolean;
}

export interface ExportResult {
  format: ExportFormat;
  content: string;
  filename: string;
  mimeType: string;
}

export class ExportService {
  /**
   * 토큰을 지정된 형식으로 Export
   */
  static async exportTokens(
    tokens: DesignToken[],
    options: ExportOptions
  ): Promise<ExportResult> {
    switch (options.format) {
      case 'css':
        return this.exportToCSS(tokens, options);
      case 'tailwind':
        return this.exportToTailwind(tokens, options);
      case 'scss':
        return this.exportToSCSS(tokens, options);
      case 'json':
        return this.exportToJSON(tokens, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * CSS Variables Export
   */
  private static exportToCSS(
    tokens: DesignToken[],
    options: ExportOptions
  ): ExportResult {
    const lines: string[] = [];

    // Header comment
    if (options.includeComments !== false) {
      lines.push('/**');
      lines.push(' * Design Tokens - CSS Variables');
      lines.push(` * Generated: ${new Date().toISOString()}`);
      lines.push(` * Total tokens: ${tokens.length}`);
      lines.push(' */');
      lines.push('');
    }

    lines.push(':root {');

    if (options.groupByCategory) {
      // 카테고리별로 그룹화
      const grouped = this.groupTokensByCategory(tokens);

      Object.entries(grouped).forEach(([category, categoryTokens]) => {
        if (options.includeComments !== false) {
          lines.push(`  /* ${category} */`);
        }

        categoryTokens.forEach((token) => {
          const cssValue = this.tokenValueToCSS(token);
          lines.push(`  ${token.css_variable || `--${token.name.replace(/\./g, '-')}`}: ${cssValue};`);
        });

        lines.push('');
      });
    } else {
      // 순서대로 출력
      tokens.forEach((token) => {
        const cssValue = this.tokenValueToCSS(token);
        lines.push(`  ${token.css_variable || `--${token.name.replace(/\./g, '-')}`}: ${cssValue};`);
      });
    }

    lines.push('}');

    const content = options.minify
      ? lines.join('').replace(/\s+/g, ' ')
      : lines.join('\n');

    return {
      format: 'css',
      content,
      filename: 'tokens.css',
      mimeType: 'text/css',
    };
  }

  /**
   * Tailwind Config Export
   */
  private static exportToTailwind(
    tokens: DesignToken[],
    options: ExportOptions
  ): ExportResult {
    const config: Record<string, any> = {
      theme: {
        extend: {},
      },
    };

    // 카테고리별로 그룹화
    const grouped = this.groupTokensByCategory(tokens);

    Object.entries(grouped).forEach(([category, categoryTokens]) => {
      const tailwindSection = this.getTailwindSection(category);
      if (!tailwindSection) return;

      config.theme.extend[tailwindSection] = {};

      categoryTokens.forEach((token) => {
        const key = this.extractTailwindKey(token.name);
        const value = this.tokenValueToTailwind(token);

        if (key && value) {
          config.theme.extend[tailwindSection][key] = value;
        }
      });
    });

    const content = options.minify
      ? JSON.stringify(config)
      : JSON.stringify(config, null, 2);

    const lines: string[] = [];

    if (options.includeComments !== false) {
      lines.push('/**');
      lines.push(' * Design Tokens - Tailwind Config');
      lines.push(` * Generated: ${new Date().toISOString()}`);
      lines.push(' */');
      lines.push('');
    }

    lines.push('module.exports = ' + content);

    return {
      format: 'tailwind',
      content: lines.join('\n'),
      filename: 'tailwind.config.js',
      mimeType: 'application/javascript',
    };
  }

  /**
   * SCSS Variables Export
   */
  private static exportToSCSS(
    tokens: DesignToken[],
    options: ExportOptions
  ): ExportResult {
    const lines: string[] = [];

    // Header comment
    if (options.includeComments !== false) {
      lines.push('//');
      lines.push('// Design Tokens - SCSS Variables');
      lines.push(`// Generated: ${new Date().toISOString()}`);
      lines.push(`// Total tokens: ${tokens.length}`);
      lines.push('//');
      lines.push('');
    }

    if (options.groupByCategory) {
      // 카테고리별로 그룹화
      const grouped = this.groupTokensByCategory(tokens);

      Object.entries(grouped).forEach(([category, categoryTokens]) => {
        if (options.includeComments !== false) {
          lines.push(`// ${category}`);
        }

        categoryTokens.forEach((token) => {
          const scssValue = this.tokenValueToSCSS(token);
          lines.push(`$${token.name.replace(/\./g, '-')}: ${scssValue};`);
        });

        lines.push('');
      });
    } else {
      // 순서대로 출력
      tokens.forEach((token) => {
        const scssValue = this.tokenValueToSCSS(token);
        lines.push(`$${token.name.replace(/\./g, '-')}: ${scssValue};`);
      });
    }

    const content = options.minify
      ? lines.join('').replace(/\s+/g, ' ')
      : lines.join('\n');

    return {
      format: 'scss',
      content,
      filename: 'tokens.scss',
      mimeType: 'text/x-scss',
    };
  }

  /**
   * JSON Export
   */
  private static exportToJSON(
    tokens: DesignToken[],
    options: ExportOptions
  ): ExportResult {
    const exportData = tokens.map((token) => ({
      name: token.name,
      type: token.type,
      value: token.value,
      scope: token.scope,
      css_variable: token.css_variable,
    }));

    const content = options.minify
      ? JSON.stringify(exportData)
      : JSON.stringify(exportData, null, 2);

    return {
      format: 'json',
      content,
      filename: 'tokens.json',
      mimeType: 'application/json',
    };
  }

  /**
   * 토큰 값을 CSS 형식으로 변환
   */
  private static tokenValueToCSS(token: DesignToken): string {
    switch (token.type) {
      case 'color':
        if (token.value && typeof token.value === 'object') {
          return hslToString(token.value as ColorValueHSL);
        }
        return String(token.value);

      case 'spacing':
      case 'typography':
        return String(token.value);

      case 'shadow':
        if (isShadowValue(token.value)) {
          const shadow = token.value;
          return `${shadow.offsetX} ${shadow.offsetY} ${shadow.blur} ${shadow.spread} ${shadow.color}`;
        }
        return String(token.value);

      default:
        return JSON.stringify(token.value);
    }
  }

  /**
   * 토큰 값을 Tailwind 형식으로 변환
   */
  private static tokenValueToTailwind(token: DesignToken): string {
    switch (token.type) {
      case 'color':
        if (token.value && typeof token.value === 'object') {
          return hslToHex(token.value as ColorValueHSL);
        }
        return String(token.value);

      default:
        return String(token.value);
    }
  }

  /**
   * 토큰 값을 SCSS 형식으로 변환
   */
  private static tokenValueToSCSS(token: DesignToken): string {
    // SCSS는 CSS와 동일한 형식 사용
    return this.tokenValueToCSS(token);
  }

  /**
   * 카테고리별로 토큰 그룹화
   */
  private static groupTokensByCategory(
    tokens: DesignToken[]
  ): Record<string, DesignToken[]> {
    return tokens.reduce((acc, token) => {
      const category = token.name.split('.')[0] || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(token);
      return acc;
    }, {} as Record<string, DesignToken[]>);
  }

  /**
   * Tailwind 섹션 이름 추출
   */
  private static getTailwindSection(category: string): string | null {
    const mapping: Record<string, string> = {
      color: 'colors',
      spacing: 'spacing',
      typography: 'fontSize',
      shadow: 'boxShadow',
      radius: 'borderRadius',
    };

    return mapping[category] || null;
  }

  /**
   * Tailwind 키 추출
   * "color.primary.500" → "primary-500"
   */
  private static extractTailwindKey(tokenName: string): string {
    const parts = tokenName.split('.');
    return parts.slice(1).join('-'); // 첫 번째 부분(카테고리) 제거
  }

  /**
   * 파일 다운로드 트리거
   */
  static downloadFile(result: ExportResult): void {
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
