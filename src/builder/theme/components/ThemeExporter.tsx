/**
 * Theme Exporter
 * 테마/토큰을 다양한 형식으로 Export
 */

import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { ExportService } from '../../../services/theme';
import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
} from '../../../services/theme/ExportService';
import { useTokens } from '../../../hooks/theme/useTokens';
import '../styles/ThemeExporter.css';

const exporterStyles = tv({
  slots: {
    container: 'theme-exporter-container',
    form: 'exporter-form',
    preview: 'export-preview',
  },
});

interface ThemeExporterProps {
  themeId: string;
  projectId: string;
}

export function ThemeExporter({ themeId, projectId }: ThemeExporterProps) {
  const styles = exporterStyles();

  const { tokens, loading } = useTokens({
    themeId,
    enableRealtime: false,
  });

  const [format, setFormat] = useState<ExportFormat>('css');
  const [includeComments, setIncludeComments] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [minify, setMinify] = useState(false);

  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (tokens.length === 0) {
      alert('Export할 토큰이 없습니다');
      return;
    }

    setError(null);

    try {
      const options: ExportOptions = {
        format,
        includeComments,
        groupByCategory,
        minify,
      };

      const exportResult = await ExportService.exportTokens(tokens, options);
      setResult(exportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export 실패');
      console.error('[ThemeExporter] Export failed:', err);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    ExportService.downloadFile(result);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className={styles.container()}>
      <h2>Export 설정</h2>
      <p className="subtitle">
        디자인 토큰을 CSS, Tailwind, SCSS, JSON 형식으로 내보냅니다
      </p>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>토큰 로딩 중...</p>
        </div>
      )}

      {!loading && (
        <>
          <form className={styles.form()} onSubmit={(e) => { e.preventDefault(); handleExport(); }}>
            {/* Format Selection */}
            <div className="form-group">
              <label htmlFor="export-format">
                Export 형식 <span className="required">*</span>
              </label>
              <select
                id="export-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
              >
                <option value="css">CSS Variables</option>
                <option value="tailwind">Tailwind Config</option>
                <option value="scss">SCSS Variables</option>
                <option value="json">JSON</option>
              </select>
              <p className="field-hint">
                {format === 'css' && 'CSS Custom Properties (:root)'}
                {format === 'tailwind' && 'Tailwind Config (theme.extend)'}
                {format === 'scss' && 'SCSS Variables ($variable)'}
                {format === 'json' && 'JSON 데이터 (Design Token Format)'}
              </p>
            </div>

            {/* Options */}
            <div className="form-group">
              <label>Export 옵션</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                  />
                  헤더 주석 포함
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={groupByCategory}
                    onChange={(e) => setGroupByCategory(e.target.checked)}
                  />
                  카테고리별 그룹화
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={minify}
                    onChange={(e) => setMinify(e.target.checked)}
                  />
                  압축 (Minify)
                </label>
              </div>
            </div>

            {/* Token Count Info */}
            <div className="token-count-info">
              <span className="info-label">Export 대상 토큰</span>
              <span className="info-value">{tokens.length}개</span>
            </div>

            {/* Export Button */}
            <button type="submit" className="export-btn">
              📦 Export 생성
            </button>
          </form>

          {/* Preview */}
          {result && (
            <div className={styles.preview()}>
              <div className="preview-header">
                <div className="preview-title">
                  <h3>Export 결과</h3>
                  <span className="file-name">{result.filename}</span>
                </div>
                <div className="preview-actions">
                  <button onClick={handleDownload} className="download-btn">
                    ⬇️ 다운로드
                  </button>
                  <button onClick={handleReset} className="reset-btn">
                    🔄 새로 Export
                  </button>
                </div>
              </div>

              <div className="preview-stats">
                <div className="stat-item">
                  <span className="stat-label">형식</span>
                  <span className="stat-value">{result.format.toUpperCase()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">파일명</span>
                  <span className="stat-value">{result.filename}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">크기</span>
                  <span className="stat-value">{(result.content.length / 1024).toFixed(2)} KB</span>
                </div>
              </div>

              <div className="preview-content">
                <div className="code-header">
                  <span className="code-label">미리보기</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.content);
                      alert('클립보드에 복사되었습니다');
                    }}
                    className="copy-btn"
                  >
                    📋 복사
                  </button>
                </div>
                <pre className="code-block">
                  <code>{result.content}</code>
                </pre>
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
        </>
      )}
    </div>
  );
}
