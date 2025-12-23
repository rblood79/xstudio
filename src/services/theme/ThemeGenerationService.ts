/**
 * 테마 생성 서비스
 * Groq AI를 활용한 테마 자동 생성
 */

import Groq from 'groq-sdk';
import type {
  ThemeGenerationRequest,
  ThemeGenerationResponse,
  ThemeGenerationProgress,
  ThemeGenerationStage,
  ColorPaletteResponse,
  ColorShades,
  ThemeGenerationError,
} from '../../types/theme/generation.types';
import type { DesignToken, ColorValueHSL } from '../../types/theme';
import {
  parseColorString,
  getSplitComplementaryColors,
  adjustLightness,
  adjustSaturation,
} from '../../utils/theme/colorUtils';
import { ThemeService } from './ThemeService';
import { TokenService } from './TokenService';

export class ThemeGenerationService {
  private _client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this._client = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.model = model;
  }

  /**
   * 전체 테마 생성 (스트리밍 지원)
   */
  async *generateTheme(
    request: ThemeGenerationRequest
  ): AsyncGenerator<ThemeGenerationProgress> {
    const stages: ThemeGenerationStage[] = [
      'analyzing',
      'colors',
      'finalizing',
    ];
    let currentStageIndex = 0;

    try {
      // Stage 1: Analyzing
      yield {
        stage: 'analyzing',
        progress: 10,
        message: '테마 생성 요청 분석 중...',
      };

      // Stage 2: Colors (AI 생성 - 유일한 AI 단계)
      currentStageIndex = 1;
      yield {
        stage: 'colors',
        progress: 20,
        message: '색상 팔레트 생성 중...',
      };

      const colorPalette = await this.generateColorPalette(request);

      yield {
        stage: 'colors',
        progress: 60,
        message: '색상 팔레트 생성 완료',
        data: { colorPalette },
      };

      // Stage 3: Finalizing - Create theme and save tokens
      currentStageIndex = 2;
      yield {
        stage: 'finalizing',
        progress: 80,
        message: '테마 저장 중...',
      };

      const theme = await ThemeService.createTheme({
        project_id: request.projectId,
        name: request.themeName,
        status: 'draft',
      });

      // fontFamily만 옵션으로 토큰 생성 (사용자 요청 시)
      const fontFamilyTokens = this.generateFontFamilyTokens(
        request.projectId,
        theme.id,
        request.typography?.fontFamily
      );

      // Convert to design tokens (색상만, semantic은 theme.css에서 처리)
      const rawTokens = this.convertToDesignTokens(
        request.projectId,
        theme.id,
        colorPalette
      );

      const tokens = [...rawTokens, ...fontFamilyTokens];

      // Save tokens to database
      await TokenService.bulkUpsertTokens(tokens);

      // Complete
      // typography와 spacing은 theme.css에서 고정값 사용하므로 여기서는 생략
      const response = {
        themeId: theme.id,
        themeName: request.themeName,
        description: request.description,
        tokens: tokens as DesignToken[],
        colorPalette,
        metadata: {
          generatedAt: new Date().toISOString(),
          aiModel: this.model,
          tokenCount: tokens.length,
        },
      } as ThemeGenerationResponse;

      yield {
        stage: 'complete',
        progress: 100,
        message: '테마 생성 완료!',
        data: response,
      };
    } catch (error) {
      const errorStage = stages[currentStageIndex];
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      throw {
        stage: errorStage,
        message: `${errorStage} 단계에서 오류 발생`,
        details: errorMessage,
        recoverable: false,
      } as ThemeGenerationError;
    }
  }

  /**
   * 색상 팔레트 생성
   */
  private async generateColorPalette(
    request: ThemeGenerationRequest
  ): Promise<ColorPaletteResponse> {
    // 기본 브랜드 색상
    let primaryBase: ColorValueHSL;

    if (request.brandColor) {
      if (typeof request.brandColor === 'string') {
        primaryBase = parseColorString(request.brandColor) || {
          h: 210,
          s: 100,
          l: 50,
          a: 1,
        };
      } else {
        primaryBase = request.brandColor;
      }
    } else {
      // 기본값: 파랑 계열
      primaryBase = { h: 210, s: 100, l: 50, a: 1 };
    }

    // Style에 따라 채도/명도 조정
    const style = request.colorPalette?.style || request.style;
    if (style === 'muted') {
      primaryBase = adjustSaturation(primaryBase, -30);
    } else if (style === 'pastel') {
      primaryBase = adjustSaturation(primaryBase, -20);
      primaryBase = adjustLightness(primaryBase, 20);
    } else if (style === 'dark') {
      primaryBase = adjustLightness(primaryBase, -20);
    } else if (style === 'light') {
      primaryBase = adjustLightness(primaryBase, 10);
    }

    // Primary shades 생성
    const primary = this.generateColorShades(primaryBase);

    // Secondary: Split complementary 사용
    const [, secondary500] = getSplitComplementaryColors(primaryBase);
    const secondary = this.generateColorShades(secondary500);

    // Surface: 따뜻한 중성 색상 (UI 표면용)
    const surface = this.generateColorShades({ h: 30, s: 10, l: 50, a: 1 }); // Warm neutral

    // Neutral, Status colors (neutral, success, warning, error, info)는 theme.css에서 고정값 사용

    return {
      primary,
      secondary,
      surface,
    } as ColorPaletteResponse;
  }

  /**
   * 색상 shade 세트 생성 (50-900)
   */
  private generateColorShades(baseColor: ColorValueHSL): ColorShades {
    const shades: Partial<ColorShades> = {};
    const shadeSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

    shadeSteps.forEach((shade, index) => {
      // Lightness: 95% (50) → 10% (900)
      const lightness = 95 - index * 9.5;

      shades[shade as keyof ColorShades] = {
        ...baseColor,
        l: Math.round(lightness),
      };
    });

    return shades as ColorShades;
  }

  /**
   * Font Family 토큰 생성 (사용자 요청 시만)
   */
  private generateFontFamilyTokens(
    projectId: string,
    themeId: string,
    customFontFamily?: string
  ): Partial<DesignToken>[] {
    if (!customFontFamily) return [];

    return [
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'typography.fontFamily.sans',
        type: 'typography',
        value: customFontFamily,
        scope: 'raw',
        css_variable: '--font-sans',
      },
    ];
  }

  /**
   * 생성된 데이터를 DesignToken으로 변환 (색상만)
   */
  private convertToDesignTokens(
    projectId: string,
    themeId: string,
    colorPalette: ColorPaletteResponse
  ): Partial<DesignToken>[] {
    const tokens: Partial<DesignToken>[] = [];

    // Color tokens만 생성 (typography, spacing, radius, shadow는 theme.css 고정값 사용)
    Object.entries(colorPalette).forEach(([paletteName, shades]) => {
      Object.entries(shades).forEach(([shade, color]) => {
        tokens.push({
          project_id: projectId,
          theme_id: themeId,
          name: `color.${paletteName}.${shade}`,
          type: 'color',
          value: color as ColorValueHSL,
          scope: 'raw',
          css_variable: `--color-${paletteName}-${shade}`,
        });
      });
    });

    return tokens;
  }

  // Semantic 토큰은 theme.css에서 관리 (generateSemanticTokens 제거됨)
  // theme.css의 semantic colors가 토큰 시스템과 자동 통합됨
}

/**
 * Groq API 키로 서비스 인스턴스 생성
 */
export function createThemeGenerationService(): ThemeGenerationService {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error(
      'Groq API 키가 설정되지 않았습니다. .env 파일의 VITE_GROQ_API_KEY를 설정하세요.'
    );
  }

  return new ThemeGenerationService(apiKey);
}
