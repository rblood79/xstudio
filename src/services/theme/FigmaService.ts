/**
 * Figma 통합 서비스
 * Figma API를 통한 스타일/변수 Import/Export
 */

import type {
  FigmaImportRequest,
  FigmaImportResult,
  FigmaExportRequest,
  FigmaExportResult,
  FigmaColorStyle,
  FigmaTextStyle,
  FigmaEffectStyle,
  FigmaVariable,
  FigmaFileResponse
} from '../../types/theme/figma.types';
import type { DesignToken, ColorValueRGB } from '../../types/theme';
import { TokenService } from './TokenService';
import { rgbToHsl } from '../../utils/theme/colorUtils';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export class FigmaService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Figma 파일 정보 가져오기
   */
  async getFile(fileKey: string): Promise<FigmaFileResponse> {
    const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API 오류: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Figma 스타일 가져오기
   */
  async getStyles(fileKey: string): Promise<{
    colors: FigmaColorStyle[];
    textStyles: FigmaTextStyle[];
    effects: FigmaEffectStyle[];
  }> {
    const file = await this.getFile(fileKey);

    // Figma API는 스타일을 styles 객체로 반환
    const colors: FigmaColorStyle[] = [];
    const textStyles: FigmaTextStyle[] = [];
    const effects: FigmaEffectStyle[] = [];

    // 실제 API 응답에서 스타일 파싱
    // (Figma API 응답 구조에 따라 조정 필요)
    if (file.styles) {
      Object.values(file.styles).forEach((style: { styleType: string }) => {
        if (style.styleType === 'FILL') {
          colors.push(style as FigmaColorStyle);
        } else if (style.styleType === 'TEXT') {
          textStyles.push(style as FigmaTextStyle);
        } else if (style.styleType === 'EFFECT') {
          effects.push(style as FigmaEffectStyle);
        }
      });
    }

    return { colors, textStyles, effects };
  }

  /**
   * Figma Variables 가져오기 (신규 기능)
   */
  async getVariables(fileKey: string): Promise<FigmaVariable[]> {
    const response = await fetch(
      `${FIGMA_API_BASE}/files/${fileKey}/variables/local`,
      {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Figma Variables API 오류: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.meta?.variables || [];
  }

  /**
   * Figma 스타일 Import
   */
  async importStyles(request: FigmaImportRequest): Promise<FigmaImportResult> {
    const result: FigmaImportResult = {
      success: true,
      imported: { colors: 0, textStyles: 0, effects: 0, variables: 0, total: 0 },
      skipped: 0,
      errors: [],
      tokens: [],
    };

    try {
      // 기존 토큰 조회 (충돌 검사용)
      const existingTokens = await TokenService.getResolvedTokens(request.themeId);

      // 색상 스타일 Import
      if (request.importColors !== false) {
        const { colors } = await this.getStyles(request.fileKey);
        const colorTokens = await this.importColorStyles(
          colors,
          request,
          existingTokens,
          result.errors
        );
        result.tokens.push(...colorTokens);
        result.imported.colors = colorTokens.length;
      }

      // 텍스트 스타일 Import
      if (request.importTextStyles !== false) {
        const { textStyles } = await this.getStyles(request.fileKey);
        const textTokens = await this.importTextStyles(
          textStyles,
          request,
          existingTokens,
          result.errors
        );
        result.tokens.push(...textTokens);
        result.imported.textStyles = textTokens.length;
      }

      // 효과 스타일 Import
      if (request.importEffects !== false) {
        const { effects } = await this.getStyles(request.fileKey);
        const effectTokens = await this.importEffectStyles(
          effects,
          request,
          existingTokens,
          result.errors
        );
        result.tokens.push(...effectTokens);
        result.imported.effects = effectTokens.length;
      }

      // Variables Import (신규)
      if (request.importVariables !== false) {
        const variables = await this.getVariables(request.fileKey);
        const variableTokens = await this.importVariables(
          variables,
          request,
          existingTokens,
          result.errors
        );
        result.tokens.push(...variableTokens);
        result.imported.variables = variableTokens.length;
      }

      // 토큰 일괄 저장
      result.imported.total = result.tokens.length;
      if (result.tokens.length > 0) {
        await TokenService.bulkUpsertTokens(result.tokens);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push({
        styleName: 'ALL',
        styleType: 'color',
        reason: '전체 Import 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      });
    }

    return result;
  }

  /**
   * 색상 스타일 → DesignToken 변환
   */
  private async importColorStyles(
    styles: FigmaColorStyle[],
    request: FigmaImportRequest,
    existingTokens: DesignToken[],
    errors: FigmaImportError[]
  ): Promise<Partial<DesignToken>[]> {
    const tokens: Partial<DesignToken>[] = [];

    for (const style of styles) {
      try {
        // Figma 이름 → 토큰 이름 변환 (예: "Colors/Primary/500" → "color.primary.500")
        const tokenName = this.convertFigmaNameToTokenName(style.name);

        // 충돌 검사
        const conflict = existingTokens.find((t) => t.name === tokenName);
        if (conflict) {
          if (request.conflictResolution === 'skip') {
            continue;
          } else if (request.conflictResolution === 'rename') {
            // tokenName에 suffix 추가
            const renamedToken = `${tokenName}.figma`;
            tokens.push(
              this.createColorToken(request, style, renamedToken)
            );
            continue;
          }
          // 'overwrite'는 그냥 진행
        }

        tokens.push(this.createColorToken(request, style, tokenName));
      } catch (error) {
        errors.push({
          styleName: style.name,
          styleType: 'color',
          reason: '색상 변환 실패',
          details: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    return tokens;
  }

  /**
   * 색상 스타일 → DesignToken 생성
   */
  private createColorToken(
    request: FigmaImportRequest,
    style: FigmaColorStyle,
    tokenName: string
  ): Partial<DesignToken> {
    // Figma RGB (0-1) → HSL 변환
    let colorValue: ColorValueHSL;

    if (style.color) {
      const rgb: ColorValueRGB = {
        r: Math.round(style.color.r * 255),
        g: Math.round(style.color.g * 255),
        b: Math.round(style.color.b * 255),
        a: style.color.a,
      };
      colorValue = rgbToHsl(rgb);
    } else {
      // 기본값
      colorValue = { h: 0, s: 0, l: 50, a: 1 };
    }

    return {
      project_id: request.projectId,
      theme_id: request.themeId,
      name: tokenName,
      type: 'color',
      value: colorValue,
      scope: 'raw',
      css_variable: `--${tokenName.replace(/\./g, '-')}`,
    };
  }

  /**
   * 텍스트 스타일 → DesignToken 변환
   */
  private async importTextStyles(
    styles: FigmaTextStyle[],
    request: FigmaImportRequest,
    existingTokens: DesignToken[],
    errors: FigmaImportError[]
  ): Promise<Partial<DesignToken>[]> {
    const tokens: Partial<DesignToken>[] = [];

    for (const style of styles) {
      try {
        const tokenName = this.convertFigmaNameToTokenName(style.name);

        // 충돌 검사
        const conflict = existingTokens.find((t) => t.name === tokenName);
        if (conflict && request.conflictResolution === 'skip') {
          continue;
        }

        // Typography 토큰은 여러 개로 분리
        tokens.push(
          {
            project_id: request.projectId,
            theme_id: request.themeId,
            name: `${tokenName}.fontFamily`,
            type: 'typography',
            value: style.fontFamily,
            scope: 'raw',
            css_variable: `--${tokenName.replace(/\./g, '-')}-font`,
          },
          {
            project_id: request.projectId,
            theme_id: request.themeId,
            name: `${tokenName}.fontSize`,
            type: 'typography',
            value: `${style.fontSize}px`,
            scope: 'raw',
            css_variable: `--${tokenName.replace(/\./g, '-')}-size`,
          },
          {
            project_id: request.projectId,
            theme_id: request.themeId,
            name: `${tokenName}.fontWeight`,
            type: 'typography',
            value: style.fontWeight,
            scope: 'raw',
            css_variable: `--${tokenName.replace(/\./g, '-')}-weight`,
          }
        );
      } catch (error) {
        errors.push({
          styleName: style.name,
          styleType: 'text',
          reason: '텍스트 스타일 변환 실패',
          details: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    return tokens;
  }

  /**
   * 효과 스타일 → DesignToken 변환
   */
  private async importEffectStyles(
    styles: FigmaEffectStyle[],
    request: FigmaImportRequest,
    existingTokens: DesignToken[],
    errors: FigmaImportError[]
  ): Promise<Partial<DesignToken>[]> {
    const tokens: Partial<DesignToken>[] = [];

    for (const style of styles) {
      try {
        const tokenName = this.convertFigmaNameToTokenName(style.name);

        // Shadow만 지원
        const shadow = style.effects.find((e) => e.type === 'DROP_SHADOW');
        if (!shadow) continue;

        tokens.push({
          project_id: request.projectId,
          theme_id: request.themeId,
          name: tokenName,
          type: 'shadow',
          value: {
            offsetX: `${shadow.offset?.x || 0}px`,
            offsetY: `${shadow.offset?.y || 0}px`,
            blur: `${shadow.radius}px`,
            spread: `${shadow.spread || 0}px`,
            color: shadow.color
              ? `rgba(${Math.round(shadow.color.r * 255)}, ${Math.round(shadow.color.g * 255)}, ${Math.round(shadow.color.b * 255)}, ${shadow.color.a})`
              : 'rgba(0, 0, 0, 0.1)',
          },
          scope: 'raw',
          css_variable: `--${tokenName.replace(/\./g, '-')}`,
        });
      } catch (error) {
        errors.push({
          styleName: style.name,
          styleType: 'effect',
          reason: '효과 변환 실패',
          details: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    return tokens;
  }

  /**
   * Figma Variables → DesignToken 변환
   */
  private async importVariables(
    variables: FigmaVariable[],
    request: FigmaImportRequest,
    existingTokens: DesignToken[],
    errors: FigmaImportError[]
  ): Promise<Partial<DesignToken>[]> {
    const tokens: Partial<DesignToken>[] = [];

    for (const variable of variables) {
      try {
        const tokenName = this.convertFigmaNameToTokenName(variable.name);

        // 첫 번째 모드 값 사용
        const firstMode = Object.keys(variable.valuesByMode)[0];
        const value = variable.valuesByMode[firstMode];

        if (value.type === 'COLOR' && value.color) {
          const rgb: ColorValueRGB = {
            r: Math.round(value.color.r * 255),
            g: Math.round(value.color.g * 255),
            b: Math.round(value.color.b * 255),
            a: value.color.a,
          };
          const hsl = rgbToHsl(rgb);

          tokens.push({
            project_id: request.projectId,
            theme_id: request.themeId,
            name: tokenName,
            type: 'color',
            value: hsl,
            scope: 'raw',
            css_variable: `--${tokenName.replace(/\./g, '-')}`,
          });
        } else if (value.type === 'FLOAT') {
          tokens.push({
            project_id: request.projectId,
            theme_id: request.themeId,
            name: tokenName,
            type: 'spacing',
            value: `${value.value}px`,
            scope: 'raw',
            css_variable: `--${tokenName.replace(/\./g, '-')}`,
          });
        }
      } catch (error) {
        errors.push({
          styleName: variable.name,
          styleType: 'variable',
          reason: 'Variable 변환 실패',
          details: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    return tokens;
  }

  /**
   * Figma 이름 → 토큰 이름 변환
   * 예: "Colors/Primary/500" → "color.primary.500"
   */
  private convertFigmaNameToTokenName(figmaName: string): string {
    return figmaName
      .toLowerCase()
      .replace(/\//g, '.') // '/' → '.'
      .replace(/\s+/g, '-') // 공백 → '-'
      .replace(/[^a-z0-9.-]/g, '') // 특수문자 제거
      .replace(/^\.+|\.+$/g, ''); // 시작/끝 점 제거
  }

  /**
   * DesignToken Export (향후 구현)
   */
  async exportStyles(request: FigmaExportRequest): Promise<FigmaExportResult> {
    // Figma API는 현재 스타일/변수 생성 API를 제공하지 않음
    // Figma Plugin을 통해 구현해야 함
    return {
      success: false,
      exported: { colors: 0, textStyles: 0, effects: 0, variables: 0, total: 0 },
      errors: [
        {
          tokenName: 'ALL',
          tokenType: 'all',
          reason: 'Export는 Figma Plugin을 통해 구현해야 합니다',
          details:
            'Figma REST API는 스타일 생성을 지원하지 않습니다. Figma Plugin 설치 후 사용하세요.',
        },
      ],
      figmaFileUrl: `https://www.figma.com/file/${request.fileKey}`,
    };
  }
}

/**
 * Figma Personal Access Token으로 서비스 생성
 */
export function createFigmaService(accessToken?: string): FigmaService {
  const token = accessToken || import.meta.env.VITE_FIGMA_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      'Figma Access Token이 설정되지 않았습니다. .env 파일의 VITE_FIGMA_ACCESS_TOKEN을 설정하세요.'
    );
  }

  return new FigmaService(token);
}
