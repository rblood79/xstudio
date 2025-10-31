/**
 * Figma Plugin Exporter
 * XStudio 토큰을 Figma Plugin 형식으로 Export
 */

import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { FigmaPluginService } from '../../../services/theme/FigmaPluginService';
import type {
  FigmaPluginExportOptions,
  FigmaPluginExportResult,
} from '../../../services/theme/FigmaPluginService';
import { useTokens } from '../../../hooks/theme/useTokens';
import '../styles/FigmaPluginExporter.css';

const figmaPluginStyles = tv({
  slots: {
    container: 'figma-plugin-container',
    form: 'figma-plugin-form',
    preview: 'figma-plugin-preview',
  },
});

interface FigmaPluginExporterProps {
  themeId: string;
  projectId: string;
}

export function FigmaPluginExporter({ themeId, projectId }: FigmaPluginExporterProps) {
  const styles = figmaPluginStyles();

  const { tokens, loading } = useTokens({
    themeId,
    enableRealtime: false,
  });

  const [pluginName, setPluginName] = useState('XStudio Theme Import');
  const [description, setDescription] = useState('Import design tokens from XStudio');

  const [includeManifest, setIncludeManifest] = useState(true);
  const [includeCode, setIncludeCode] = useState(true);
  const [includeUI, setIncludeUI] = useState(true);

  const [exportColors, setExportColors] = useState(true);
  const [exportTextStyles, setExportTextStyles] = useState(true);
  const [exportEffects, setExportEffects] = useState(true);

  const [result, setResult] = useState<FigmaPluginExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleExport = async () => {
    if (!pluginName.trim()) {
      alert('Plugin 이름을 입력하세요');
      return;
    }

    if (tokens.length === 0) {
      alert('Export할 토큰이 없습니다');
      return;
    }

    setError(null);

    try {
      const options: FigmaPluginExportOptions = {
        pluginName,
        description: description || undefined,
        includeFiles: {
          manifest: includeManifest,
          code: includeCode,
          ui: includeUI,
        },
        exportTargets: {
          colors: exportColors,
          textStyles: exportTextStyles,
          effects: exportEffects,
        },
      };

      const exportResult = await FigmaPluginService.exportToFigmaPlugin(tokens, options);
      setResult(exportResult);

      // 첫 번째 파일 자동 선택
      const firstFile = Object.keys(exportResult.files)[0];
      if (firstFile) {
        setSelectedFile(firstFile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export 실패');
      console.error('[FigmaPluginExporter] Export failed:', err);
    }
  };

  const handleDownloadAll = async () => {
    if (!result) return;
    await FigmaPluginService.downloadPluginFiles(result);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], {
      type: filename.endsWith('.html') ? 'text/html' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSelectedFile(null);
  };

  return (
    <div className={styles.container()}>
      <h2>Figma Plugin Export</h2>
      <p className="subtitle">
        테마를 Figma Plugin 형식으로 내보내어 Figma에서 직접 Import할 수 있습니다
      </p>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>토큰 로딩 중...</p>
        </div>
      )}

      {!loading && !result && (
        <form className={styles.form()} onSubmit={(e) => { e.preventDefault(); handleExport(); }}>
          {/* Plugin Name */}
          <div className="form-group">
            <label htmlFor="plugin-name">
              Plugin 이름 <span className="required">*</span>
            </label>
            <input
              id="plugin-name"
              type="text"
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
              placeholder="예: XStudio Theme Import"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">설명 (선택)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Plugin 설명"
              rows={2}
            />
          </div>

          {/* Include Files */}
          <div className="form-group">
            <label>생성할 파일</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeManifest}
                  onChange={(e) => setIncludeManifest(e.target.checked)}
                />
                manifest.json (Plugin 설정 파일)
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeCode}
                  onChange={(e) => setIncludeCode(e.target.checked)}
                />
                code.ts (Plugin 로직)
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeUI}
                  onChange={(e) => setIncludeUI(e.target.checked)}
                />
                ui.html (Plugin UI)
              </label>
            </div>
          </div>

          {/* Export Targets */}
          <div className="form-group">
            <label>Export 항목</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportColors}
                  onChange={(e) => setExportColors(e.target.checked)}
                />
                색상 스타일
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportTextStyles}
                  onChange={(e) => setExportTextStyles(e.target.checked)}
                />
                텍스트 스타일
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportEffects}
                  onChange={(e) => setExportEffects(e.target.checked)}
                />
                효과 스타일 (Shadow)
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
            🔌 Figma Plugin 생성
          </button>
        </form>
      )}

      {/* Preview */}
      {result && (
        <div className={styles.preview()}>
          <div className="preview-header">
            <div className="preview-title">
              <h3>Plugin 파일 생성 완료</h3>
              <span className="file-count">{Object.keys(result.files).length}개 파일</span>
            </div>
            <div className="preview-actions">
              <button onClick={handleDownloadAll} className="download-all-btn">
                ⬇️ 전체 다운로드
              </button>
              <button onClick={handleReset} className="reset-btn">
                🔄 새로 생성
              </button>
            </div>
          </div>

          <div className="preview-stats">
            <div className="stat-item">
              <span className="stat-label">Plugin 이름</span>
              <span className="stat-value">{result.metadata.pluginName}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">토큰 수</span>
              <span className="stat-value">{result.metadata.tokenCount}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">생성 시간</span>
              <span className="stat-value">
                {new Date(result.metadata.generatedAt).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>

          {/* File Tabs */}
          <div className="file-tabs">
            {Object.keys(result.files).map((filename) => (
              <button
                key={filename}
                className={`file-tab ${selectedFile === filename ? 'active' : ''}`}
                onClick={() => setSelectedFile(filename)}
              >
                📄 {filename}
              </button>
            ))}
          </div>

          {/* File Content */}
          {selectedFile && result.files[selectedFile] && (
            <div className="file-content">
              <div className="file-header">
                <span className="file-name">{selectedFile}</span>
                <div className="file-actions">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.files[selectedFile]!);
                      alert('클립보드에 복사되었습니다');
                    }}
                    className="copy-btn"
                  >
                    📋 복사
                  </button>
                  <button
                    onClick={() => handleDownloadFile(selectedFile, result.files[selectedFile]!)}
                    className="download-btn"
                  >
                    ⬇️ 다운로드
                  </button>
                </div>
              </div>
              <pre className="code-block">
                <code>{result.files[selectedFile]}</code>
              </pre>
            </div>
          )}

          {/* Installation Instructions */}
          <div className="instructions">
            <h4>📦 Figma Plugin 설치 방법</h4>
            <ol>
              <li>Figma Desktop App을 실행합니다</li>
              <li>Menu → Plugins → Development → Import plugin from manifest...</li>
              <li>다운로드한 manifest.json 파일을 선택합니다</li>
              <li>Plugin이 설치되면 Plugins 메뉴에서 실행할 수 있습니다</li>
            </ol>
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
