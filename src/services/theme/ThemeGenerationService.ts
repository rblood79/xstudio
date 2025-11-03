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
      'typography',
      'spacing',
      'semantic',
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

      // Stage 2: Colors
      currentStageIndex = 1;
      yield {
        stage: 'colors',
        progress: 20,
        message: '색상 팔레트 생성 중...',
      };

      const colorPalette = await this.generateColorPalette(request);

      yield {
        stage: 'colors',
        progress: 40,
        message: '색상 팔레트 생성 완료',
        data: { colorPalette },
      };

      // Stage 3: Typography
      currentStageIndex = 2;
      yield {
        stage: 'typography',
        progress: 50,
        message: '타이포그래피 스케일 생성 중...',
      };

      const typography = await this.generateTypographyScale(request);

      yield {
        stage: 'typography',
        progress: 60,
        message: '타이포그래피 생성 완료',
        data: { typography },
      };

      // Stage 4: Spacing
      currentStageIndex = 3;
      yield {
        stage: 'spacing',
        progress: 60,
        message: '간격 시스템 생성 중...',
      };

      const spacing = await this.generateSpacingScale(request);

      yield {
        stage: 'spacing',
        progress: 65,
        message: '간격 시스템 생성 완료',
        data: { spacing },
      };

      // Stage 5: Radius
      currentStageIndex = 4;
      yield {
        stage: 'radius',
        progress: 70,
        message: 'Border radius 생성 중...',
      };

      const radius = await this.generateRadiusScale(request);

      yield {
        stage: 'radius',
        progress: 75,
        message: 'Border radius 생성 완료',
        data: { radius },
      };

      // Stage 6: Shadows
      currentStageIndex = 5;
      yield {
        stage: 'shadows',
        progress: 78,
        message: 'Shadow 생성 중...',
      };

      const shadows = await this.generateShadowScale(request);

      yield {
        stage: 'shadows',
        progress: 82,
        message: 'Shadow 생성 완료',
        data: { shadows },
      };

      // Stage 7: Semantic tokens
      currentStageIndex = 6;
      let semanticTokens: Partial<DesignToken>[] = [];
      if (request.includeSemanticTokens !== false) {
        yield {
          stage: 'semantic',
          progress: 85,
          message: 'Semantic 토큰 생성 중...',
        };

        semanticTokens = this.generateSemanticTokens(
          request.projectId,
          '', // themeId will be set after theme creation
          colorPalette
        );
      }

      // Stage 6: Finalizing - Create theme and save tokens
      currentStageIndex = 5;
      yield {
        stage: 'finalizing',
        progress: 90,
        message: '테마 저장 중...',
      };

      const theme = await ThemeService.createTheme({
        project_id: request.projectId,
        name: request.themeName,
        status: 'draft',
      });

      // Convert to design tokens
      const rawTokens = this.convertToDesignTokens(
        request.projectId,
        theme.id,
        colorPalette,
        typography,
        spacing,
        radius,
        shadows
      );

      // Add semantic tokens with correct theme_id
      semanticTokens.forEach((token) => {
        token.theme_id = theme.id;
      });

      const tokens = [...rawTokens, ...semanticTokens];

      // Save tokens to database
      await TokenService.bulkUpsertTokens(tokens);

      // Complete
      const response: ThemeGenerationResponse = {
        themeId: theme.id,
        themeName: request.themeName,
        description: request.description,
        tokens,
        colorPalette,
        typography,
        spacing,
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

    // Neutral: Gray scale
    const neutral = this.generateColorShades({ h: 0, s: 0, l: 50, a: 1 });

    // Semantic colors
    const success = this.generateColorShades({ h: 142, s: 71, l: 45, a: 1 }); // Green
    const warning = this.generateColorShades({ h: 38, s: 92, l: 50, a: 1 }); // Orange
    const error = this.generateColorShades({ h: 0, s: 84, l: 60, a: 1 }); // Red
    const info = this.generateColorShades({ h: 217, s: 91, l: 60, a: 1 }); // Blue

    return {
      primary,
      secondary,
      surface,
      neutral,
      success,
      warning,
      error,
      info,
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
   * 타이포그래피 스케일 생성 (Tailwind 표준 고정 값)
   */
  private async generateTypographyScale(
    request: ThemeGenerationRequest
  ): Promise<TypographyScaleResponse> {
    return {
      fontFamily: {
        sans:
          request.typography?.fontFamily ||
          'Inter, system-ui, -apple-system, sans-serif',
        serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
        mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
      },
      fontSize: {
        '2xs': '0.625rem',   // 10px
        xs: '0.75rem',       // 12px
        sm: '0.875rem',      // 14px
        base: '1rem',        // 16px
        lg: '1.125rem',      // 18px
        xl: '1.25rem',       // 20px
        '2xl': '1.5rem',     // 24px
        '3xl': '1.875rem',   // 30px
        '4xl': '2.25rem',    // 36px
        '5xl': '3rem',       // 48px
      },
      fontWeight: {
        thin: 100,
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
      },
      lineHeight: {
        tight: 1.25,
        snug: 1.375,
        normal: 1.5,
        relaxed: 1.625,
        loose: 2,
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
      },
    };
  }

  /**
   * Font size별 line-height 계산 (Tailwind 표준)
   */
  private calculateLineHeightForSize(sizeName: string): string {
    const lineHeightMap: Record<string, string> = {
      '2xs': 'calc(1 / 0.625)',
      xs: 'calc(1 / 0.75)',
      sm: 'calc(1.25 / 0.875)',
      base: 'calc(1.5 / 1)',
      lg: 'calc(1.75 / 1.125)',
      xl: 'calc(1.75 / 1.25)',
      '2xl': 'calc(2 / 1.5)',
      '3xl': 'calc(2.25 / 1.875)',
      '4xl': 'calc(2.5 / 2.25)',
      '5xl': 'calc(3 / 3)',
    };
    return lineHeightMap[sizeName] || '1.5';
  }

  /**
   * 간격 스케일 생성 (Tailwind 표준 고정 값)
   */
  private async generateSpacingScale(
    request: ThemeGenerationRequest
  ): Promise<SpacingScaleResponse> {
    return {
      0: '0',
      '2xs': '0.125rem',   // 2px
      xs: '0.25rem',       // 4px
      sm: '0.5rem',        // 8px
      md: '0.75rem',       // 12px
      lg: '1rem',          // 16px
      xl: '1.5rem',        // 24px
      '2xl': '2rem',       // 32px
      '3xl': '2.5rem',     // 40px
    };
  }

  /**
   * Border radius 스케일 생성
   */
  private async generateRadiusScale(
    request: ThemeGenerationRequest
  ): Promise<RadiusScaleResponse> {
    return {
      xs: '0.125rem',   // 2px
      sm: '0.25rem',    // 4px
      md: '0.375rem',   // 6px
      lg: '0.5rem',     // 8px
      xl: '0.75rem',    // 12px
      '2xl': '1rem',    // 16px
      '3xl': '1.5rem',  // 24px
      '4xl': '2rem',    // 32px
    };
  }

  /**
   * Shadow 스케일 생성 (Tailwind v4 표준값)
   */
  private async generateShadowScale(
    request: ThemeGenerationRequest
  ): Promise<ShadowScaleResponse> {
    return {
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      insetShadow: {
        xs: 'inset 0 1px 1px 0 rgb(0 0 0 / 0.05)',
        sm: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      dropShadow: {
        sm: '0 1px 1px rgb(0 0 0 / 0.05)',
        md: '0 4px 3px rgb(0 0 0 / 0.07), 0 2px 2px rgb(0 0 0 / 0.06)',
      },
    };
  }

  /**
   * 생성된 데이터를 DesignToken으로 변환
   */
  private convertToDesignTokens(
    projectId: string,
    themeId: string,
    colorPalette: ColorPaletteResponse,
    typography: TypographyScaleResponse,
    spacing: SpacingScaleResponse,
    radius: RadiusScaleResponse,
    shadows: ShadowScaleResponse
  ): Partial<DesignToken>[] {
    const tokens: Partial<DesignToken>[] = [];

    // Color tokens
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

    // Typography - Font Family
    Object.entries(typography.fontFamily).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `typography.fontFamily.${name}`,
        type: 'typography',
        value,
        scope: 'raw',
        css_variable: `--font-${name}`,
      });
    });

    // Typography - Font Size + Paired Line Height
    Object.entries(typography.fontSize).forEach(([name, value]) => {
      // Font size token
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `typography.fontSize.${name}`,
        type: 'typography',
        value,
        scope: 'raw',
        css_variable: `--text-${name}`,
      });

      // Paired line-height token
      const lineHeightValue = this.calculateLineHeightForSize(name);
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `typography.lineHeight.${name}`,
        type: 'typography',
        value: lineHeightValue,
        scope: 'raw',
        css_variable: `--text-${name}--line-height`,
      });
    });

    // Typography - Font Weight
    Object.entries(typography.fontWeight).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `typography.fontWeight.${name}`,
        type: 'typography',
        value,
        scope: 'raw',
        css_variable: `--font-weight-${name}`,
      });
    });

    // Typography - Letter Spacing
    Object.entries(typography.letterSpacing).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `typography.letterSpacing.${name}`,
        type: 'typography',
        value,
        scope: 'raw',
        css_variable: `--letter-spacing-${name}`,
      });
    });

    // Spacing - Base variable
    tokens.push({
      project_id: projectId,
      theme_id: themeId,
      name: 'spacing.base',
      type: 'spacing',
      value: spacing.xs, // xs를 base로 사용
      scope: 'raw',
      css_variable: '--spacing',
    });

    // Spacing - Scale variables
    Object.entries(spacing).forEach(([name, value]) => {
      if (name === 'xs') return; // xs는 이미 base로 추가됨

      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `spacing.${name}`,
        type: 'spacing',
        value,
        scope: 'raw',
        css_variable: name === '0' ? '--spacing-0' : `--spacing-${name}`,
      });
    });

    // Border Radius
    Object.entries(radius).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `radius.${name}`,
        type: 'other',
        value,
        scope: 'raw',
        css_variable: `--radius-${name}`,
      });
    });

    // Shadows - Box Shadow
    Object.entries(shadows.boxShadow).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `shadow.box.${name}`,
        type: 'other',
        value,
        scope: 'raw',
        css_variable: `--shadow-${name}`,
      });
    });

    // Shadows - Inset Shadow
    Object.entries(shadows.insetShadow).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `shadow.inset.${name}`,
        type: 'other',
        value,
        scope: 'raw',
        css_variable: `--inset-shadow-${name}`,
      });
    });

    // Shadows - Drop Shadow
    Object.entries(shadows.dropShadow).forEach(([name, value]) => {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: `shadow.drop.${name}`,
        type: 'other',
        value,
        scope: 'raw',
        css_variable: `--drop-shadow-${name}`,
      });
    });

    return tokens;
  }

  /**
   * Semantic 토큰 생성 (컴포넌트별 토큰)
   */
  private generateSemanticTokens(
    projectId: string,
    themeId: string,
    colorPalette: ColorPaletteResponse
  ): Partial<DesignToken>[] {
    const tokens: Partial<DesignToken>[] = [];

    // Button tokens
    tokens.push(
      // Primary button
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.button.primary.bg',
        type: 'color',
        value: colorPalette.primary[600],
        scope: 'semantic',
        css_variable: '--button-primary-bg',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.button.primary.text',
        type: 'color',
        value: { h: 0, s: 0, l: 100, a: 1 }, // White
        scope: 'semantic',
        css_variable: '--button-primary-text',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.button.primary.hover',
        type: 'color',
        value: colorPalette.primary[700],
        scope: 'semantic',
        css_variable: '--button-primary-hover',
      },
      // Secondary button
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.button.secondary.bg',
        type: 'color',
        value: colorPalette.neutral[200],
        scope: 'semantic',
        css_variable: '--button-secondary-bg',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.button.secondary.text',
        type: 'color',
        value: colorPalette.neutral[900],
        scope: 'semantic',
        css_variable: '--button-secondary-text',
      }
    );

    // Input tokens
    tokens.push(
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.input.bg',
        type: 'color',
        value: { h: 0, s: 0, l: 100, a: 1 }, // White
        scope: 'semantic',
        css_variable: '--input-bg',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.input.border',
        type: 'color',
        value: colorPalette.neutral[300],
        scope: 'semantic',
        css_variable: '--input-border',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.input.text',
        type: 'color',
        value: colorPalette.neutral[900],
        scope: 'semantic',
        css_variable: '--input-text',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.input.placeholder',
        type: 'color',
        value: colorPalette.neutral[400],
        scope: 'semantic',
        css_variable: '--input-placeholder',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.input.focus',
        type: 'color',
        value: colorPalette.primary[500],
        scope: 'semantic',
        css_variable: '--input-focus',
      }
    );

    // Card tokens
    tokens.push(
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.card.bg',
        type: 'color',
        value: { h: 0, s: 0, l: 100, a: 1 }, // White
        scope: 'semantic',
        css_variable: '--card-bg',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.card.border',
        type: 'color',
        value: colorPalette.neutral[200],
        scope: 'semantic',
        css_variable: '--card-border',
      }
    );

    // Text tokens
    tokens.push(
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.text.primary',
        type: 'color',
        value: colorPalette.neutral[900],
        scope: 'semantic',
        css_variable: '--text-primary',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.text.secondary',
        type: 'color',
        value: colorPalette.neutral[600],
        scope: 'semantic',
        css_variable: '--text-secondary',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.text.muted',
        type: 'color',
        value: colorPalette.neutral[400],
        scope: 'semantic',
        css_variable: '--text-muted',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.text.link',
        type: 'color',
        value: colorPalette.primary[600],
        scope: 'semantic',
        css_variable: '--text-link',
      }
    );

    // Background tokens
    tokens.push(
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.bg.primary',
        type: 'color',
        value: { h: 0, s: 0, l: 100, a: 1 }, // White
        scope: 'semantic',
        css_variable: '--bg-primary',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.bg.secondary',
        type: 'color',
        value: colorPalette.neutral[50],
        scope: 'semantic',
        css_variable: '--bg-secondary',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.bg.muted',
        type: 'color',
        value: colorPalette.neutral[100],
        scope: 'semantic',
        css_variable: '--bg-muted',
      }
    );

    // Border tokens
    tokens.push(
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.border.default',
        type: 'color',
        value: colorPalette.neutral[200],
        scope: 'semantic',
        css_variable: '--border-default',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.border.strong',
        type: 'color',
        value: colorPalette.neutral[300],
        scope: 'semantic',
        css_variable: '--border-strong',
      }
    );

    // Status tokens
    tokens.push(
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.status.success',
        type: 'color',
        value: colorPalette.success[600],
        scope: 'semantic',
        css_variable: '--status-success',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.status.warning',
        type: 'color',
        value: colorPalette.warning[600],
        scope: 'semantic',
        css_variable: '--status-warning',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.status.error',
        type: 'color',
        value: colorPalette.error[600],
        scope: 'semantic',
        css_variable: '--status-error',
      },
      {
        project_id: projectId,
        theme_id: themeId,
        name: 'color.status.info',
        type: 'color',
        value: colorPalette.info[600],
        scope: 'semantic',
        css_variable: '--status-info',
      }
    );

    return tokens;
  }
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
