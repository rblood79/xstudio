/**
 * Dark Mode Service
 * 라이트 모드 토큰을 다크 모드로 자동 변환
 */

import type { DesignToken, ColorValueHSL } from '../../types/theme';

export interface DarkModeOptions {
  /**
   * 배경색 밝기 반전 강도 (0-1)
   * 1 = 완전 반전, 0.5 = 부분 반전
   */
  inversionStrength?: number;

  /**
   * 채도 조정 (-100 ~ 100)
   * 다크 모드에서 채도를 낮추거나 높임
   */
  saturationAdjustment?: number;

  /**
   * 명도 오프셋 (-100 ~ 100)
   * 전체적인 명도 조정
   */
  lightnessOffset?: number;

  /**
   * 텍스트 색상 자동 조정
   */
  adjustTextColors?: boolean;

  /**
   * 접근성 대비 비율 자동 보정
   */
  ensureContrast?: boolean;
}

export interface DarkModeResult {
  darkTokens: DesignToken[];
  metadata: {
    sourceThemeId: string;
    darkThemeId: string;
    generatedAt: string;
    tokenCount: number;
    options: DarkModeOptions;
  };
}

/**
 * 다크 모드 자동 변환 서비스
 */
export class DarkModeService {
  private static readonly DEFAULT_OPTIONS: DarkModeOptions = {
    inversionStrength: 1,
    saturationAdjustment: -10,
    lightnessOffset: 0,
    adjustTextColors: true,
    ensureContrast: true,
  };

  /**
   * 라이트 모드 토큰을 다크 모드로 변환
   */
  static async convertToDarkMode(
    lightTokens: DesignToken[],
    options: DarkModeOptions = {}
  ): Promise<DesignToken[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    return lightTokens.map((token) => {
      if (token.type === 'color' && token.value && typeof token.value === 'object') {
        const lightColor = token.value as ColorValueHSL;
        const darkColor = this.convertColorToDark(lightColor, token, opts);

        return {
          ...token,
          value: darkColor,
        };
      }

      // 다른 타입의 토큰은 그대로 반환
      return token;
    });
  }

  /**
   * 색상을 다크 모드로 변환
   */
  private static convertColorToDark(
    color: ColorValueHSL,
    token: DesignToken,
    options: DarkModeOptions
  ): ColorValueHSL {
    const { h, s, l, a = 1 } = color;

    // 토큰 이름 기반 변환 전략
    const tokenName = token.name.toLowerCase();
    const isBackground = tokenName.includes('background') || tokenName.includes('bg');
    const isText = tokenName.includes('text') || tokenName.includes('foreground');
    const isBorder = tokenName.includes('border');
    const isPrimary = tokenName.includes('primary');

    let newL = l;
    let newS = s;

    // 1. 배경색 변환 (밝은 색 → 어두운 색)
    if (isBackground) {
      newL = this.invertLightness(l, options.inversionStrength || 1);
      // 배경은 채도를 더 낮춤
      newS = Math.max(0, s + (options.saturationAdjustment || -10) - 5);
    }
    // 2. 텍스트 변환 (어두운 색 → 밝은 색)
    else if (isText && options.adjustTextColors) {
      newL = this.invertLightness(l, options.inversionStrength || 1);
      // 텍스트는 채도를 약간만 조정
      newS = Math.max(0, s + (options.saturationAdjustment || -10) * 0.5);
    }
    // 3. 테두리 변환 (중간 밝기 유지)
    else if (isBorder) {
      // 테두리는 약간만 어둡게
      newL = Math.max(20, Math.min(80, 100 - l));
      newS = Math.max(0, s + (options.saturationAdjustment || -10));
    }
    // 4. Primary/Accent 색상 (브랜드 색상은 보존하되 약간 조정)
    else if (isPrimary) {
      // 명도만 약간 조정 (채도 유지)
      newL = this.adjustPrimaryLightness(l);
      newS = s; // 채도 유지
    }
    // 5. 기타 색상 (일반적인 반전)
    else {
      newL = this.invertLightness(l, options.inversionStrength || 1);
      newS = Math.max(0, s + (options.saturationAdjustment || -10));
    }

    // 명도 오프셋 적용
    newL = Math.max(0, Math.min(100, newL + (options.lightnessOffset || 0)));

    // 접근성 대비 보정
    if (options.ensureContrast) {
      newL = this.ensureContrast(newL, isBackground, isText);
    }

    return {
      h,
      s: Math.round(newS),
      l: Math.round(newL),
      a,
    };
  }

  /**
   * 명도 반전
   */
  private static invertLightness(lightness: number, strength: number): number {
    const inverted = 100 - lightness;
    return lightness + (inverted - lightness) * strength;
  }

  /**
   * Primary 색상 명도 조정 (다크 모드에 적합하게)
   */
  private static adjustPrimaryLightness(lightness: number): number {
    // Primary 색상은 다크 모드에서 약간 밝게
    if (lightness < 50) {
      return lightness + 20; // 어두운 색은 밝게
    } else if (lightness > 70) {
      return lightness - 10; // 너무 밝은 색은 약간 어둡게
    }
    return lightness;
  }

  /**
   * 접근성 대비 보정
   */
  private static ensureContrast(
    lightness: number,
    isBackground: boolean,
    isText: boolean
  ): number {
    // 배경은 충분히 어둡게 (< 30%)
    if (isBackground && lightness > 30) {
      return Math.min(30, lightness);
    }

    // 텍스트는 충분히 밝게 (> 70%)
    if (isText && lightness < 70) {
      return Math.max(70, lightness);
    }

    return lightness;
  }

  /**
   * 테마 전체를 다크 모드로 변환하고 새 테마로 저장
   */
  static async generateDarkTheme(
    sourceThemeId: string,
    lightTokens: DesignToken[],
    darkThemeName: string,
    options: DarkModeOptions = {}
  ): Promise<DarkModeResult> {
    // 다크 모드 토큰 생성
    const darkTokens = await this.convertToDarkMode(lightTokens, options);

    // 토큰 이름에 '-dark' suffix 추가
    const renamedTokens = darkTokens.map((token) => ({
      ...token,
      name: token.name.includes('-dark') ? token.name : `${token.name}-dark`,
      css_variable: token.css_variable
        ? token.css_variable.replace('--', '--dark-')
        : undefined,
    }));

    return {
      darkTokens: renamedTokens,
      metadata: {
        sourceThemeId,
        darkThemeId: `${sourceThemeId}-dark`,
        generatedAt: new Date().toISOString(),
        tokenCount: renamedTokens.length,
        options,
      },
    };
  }

  /**
   * 다크 모드 프리셋
   */
  static readonly PRESETS = {
    /**
     * 기본 다크 모드 (균형잡힌 변환)
     */
    default: {
      inversionStrength: 1,
      saturationAdjustment: -10,
      lightnessOffset: 0,
      adjustTextColors: true,
      ensureContrast: true,
    } as DarkModeOptions,

    /**
     * 진한 다크 모드 (OLED 최적화)
     */
    oled: {
      inversionStrength: 1,
      saturationAdjustment: -15,
      lightnessOffset: -10,
      adjustTextColors: true,
      ensureContrast: true,
    } as DarkModeOptions,

    /**
     * 부드러운 다크 모드 (눈의 피로 최소화)
     */
    soft: {
      inversionStrength: 0.8,
      saturationAdjustment: -5,
      lightnessOffset: 5,
      adjustTextColors: true,
      ensureContrast: true,
    } as DarkModeOptions,

    /**
     * 고대비 다크 모드 (접근성 최대화)
     */
    highContrast: {
      inversionStrength: 1,
      saturationAdjustment: -20,
      lightnessOffset: 0,
      adjustTextColors: true,
      ensureContrast: true,
    } as DarkModeOptions,
  };
}
