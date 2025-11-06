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
  TypographyScaleResponse,
  SpacingScaleResponse,
  RadiusScaleResponse,
  ShadowScaleResponse,
  ThemeGenerationError,
} from '../../types/theme/generation.types';
import type { DesignToken, ColorValueHSL } from '../../types/theme/token.types';
import {
  parseColorString,
  generateColorScale,
  getAnalogousColors,
  getSplitComplementaryColors,
  adjustLightness,
  adjustSaturation,
} from '../../utils/theme/colorUtils';
import { ThemeService } from './ThemeService';
import { TokenService } from './TokenService';
import { TYPE_SCALE_RATIOS } from '../../types/theme/generation.types';

const THEME_GENERATION_SYSTEM_PROMPT = `당신은 웹 디자인 시스템 전문가입니다. 사용자의 요청을 바탕으로 완전한 디자인 테마를 생성합니다.

**생성 가능한 요소:**
- 색상 팔레트 (Primary, Secondary, Neutral, Semantic colors)
- 타이포그래피 스케일 (Font family, sizes, weights, line heights)
- 간격 시스템 (Spacing scale)
- Border radius, Shadow, Motion 토큰
- Semantic 토큰 (버튼, 입력, 카드 등의 컴포넌트 토큰)

**색상 생성 규칙:**
- Primary: 브랜드 메인 컬러 (50-900 shade)
- Secondary: Primary의 보색 또는 유사색
- Neutral: Gray scale (50-900)
- Success: 녹색 계열 (#10b981 기준)
- Warning: 주황색 계열 (#f59e0b 기준)
- Error: 빨강색 계열 (#ef4444 기준)
- Info: 파랑색 계열 (#3b82f6 기준)

**접근성 준수:**
- WCAG AA 기준 명암비 준수
- 텍스트 색상은 배경과 4.5:1 이상
- 대형 텍스트는 3:1 이상

**토큰 네이밍 규칙:**
- Raw 토큰: "color.{palette}.{shade}", "typography.size.{name}"
- Semantic 토큰: "color.button.primary.bg", "color.input.border"

**응답 형식 (JSON):**
{
  "colors": {
    "primary": { "500": { "h": 210, "s": 100, "l": 50, "a": 1 }, ... },
    "secondary": { ... },
    "neutral": { ... },
    "success": { ... },
    "warning": { ... },
    "error": { ... },
    "info": { ... }
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "serif": "Georgia, serif",
      "mono": "Fira Code, monospace"
    },
    "fontSize": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      ...
    },
    "fontWeight": {
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    ...
  }
}

**중요:** 반드시 유효한 JSON만 응답하세요.`;

export class ThemeGenerationService {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.client = new Groq({
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
      const response: ThemeGenerationResponse = {
        themeId: theme.id,
        themeName: request.themeName,
        description: request.description,
        tokens,
        colorPalette,
        metadata: {
          generatedAt: new Date().toISOString(),
          aiModel: this.model,
          tokenCount: tokens.length,
        },
      };

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
    };
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
          value: color,
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
