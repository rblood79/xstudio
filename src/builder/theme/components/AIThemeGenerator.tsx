/**
 * AI Theme Generator
 * AI 기반 테마 자동 생성 UI
 */

import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { createThemeGenerationService } from '../../../services/theme';
import type {
  ThemeGenerationRequest,
  ThemeGenerationProgress,
  ThemeGenerationStage,
} from '../../../types/theme/generation.types';
import '../styles/AIThemeGenerator.css';

const aiGeneratorStyles = tv({
  slots: {
    container: 'ai-generator-container',
    form: 'ai-generator-form',
    formGroup: 'form-group',
    progressBar: 'progress-bar',
    results: 'generation-results',
  },
});

interface AIThemeGeneratorProps {
  projectId: string;
  onThemeGenerated?: (themeId: string) => void;
}

const stageLabels: Record<ThemeGenerationStage, string> = {
  analyzing: '요청 분석 중',
  colors: '색상 팔레트 생성 중',
  typography: '타이포그래피 생성 중',
  spacing: '간격 시스템 생성 중',
  semantic: 'Semantic 토큰 생성 중',
  finalizing: '테마 저장 중',
  complete: '완료',
};

export function AIThemeGenerator({
  projectId,
  onThemeGenerated,
}: AIThemeGeneratorProps) {
  const styles = aiGeneratorStyles();

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ThemeGenerationProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [themeName, setThemeName] = useState('');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [style, setStyle] = useState<'modern' | 'classic' | 'playful' | 'professional' | 'minimal'>('modern');
  const [description, setDescription] = useState('');

  const handleGenerate = async () => {
    if (!themeName.trim()) {
      alert('테마 이름을 입력하세요');
      return;
    }

    setGenerating(true);
    setProgress(null);
    setResult(null);
    setError(null);

    try {
      const service = createThemeGenerationService();

      const request: ThemeGenerationRequest = {
        projectId,
        themeName,
        brandColor,
        style,
        description: description || undefined,
        includeSemanticTokens: true,
      };

      // 스트리밍으로 진행 상태 받기
      for await (const progressData of service.generateTheme(request)) {
        setProgress(progressData);

        if (progressData.stage === 'complete' && progressData.data) {
          setResult(progressData.data);
          if (onThemeGenerated) {
            onThemeGenerated(progressData.data.themeId);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '테마 생성 실패');
      console.error('[AIThemeGenerator] Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setProgress(null);
    setResult(null);
    setError(null);
    setThemeName('');
    setBrandColor('#3b82f6');
    setStyle('modern');
    setDescription('');
  };

  return (
    <div className={styles.container()}>
      <h2>AI 테마 생성</h2>
      <p className="subtitle">
        브랜드 색상과 스타일을 입력하면 완전한 디자인 테마를 자동 생성합니다
      </p>

      {!generating && !result && (
        <form className={styles.form()} onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
          {/* Theme Name */}
          <div className={styles.formGroup()}>
            <label htmlFor="theme-name">
              테마 이름 <span className="required">*</span>
            </label>
            <input
              id="theme-name"
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="예: Modern SaaS Theme"
              required
            />
          </div>

          {/* Brand Color */}
          <div className={styles.formGroup()}>
            <label htmlFor="brand-color">브랜드 색상</label>
            <div className="color-input-group">
              <input
                id="brand-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
            <p className="field-hint">
              이 색상을 기반으로 조화로운 색상 팔레트가 생성됩니다
            </p>
          </div>

          {/* Style */}
          <div className={styles.formGroup()}>
            <label htmlFor="theme-style">테마 스타일</label>
            <select
              id="theme-style"
              value={style}
              onChange={(e) => setStyle(e.target.value as any)}
            >
              <option value="modern">Modern - 현대적이고 깔끔한</option>
              <option value="classic">Classic - 클래식하고 전통적인</option>
              <option value="playful">Playful - 재미있고 발랄한</option>
              <option value="professional">Professional - 전문적이고 신뢰감 있는</option>
              <option value="minimal">Minimal - 미니멀하고 단순한</option>
            </select>
          </div>

          {/* Description */}
          <div className={styles.formGroup()}>
            <label htmlFor="description">설명 (선택)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 현대적이고 미니멀한 SaaS 제품용 테마"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="generate-btn">
            🪄 테마 생성하기
          </button>
        </form>
      )}

      {/* Progress */}
      {generating && progress && (
        <div className="progress-container">
          <div className="progress-header">
            <h3>{stageLabels[progress.stage]}</h3>
            <span className="progress-percentage">{progress.progress}%</span>
          </div>

          <div className={styles.progressBar()}>
            <div
              className="progress-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          <p className="progress-message">{progress.message}</p>

          {/* Stage Indicators */}
          <div className="stage-indicators">
            {(['analyzing', 'colors', 'typography', 'spacing', 'semantic', 'finalizing'] as ThemeGenerationStage[]).map((stage) => (
              <div
                key={stage}
                className={`stage-indicator ${
                  progress.stage === stage ? 'active' : ''
                } ${
                  ['analyzing', 'colors', 'typography', 'spacing', 'semantic', 'finalizing'].indexOf(progress.stage) >
                  ['analyzing', 'colors', 'typography', 'spacing', 'semantic', 'finalizing'].indexOf(stage)
                    ? 'completed'
                    : ''
                }`}
              >
                <div className="stage-icon" />
                <span className="stage-label">{stageLabels[stage]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={styles.results()}>
          <div className="result-header">
            <h3>✅ 테마 생성 완료!</h3>
            <button onClick={handleReset} className="new-theme-btn">
              + 새 테마 생성
            </button>
          </div>

          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-label">테마 이름</span>
              <span className="stat-value">{result.themeName}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">생성된 토큰</span>
              <span className="stat-value">{result.metadata.tokenCount}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">생성 시간</span>
              <span className="stat-value">
                {new Date(result.metadata.generatedAt).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>

          {/* Color Palette Preview */}
          <div className="palette-preview">
            <h4>색상 팔레트</h4>
            <div className="color-grid">
              {Object.entries(result.colorPalette).map(([name, shades]: [string, any]) => (
                <div key={name} className="color-palette-item">
                  <span className="palette-name">{name}</span>
                  <div className="shade-grid">
                    {Object.entries(shades).map(([shade, color]: [string, any]) => (
                      <div
                        key={shade}
                        className="shade-box"
                        style={{
                          background: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
                        }}
                        title={`${name}.${shade}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
