/**
 * HCT Theme Service
 * Material 3 Dynamic Color based theme generation using HCT color space
 */

import type { DesignToken, ColorValueHSL } from '../../types/theme';
import {
  generateMaterialScheme,
  generateShadePalette,
  generateTonalPaletteSet,
  hctFromHex,
  type SchemeVariant,
  type MaterialScheme,
  type TonalPaletteSet,
} from '../../utils/theme/hctUtils';
import { hexToHsl } from '../../utils/theme/colorUtils';
import { ThemeService } from './ThemeService';
import { TokenService } from './TokenService';

// ============================================================================
// Types
// ============================================================================

export interface HctThemeRequest {
  projectId: string;
  themeName: string;
  sourceColor: string; // Hex color
  variant?: SchemeVariant;
  contrastLevel?: number; // -1 to 1, 0 = normal
  includeDarkMode?: boolean;
  description?: string;
}

export interface HctThemeResponse {
  themeId: string;
  themeName: string;
  sourceColor: string;
  variant: SchemeVariant;
  lightScheme: MaterialScheme;
  darkScheme?: MaterialScheme;
  tonalPalettes: TonalPaletteSet;
  tokens: DesignToken[];
  metadata: {
    generatedAt: string;
    algorithm: 'hct';
    tokenCount: number;
    variant: SchemeVariant;
    contrastLevel: number;
  };
}

export type HctGenerationStage =
  | 'analyzing'
  | 'palettes'
  | 'schemes'
  | 'tokens'
  | 'saving'
  | 'complete';

export interface HctGenerationProgress {
  stage: HctGenerationStage;
  progress: number;
  message: string;
  data?: Partial<HctThemeResponse>;
}

// ============================================================================
// Service
// ============================================================================

export class HctThemeService {
  /**
   * Generate complete theme using HCT algorithm (streaming)
   */
  async *generateTheme(
    request: HctThemeRequest
  ): AsyncGenerator<HctGenerationProgress> {
    const variant = request.variant || 'tonalSpot';
    const contrastLevel = request.contrastLevel || 0;
    const includeDarkMode = request.includeDarkMode ?? true;

    try {
      // Stage 1: Analyzing
      yield {
        stage: 'analyzing',
        progress: 10,
        message: 'Analyzing source color...',
      };

      const sourceHct = hctFromHex(request.sourceColor);
      console.log('[HctThemeService] Source HCT:', sourceHct);

      // Stage 2: Generate Tonal Palettes
      yield {
        stage: 'palettes',
        progress: 25,
        message: 'Generating tonal palettes...',
      };

      const tonalPalettes = generateTonalPaletteSet(request.sourceColor, variant);

      yield {
        stage: 'palettes',
        progress: 40,
        message: 'Tonal palettes generated',
        data: { tonalPalettes },
      };

      // Stage 3: Generate Color Schemes
      yield {
        stage: 'schemes',
        progress: 50,
        message: 'Generating color schemes...',
      };

      const lightScheme = generateMaterialScheme(
        request.sourceColor,
        variant,
        false,
        contrastLevel
      );

      let darkScheme: MaterialScheme | undefined;
      if (includeDarkMode) {
        darkScheme = generateMaterialScheme(
          request.sourceColor,
          variant,
          true,
          contrastLevel
        );
      }

      yield {
        stage: 'schemes',
        progress: 65,
        message: 'Color schemes generated',
        data: { lightScheme, darkScheme },
      };

      // Stage 4: Convert to Design Tokens
      yield {
        stage: 'tokens',
        progress: 75,
        message: 'Converting to design tokens...',
      };

      // Create theme first to get ID
      const theme = await ThemeService.createTheme({
        project_id: request.projectId,
        name: request.themeName,
        status: 'draft',
        supports_dark_mode: includeDarkMode,
      });

      const tokens = this.convertToDesignTokens(
        request.projectId,
        theme.id,
        request.sourceColor,
        tonalPalettes,
        lightScheme,
        darkScheme
      );

      yield {
        stage: 'tokens',
        progress: 85,
        message: `Generated ${tokens.length} design tokens`,
      };

      // Stage 5: Save to Database
      yield {
        stage: 'saving',
        progress: 90,
        message: 'Saving theme to database...',
      };

      await TokenService.bulkUpsertTokens(tokens);

      // Complete
      const response: HctThemeResponse = {
        themeId: theme.id,
        themeName: request.themeName,
        sourceColor: request.sourceColor,
        variant,
        lightScheme,
        darkScheme,
        tonalPalettes,
        tokens: tokens as DesignToken[],
        metadata: {
          generatedAt: new Date().toISOString(),
          algorithm: 'hct',
          tokenCount: tokens.length,
          variant,
          contrastLevel,
        },
      };

      yield {
        stage: 'complete',
        progress: 100,
        message: 'Theme generation complete!',
        data: response,
      };
    } catch (error) {
      console.error('[HctThemeService] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Convert HCT-generated data to design tokens
   */
  private convertToDesignTokens(
    projectId: string,
    themeId: string,
    sourceColor: string,
    tonalPalettes: TonalPaletteSet,
    lightScheme: MaterialScheme,
    darkScheme?: MaterialScheme
  ): Partial<DesignToken>[] {
    const tokens: Partial<DesignToken>[] = [];

    // =====================================================================
    // 1. Shade-based color tokens (50-950) for compatibility
    // =====================================================================
    const paletteNames: (keyof TonalPaletteSet)[] = [
      'primary',
      'secondary',
      'tertiary',
      'neutral',
      'neutralVariant',
      'error',
    ];

    for (const paletteName of paletteNames) {
      // Generate shade palette from source
      const paletteData = tonalPalettes[paletteName];
      const shades = generateShadePalette(`#${paletteData.tones[50].slice(1)}`);

      // Map palette names for CSS variable compatibility
      const cssName = paletteName === 'neutralVariant' ? 'surface' : paletteName;

      for (const [shade, hsl] of Object.entries(shades)) {
        tokens.push({
          project_id: projectId,
          theme_id: themeId,
          name: `color.${cssName}.${shade}`,
          type: 'color',
          value: hsl as ColorValueHSL,
          scope: 'raw',
          css_variable: `--color-${cssName}-${shade}`,
        });
      }
    }

    // =====================================================================
    // 2. M3 Semantic Color Tokens (Light Mode)
    // =====================================================================
    const schemeColors = Object.entries(lightScheme) as [keyof MaterialScheme, string][];
    for (const [role, hex] of schemeColors) {
      const hsl = hexToHsl(hex);
      if (hsl) {
        // Convert camelCase to kebab-case
        const cssRole = role.replace(/([A-Z])/g, '-$1').toLowerCase();
        tokens.push({
          project_id: projectId,
          theme_id: themeId,
          name: `color.m3.${role}`,
          type: 'color',
          value: hsl,
          scope: 'semantic',
          css_variable: `--color-m3${cssRole}`,
        });
      }
    }

    // =====================================================================
    // 3. M3 Semantic Color Tokens (Dark Mode)
    // =====================================================================
    if (darkScheme) {
      const darkSchemeColors = Object.entries(darkScheme) as [keyof MaterialScheme, string][];
      for (const [role, hex] of darkSchemeColors) {
        const hsl = hexToHsl(hex);
        if (hsl) {
          const cssRole = role.replace(/([A-Z])/g, '-$1').toLowerCase();
          tokens.push({
            project_id: projectId,
            theme_id: themeId,
            name: `color.m3.dark.${role}`,
            type: 'color',
            value: hsl,
            scope: 'semantic',
            css_variable: `--color-m3-dark${cssRole}`,
          });
        }
      }
    }

    // =====================================================================
    // 4. Source Color Token
    // =====================================================================
    const sourceHsl = hexToHsl(sourceColor);
    if (sourceHsl) {
      tokens.push({
        project_id: projectId,
        theme_id: themeId,
        name: 'color.source',
        type: 'color',
        value: sourceHsl,
        scope: 'raw',
        css_variable: '--color-source',
      });
    }

    return tokens;
  }
}

/**
 * Quick generation (non-streaming)
 */
export async function generateHctTheme(
  request: HctThemeRequest
): Promise<HctThemeResponse> {
  const service = new HctThemeService();
  let result: HctThemeResponse | null = null;

  for await (const progress of service.generateTheme(request)) {
    if (progress.stage === 'complete' && progress.data) {
      result = progress.data as HctThemeResponse;
    }
  }

  if (!result) {
    throw new Error('Theme generation failed');
  }

  return result;
}

/**
 * Preview scheme without saving (useful for UI preview)
 */
export function previewHctScheme(
  sourceColor: string,
  variant: SchemeVariant = 'tonalSpot',
  isDark: boolean = false,
  contrastLevel: number = 0
): MaterialScheme {
  return generateMaterialScheme(sourceColor, variant, isDark, contrastLevel);
}

/**
 * Preview tonal palettes without saving
 */
export function previewTonalPalettes(
  sourceColor: string,
  variant: SchemeVariant = 'tonalSpot'
): TonalPaletteSet {
  return generateTonalPaletteSet(sourceColor, variant);
}

// Export singleton
export const hctThemeService = new HctThemeService();
