/**
 * Figma Importer
 * Figma에서 스타일 Import UI
 */

import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { createFigmaService } from '../../../services/theme';
import type {
  FigmaImportRequest,
  FigmaImportResult,
} from '../../../types/theme/figma.types';
import '../styles/FigmaImporter.css';

const figmaImporterStyles = tv({
  slots: {
    container: 'figma-importer-container',
    form: 'figma-import-form',
    results: 'import-results',
  },
});

interface FigmaImporterProps {
  projectId: string;
  themeId: string;
  onImportComplete?: (result: FigmaImportResult) => void;
}

export function FigmaImporter({
  projectId,
  themeId,
  onImportComplete,
}: FigmaImporterProps) {
  const styles = figmaImporterStyles();

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<FigmaImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fileKey, setFileKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [importColors, setImportColors] = useState(true);
  const [importTextStyles, setImportTextStyles] = useState(true);
  const [importEffects, setImportEffects] = useState(true);
  const [importVariables, setImportVariables] = useState(true);
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite' | 'rename'>('rename');

  const handleImport = async () => {
    if (!fileKey.trim()) {
      alert('Figma 파일 키를 입력하세요');
      return;
    }

    if (!accessToken.trim()) {
      alert('Figma Access Token을 입력하세요');
      return;
    }

    setImporting(true);
    setResult(null);
    setError(null);

    try {
      const service = createFigmaService(accessToken);

      const request: FigmaImportRequest = {
        projectId,
        themeId,
        fileKey,
        accessToken,
        importColors,
        importTextStyles,
        importEffects,
        importVariables,
        conflictResolution,
      };

      const importResult = await service.importStyles(request);
      setResult(importResult);

      if (onImportComplete) {
        onImportComplete(importResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import 실패');
      console.error('[FigmaImporter] Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFileKey('');
    setAccessToken('');
  };

  return (
    <div className={styles.container()}>
      <h2>Figma Import</h2>
      <p className="subtitle">
        Figma 파일에서 색상, 텍스트, 효과 스타일을 가져옵니다
      </p>

      {!importing && !result && (
        <form className={styles.form()} onSubmit={(e) => { e.preventDefault(); handleImport(); }}>
          {/* File Key */}
          <div className="form-group">
            <label htmlFor="file-key">
              Figma 파일 키 <span className="required">*</span>
            </label>
            <input
              id="file-key"
              type="text"
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              placeholder="예: ABC123DEF456"
              required
            />
            <p className="field-hint">
              Figma URL에서 추출: figma.com/file/<strong>FILE_KEY</strong>/...
            </p>
          </div>

          {/* Access Token */}
          <div className="form-group">
            <label htmlFor="access-token">
              Figma Personal Access Token <span className="required">*</span>
            </label>
            <input
              id="access-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="figd_..."
              required
            />
            <p className="field-hint">
              Figma Settings → Account → Personal Access Tokens에서 생성
            </p>
          </div>

          {/* Import Options */}
          <div className="form-group">
            <label>Import 항목</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importColors}
                  onChange={(e) => setImportColors(e.target.checked)}
                />
                색상 스타일
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importTextStyles}
                  onChange={(e) => setImportTextStyles(e.target.checked)}
                />
                텍스트 스타일
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importEffects}
                  onChange={(e) => setImportEffects(e.target.checked)}
                />
                효과 스타일 (Shadow)
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importVariables}
                  onChange={(e) => setImportVariables(e.target.checked)}
                />
                Figma Variables (신규)
              </label>
            </div>
          </div>

          {/* Conflict Resolution */}
          <div className="form-group">
            <label htmlFor="conflict-resolution">충돌 해결 방법</label>
            <select
              id="conflict-resolution"
              value={conflictResolution}
              onChange={(e) => setConflictResolution(e.target.value as any)}
            >
              <option value="skip">Skip - 기존 토큰 유지</option>
              <option value="overwrite">Overwrite - 기존 토큰 덮어쓰기</option>
              <option value="rename">Rename - 새 이름으로 추가 (권장)</option>
            </select>
            <p className="field-hint">
              이름이 같은 토큰이 있을 때 처리 방법
            </p>
          </div>

          {/* Submit Button */}
          <button type="submit" className="import-btn" disabled={importing}>
            {importing ? '⏳ Import 중...' : '📥 Figma에서 가져오기'}
          </button>
        </form>
      )}

      {/* Importing */}
      {importing && (
        <div className="importing-state">
          <div className="spinner" />
          <p>Figma 스타일을 가져오는 중...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={styles.results()}>
          <div className="result-header">
            <h3>
              {result.success ? '✅ Import 완료!' : '⚠️ Import 완료 (일부 오류)'}
            </h3>
            <button onClick={handleReset} className="reset-btn">
              다시 Import
            </button>
          </div>

          {/* Stats */}
          <div className="import-stats">
            <div className="stat-card">
              <span className="stat-number">{result.imported.colors}</span>
              <span className="stat-label">색상</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{result.imported.textStyles}</span>
              <span className="stat-label">텍스트</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{result.imported.effects}</span>
              <span className="stat-label">효과</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{result.imported.variables}</span>
              <span className="stat-label">변수</span>
            </div>
            <div className="stat-card total">
              <span className="stat-number">{result.imported.total}</span>
              <span className="stat-label">총 토큰</span>
            </div>
          </div>

          {/* Skipped */}
          {result.skipped > 0 && (
            <div className="skipped-notice">
              <span>⏭️ {result.skipped}개 토큰 건너뜀 (충돌)</span>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="error-list">
              <h4>오류 목록 ({result.errors.length}개)</h4>
              <ul>
                {result.errors.slice(0, 10).map((err, index) => (
                  <li key={index}>
                    <strong>{err.styleName}</strong> ({err.styleType}): {err.reason}
                  </li>
                ))}
                {result.errors.length > 10 && (
                  <li>...외 {result.errors.length - 10}개</li>
                )}
              </ul>
            </div>
          )}

          {/* Token List Preview */}
          {result.tokens.length > 0 && (
            <div className="token-list-preview">
              <h4>생성된 토큰 미리보기 (최근 10개)</h4>
              <ul>
                {result.tokens.slice(0, 10).map((token, index) => (
                  <li key={index}>
                    <span className="token-name">{token.name}</span>
                    <span className="token-type">{token.type}</span>
                  </li>
                ))}
                {result.tokens.length > 10 && (
                  <li className="more">...외 {result.tokens.length - 10}개</li>
                )}
              </ul>
            </div>
          )}
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
