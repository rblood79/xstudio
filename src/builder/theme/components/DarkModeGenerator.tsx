/**
 * Dark Mode Generator
 * 라이트 모드 테마를 다크 모드로 자동 변환
 */

import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { DarkModeService } from '../../../services/theme/DarkModeService';
import type { DarkModeOptions } from '../../../services/theme/DarkModeService';
import { useTokens } from '../../../hooks/theme/useTokens';
import { useThemes } from '../../../hooks/theme/useThemes';
import type { DesignToken, ColorValueHSL } from '../../../types/theme/token.types';
import '../styles/DarkModeGenerator.css';

const darkModeStyles = tv({
  slots: {
    container: 'dark-mode-container',
    form: 'dark-mode-form',
    preview: 'dark-mode-preview',
  },
});

interface DarkModeGeneratorProps {
  themeId: string;
  projectId: string;
  onDarkThemeCreated?: (darkThemeId: string) => void;
}

type PresetName = 'default' | 'oled' | 'soft' | 'highContrast';

export function DarkModeGenerator({
  themeId,
  projectId,
  onDarkThemeCreated,
}: DarkModeGeneratorProps) {
  const styles = darkModeStyles();

  const { tokens: lightTokens, loading } = useTokens({
    themeId,
    enableRealtime: false,
  });

  const { createTheme } = useThemes({ projectId, enableRealtime: false });

  const [preset, setPreset] = useState<PresetName>('default');
  const [customOptions, setCustomOptions] = useState<DarkModeOptions>(
    DarkModeService.PRESETS.default
  );
  const [darkThemeName, setDarkThemeName] = useState('');

  const [previewTokens, setPreviewTokens] = useState<DesignToken[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePresetChange = (newPreset: PresetName) => {
    setPreset(newPreset);
    setCustomOptions(DarkModeService.PRESETS[newPreset]);
  };

  const handleOptionChange = (key: keyof DarkModeOptions, value: any) => {
    setCustomOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePreview = async () => {
    setError(null);

    try {
      const darkTokens = await DarkModeService.convertToDarkMode(
        lightTokens,
        customOptions
      );
      setPreviewTokens(darkTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : '미리보기 실패');
      console.error('[DarkModeGenerator] Preview failed:', err);
    }
  };

  const handleGenerate = async () => {
    if (!darkThemeName.trim()) {
      alert('다크 테마 이름을 입력하세요');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. 다크 모드 토큰 생성
      const result = await DarkModeService.generateDarkTheme(
        themeId,
        lightTokens,
        darkThemeName,
        customOptions
      );

      // 2. 새 다크 테마 생성
      const newThemeId = await createTheme(darkThemeName);

      // 3. 다크 토큰 저장
      // TODO: TokenService를 사용하여 토큰 일괄 저장
      // await TokenService.bulkCreate(newThemeId, result.darkTokens);

      setSuccess(true);

      if (onDarkThemeCreated) {
        onDarkThemeCreated(newThemeId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '다크 테마 생성 실패');
      console.error('[DarkModeGenerator] Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setPreviewTokens([]);
    setSuccess(false);
    setError(null);
    setDarkThemeName('');
  };

  // 색상 토큰만 필터링 (프리뷰용)
  const colorTokens = lightTokens.filter((t) => t.type === 'color');
  const previewColorTokens = previewTokens.filter((t) => t.type === 'color');

  return (
    <div className={styles.container()}>
      <h2>다크 모드 생성</h2>
      <p className="subtitle">
        라이트 모드 테마를 기반으로 다크 모드 테마를 자동 생성합니다
      </p>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>토큰 로딩 중...</p>
        </div>
      )}

      {!loading && !success && (
        <>
          <form className={styles.form()} onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
            {/* Dark Theme Name */}
            <div className="form-group">
              <label htmlFor="dark-theme-name">
                다크 테마 이름 <span className="required">*</span>
              </label>
              <input
                id="dark-theme-name"
                type="text"
                value={darkThemeName}
                onChange={(e) => setDarkThemeName(e.target.value)}
                placeholder="예: Dark Theme"
                required
              />
            </div>

            {/* Preset Selection */}
            <div className="form-group">
              <label htmlFor="preset">프리셋</label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value as PresetName)}
              >
                <option value="default">기본 (균형잡힌 변환)</option>
                <option value="oled">진한 다크 (OLED 최적화)</option>
                <option value="soft">부드러운 다크 (눈의 피로 최소화)</option>
                <option value="highContrast">고대비 (접근성 최대화)</option>
              </select>
              <p className="field-hint">
                프리셋을 선택하면 최적화된 변환 옵션이 자동 설정됩니다
              </p>
            </div>

            {/* Custom Options */}
            <div className="options-panel">
              <h3>세부 옵션</h3>

              <div className="form-group">
                <label htmlFor="inversion-strength">
                  반전 강도: {customOptions.inversionStrength?.toFixed(1)}
                </label>
                <input
                  id="inversion-strength"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={customOptions.inversionStrength || 1}
                  onChange={(e) =>
                    handleOptionChange('inversionStrength', parseFloat(e.target.value))
                  }
                />
                <p className="field-hint">배경색 밝기 반전 강도 (0 = 변환 없음, 1 = 완전 반전)</p>
              </div>

              <div className="form-group">
                <label htmlFor="saturation-adjustment">
                  채도 조정: {customOptions.saturationAdjustment}%
                </label>
                <input
                  id="saturation-adjustment"
                  type="range"
                  min="-30"
                  max="30"
                  step="5"
                  value={customOptions.saturationAdjustment || 0}
                  onChange={(e) =>
                    handleOptionChange('saturationAdjustment', parseInt(e.target.value))
                  }
                />
                <p className="field-hint">다크 모드에서 색상 채도 조정</p>
              </div>

              <div className="form-group">
                <label htmlFor="lightness-offset">
                  명도 오프셋: {customOptions.lightnessOffset}%
                </label>
                <input
                  id="lightness-offset"
                  type="range"
                  min="-20"
                  max="20"
                  step="5"
                  value={customOptions.lightnessOffset || 0}
                  onChange={(e) =>
                    handleOptionChange('lightnessOffset', parseInt(e.target.value))
                  }
                />
                <p className="field-hint">전체적인 명도 조정</p>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={customOptions.adjustTextColors !== false}
                    onChange={(e) =>
                      handleOptionChange('adjustTextColors', e.target.checked)
                    }
                  />
                  텍스트 색상 자동 조정
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={customOptions.ensureContrast !== false}
                    onChange={(e) => handleOptionChange('ensureContrast', e.target.checked)}
                  />
                  접근성 대비 자동 보정
                </label>
              </div>
            </div>

            {/* Token Count Info */}
            <div className="token-count-info">
              <span className="info-label">변환 대상 색상 토큰</span>
              <span className="info-value">{colorTokens.length}개</span>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button type="button" onClick={handlePreview} className="preview-btn">
                👁️ 미리보기
              </button>
              <button type="submit" className="generate-btn" disabled={generating}>
                {generating ? '⏳ 생성 중...' : '🌙 다크 테마 생성'}
              </button>
            </div>
          </form>

          {/* Preview */}
          {previewTokens.length > 0 && (
            <div className={styles.preview()}>
              <div className="preview-header">
                <h3>변환 미리보기</h3>
                <span className="preview-count">{previewColorTokens.length}개 색상</span>
              </div>

              <div className="comparison-grid">
                <div className="comparison-column">
                  <h4>라이트 모드</h4>
                  <div className="color-list">
                    {colorTokens.slice(0, 10).map((token) => {
                      const color = token.value as ColorValueHSL;
                      return (
                        <div key={token.id} className="color-item">
                          <div
                            className="color-swatch"
                            style={{
                              background: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
                            }}
                          />
                          <span className="color-name">{token.name}</span>
                          <span className="color-value">
                            HSL({color.h}, {color.s}%, {color.l}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="comparison-column dark-mode">
                  <h4>다크 모드</h4>
                  <div className="color-list">
                    {previewColorTokens.slice(0, 10).map((token) => {
                      const color = token.value as ColorValueHSL;
                      return (
                        <div key={token.id} className="color-item">
                          <div
                            className="color-swatch"
                            style={{
                              background: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
                            }}
                          />
                          <span className="color-name">{token.name}</span>
                          <span className="color-value">
                            HSL({color.h}, {color.s}%, {color.l}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Success */}
      {success && (
        <div className="success-message">
          <h3>✅ 다크 테마 생성 완료!</h3>
          <p>"{darkThemeName}" 테마가 성공적으로 생성되었습니다.</p>
          <button onClick={handleReset} className="reset-btn">
            + 다른 테마 생성
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-message">
          <h3>⚠️ 오류 발생</h3>
          <p>{error}</p>
          <button onClick={handleReset}>다시 시도</button>
        </div>
      )}
    </div>
  );
}
