/**
 * HCT Theme Generator
 * Material 3 Dynamic Color based theme generation using HCT algorithm
 */

import { useState, useMemo, useCallback } from 'react';
import {
  HctThemeService,
  previewHctScheme,
  previewTonalPalettes,
} from '../../../../services/theme';
import type {
  HctThemeRequest,
  HctThemeResponse,
  HctGenerationProgress,
  HctGenerationStage,
} from '../../../../services/theme/HctThemeService';
import type { SchemeVariant, MaterialScheme, TonalPaletteSet } from '../../../../utils/theme/hctUtils';
import { useAsyncMutation } from '@/builder/hooks';
import '../styles/HctThemeGenerator.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - 직접 CSS 클래스 사용
 */
const styles = {
  container: 'hct-generator-container',
  form: 'hct-generator-form',
  formGroup: 'form-group',
  preview: 'hct-preview-section',
  results: 'generation-results',
};

interface HctThemeGeneratorProps {
  projectId: string;
  onThemeGenerated?: (themeId: string) => void;
}

const stageLabels: Record<HctGenerationStage, string> = {
  analyzing: 'Analyzing source color',
  palettes: 'Generating tonal palettes',
  schemes: 'Creating color schemes',
  tokens: 'Converting to tokens',
  saving: 'Saving theme',
  complete: 'Complete',
};

const variantDescriptions: Record<SchemeVariant, { name: string; description: string }> = {
  tonalSpot: {
    name: 'Tonal Spot',
    description: 'Default Material 3 scheme. Balanced and versatile.',
  },
  vibrant: {
    name: 'Vibrant',
    description: 'High chroma colors for bold, energetic designs.',
  },
  expressive: {
    name: 'Expressive',
    description: 'Playful colors with shifted tertiary for creative apps.',
  },
  neutral: {
    name: 'Neutral',
    description: 'Subtle colors. Content-focused, minimal UI.',
  },
  monochrome: {
    name: 'Monochrome',
    description: 'Grayscale scheme. Professional and elegant.',
  },
  fidelity: {
    name: 'Fidelity',
    description: 'Maximum chroma. True to source color.',
  },
  content: {
    name: 'Content',
    description: 'Uses source color directly. Best for image-derived colors.',
  },
};

export function HctThemeGenerator({
  projectId,
  onThemeGenerated,
}: HctThemeGeneratorProps) {

  // Form state
  const [themeName, setThemeName] = useState('');
  const [sourceColor, setSourceColor] = useState('#6750A4'); // Material Purple
  const [variant, setVariant] = useState<SchemeVariant>('tonalSpot');
  const [contrastLevel, setContrastLevel] = useState(0);
  const [includeDarkMode, setIncludeDarkMode] = useState(true);
  const [description, setDescription] = useState('');

  // Preview state
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [progress, setProgress] = useState<HctGenerationProgress | null>(null);

  // Real-time preview
  const previewScheme = useMemo(() => {
    return previewHctScheme(
      sourceColor,
      variant,
      previewMode === 'dark',
      contrastLevel
    );
  }, [sourceColor, variant, previewMode, contrastLevel]);

  const previewPalettes = useMemo(() => {
    return previewTonalPalettes(sourceColor, variant);
  }, [sourceColor, variant]);

  // Generate mutation
  const generateMutation = useAsyncMutation<HctThemeResponse, HctThemeRequest>(
    async (request) => {
      const service = new HctThemeService();
      let finalResult: HctThemeResponse | null = null;

      for await (const progressData of service.generateTheme(request)) {
        setProgress(progressData);

        if (progressData.stage === 'complete' && progressData.data) {
          finalResult = progressData.data as HctThemeResponse;
        }
      }

      return finalResult!;
    },
    {
      onSuccess: (result) => {
        if (onThemeGenerated && result.themeId) {
          onThemeGenerated(result.themeId);
        }
      },
    }
  );

  const handleGenerate = useCallback(async () => {
    if (!themeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    setProgress(null);

    const request: HctThemeRequest = {
      projectId,
      themeName,
      sourceColor,
      variant,
      contrastLevel,
      includeDarkMode,
      description: description || undefined,
    };

    try {
      await generateMutation.execute(request);
    } catch (err) {
      console.error('[HctThemeGenerator] Generation failed:', err);
    }
  }, [
    themeName,
    projectId,
    sourceColor,
    variant,
    contrastLevel,
    includeDarkMode,
    description,
    generateMutation,
  ]);

  const handleReset = useCallback(() => {
    setProgress(null);
    generateMutation.reset();
    setThemeName('');
    setSourceColor('#6750A4');
    setVariant('tonalSpot');
    setContrastLevel(0);
    setIncludeDarkMode(true);
    setDescription('');
  }, [generateMutation]);

  return (
    <div className={styles.container}>
      <div className="hct-header">
        <h2>HCT Theme Generator</h2>
        <p className="subtitle">
          Generate Material 3 compliant themes using Google's HCT (Hue, Chroma, Tone) algorithm
        </p>
      </div>

      <div className="hct-content">
        {/* Left: Form + Preview Scheme */}
        <div className="hct-form-section">
          {!generateMutation.isLoading && !generateMutation.data && (
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
              {/* Theme Name */}
              <div className={styles.formGroup}>
                <label htmlFor="hct-theme-name">
                  Theme Name <span className="required">*</span>
                </label>
                <input
                  id="hct-theme-name"
                  type="text"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="e.g., Ocean Blue Theme"
                  required
                />
              </div>

              {/* Source Color */}
              <div className={styles.formGroup}>
                <label htmlFor="hct-source-color">Source Color</label>
                <div className="color-input-group">
                  <input
                    id="hct-source-color"
                    type="color"
                    value={sourceColor}
                    onChange={(e) => setSourceColor(e.target.value)}
                  />
                  <input
                    type="text"
                    value={sourceColor}
                    onChange={(e) => setSourceColor(e.target.value)}
                    placeholder="#6750A4"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
                <p className="field-hint">
                  All colors will be derived from this source using HCT algorithm
                </p>
              </div>

              {/* Variant Selection */}
              <div className={styles.formGroup}>
                <label htmlFor="hct-variant">Scheme Variant</label>
                <select
                  id="hct-variant"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value as SchemeVariant)}
                >
                  {Object.entries(variantDescriptions).map(([key, { name }]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="field-hint variant-description">
                  {variantDescriptions[variant].description}
                </p>
              </div>

              {/* Contrast Level */}
              <div className={styles.formGroup}>
                <label htmlFor="hct-contrast">
                  Contrast Level: {contrastLevel.toFixed(1)}
                </label>
                <input
                  id="hct-contrast"
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={contrastLevel}
                  onChange={(e) => setContrastLevel(parseFloat(e.target.value))}
                />
                <div className="contrast-labels">
                  <span>Low</span>
                  <span>Normal</span>
                  <span>High</span>
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className={styles.formGroup}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeDarkMode}
                    onChange={(e) => setIncludeDarkMode(e.target.checked)}
                  />
                  Include Dark Mode Tokens
                </label>
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label htmlFor="hct-description">Description (optional)</label>
                <textarea
                  id="hct-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your theme purpose..."
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="generate-btn hct-generate-btn">
                Generate Theme
              </button>
            </form>
          )}

          {/* Progress */}
          {generateMutation.isLoading && progress && (
            <div className="progress-container">
              <div className="progress-header">
                <h3>{stageLabels[progress.stage]}</h3>
                <span className="progress-percentage">{progress.progress}%</span>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>

              <p className="progress-message">{progress.message}</p>

              {/* Stage Indicators */}
              <div className="stage-indicators hct-stages">
                {(['analyzing', 'palettes', 'schemes', 'tokens', 'saving'] as HctGenerationStage[]).map((stage) => {
                  const stages = ['analyzing', 'palettes', 'schemes', 'tokens', 'saving'];
                  const currentIndex = stages.indexOf(progress.stage);
                  const stageIndex = stages.indexOf(stage);

                  return (
                    <div
                      key={stage}
                      className={`stage-indicator ${
                        progress.stage === stage ? 'active' : ''
                      } ${currentIndex > stageIndex ? 'completed' : ''}`}
                    >
                      <div className="stage-icon" />
                      <span className="stage-label">{stageLabels[stage]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          {generateMutation.data && (
            <div className={styles.results}>
              <div className="result-header">
                <h3>Theme Generated!</h3>
                <button onClick={handleReset} className="new-theme-btn">
                  + New Theme
                </button>
              </div>

              <div className="result-stats">
                <div className="stat-item">
                  <span className="stat-label">Theme Name</span>
                  <span className="stat-value">{generateMutation.data.themeName}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Algorithm</span>
                  <span className="stat-value">HCT ({variantDescriptions[generateMutation.data.variant].name})</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tokens Generated</span>
                  <span className="stat-value">{generateMutation.data.metadata.tokenCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {generateMutation.error && (
            <div className="error-message">
              <h3>Error</h3>
              <p>{generateMutation.error.message}</p>
              <button onClick={handleReset}>Try Again</button>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className={styles.preview}>
          <div className="preview-header">
            <h3>Live Preview</h3>
            <div className="preview-mode-toggle">
              <button
                className={previewMode === 'light' ? 'active' : ''}
                onClick={() => setPreviewMode('light')}
              >
                Light
              </button>
              <button
                className={previewMode === 'dark' ? 'active' : ''}
                onClick={() => setPreviewMode('dark')}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Scheme Preview */}
          <div className="scheme-preview" data-mode={previewMode}>
            <SchemeColorGrid scheme={previewScheme} />
          </div>

          {/* Tonal Palettes Preview */}
          <div className="palettes-preview">
            <h4>Tonal Palettes</h4>
            <TonalPaletteGrid palettes={previewPalettes} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Scheme Color Grid Component
 */
function SchemeColorGrid({ scheme }: { scheme: MaterialScheme }) {
  const colorGroups = [
    {
      label: 'Primary',
      colors: [
        { name: 'Primary', value: scheme.primary, textColor: scheme.onPrimary },
        { name: 'On Primary', value: scheme.onPrimary },
        { name: 'Primary Container', value: scheme.primaryContainer, textColor: scheme.onPrimaryContainer },
        { name: 'On Primary Container', value: scheme.onPrimaryContainer },
      ],
    },
    {
      label: 'Secondary',
      colors: [
        { name: 'Secondary', value: scheme.secondary, textColor: scheme.onSecondary },
        { name: 'On Secondary', value: scheme.onSecondary },
        { name: 'Secondary Container', value: scheme.secondaryContainer, textColor: scheme.onSecondaryContainer },
        { name: 'On Secondary Container', value: scheme.onSecondaryContainer },
      ],
    },
    {
      label: 'Tertiary',
      colors: [
        { name: 'Tertiary', value: scheme.tertiary, textColor: scheme.onTertiary },
        { name: 'On Tertiary', value: scheme.onTertiary },
        { name: 'Tertiary Container', value: scheme.tertiaryContainer, textColor: scheme.onTertiaryContainer },
        { name: 'On Tertiary Container', value: scheme.onTertiaryContainer },
      ],
    },
    {
      label: 'Error',
      colors: [
        { name: 'Error', value: scheme.error, textColor: scheme.onError },
        { name: 'On Error', value: scheme.onError },
        { name: 'Error Container', value: scheme.errorContainer, textColor: scheme.onErrorContainer },
        { name: 'On Error Container', value: scheme.onErrorContainer },
      ],
    },
    {
      label: 'Surface',
      colors: [
        { name: 'Surface', value: scheme.surface, textColor: scheme.onSurface },
        { name: 'On Surface', value: scheme.onSurface },
        { name: 'Surface Variant', value: scheme.surfaceVariant, textColor: scheme.onSurfaceVariant },
        { name: 'On Surface Variant', value: scheme.onSurfaceVariant },
      ],
    },
    {
      label: 'Container',
      colors: [
        { name: 'Lowest', value: scheme.surfaceContainerLowest },
        { name: 'Low', value: scheme.surfaceContainerLow },
        { name: 'Default', value: scheme.surfaceContainer },
        { name: 'High', value: scheme.surfaceContainerHigh },
        { name: 'Highest', value: scheme.surfaceContainerHighest },
      ],
    },
  ];

  return (
    <div className="scheme-color-grid">
      {colorGroups.map((group) => (
        <div key={group.label} className="color-group">
          <span className="group-label">{group.label}</span>
          <div className="color-row">
            {group.colors.map((color) => (
              <div
                key={color.name}
                className="color-swatch"
                style={{
                  backgroundColor: color.value,
                  color: color.textColor || (isLightColor(color.value) ? '#000' : '#fff'),
                }}
                title={`${color.name}\n${color.value}`}
              >
                <span className="swatch-name">{color.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Tonal Palette Grid Component
 */
function TonalPaletteGrid({ palettes }: { palettes: TonalPaletteSet }) {
  const paletteNames: (keyof TonalPaletteSet)[] = [
    'primary',
    'secondary',
    'tertiary',
    'neutral',
    'neutralVariant',
    'error',
  ];

  const toneSteps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

  return (
    <div className="tonal-palette-grid">
      {paletteNames.map((name) => {
        const palette = palettes[name];
        return (
          <div key={name} className="palette-row">
            <span className="palette-name">{formatPaletteName(name)}</span>
            <div className="tone-swatches">
              {toneSteps.map((tone) => {
                const color = palette.tones[tone];
                if (!color) return null;
                return (
                  <div
                    key={tone}
                    className="tone-swatch"
                    style={{ backgroundColor: color }}
                    title={`Tone ${tone}: ${color}`}
                  >
                    <span className="tone-value">{tone}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function formatPaletteName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default HctThemeGenerator;
