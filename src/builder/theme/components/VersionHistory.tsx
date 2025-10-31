/**
 * Version History
 * Git-like 버전 히스토리 관리 UI
 */

import { useState, useEffect } from 'react';
import { tv } from 'tailwind-variants';
import { ThemeVersionService } from '../../../services/theme/ThemeVersionService';
import type {
  ThemeVersion,
  VersionDiff,
} from '../../../services/theme/ThemeVersionService';
import { useTokens } from '../../../hooks/theme/useTokens';
import type { ColorValueHSL } from '../../../types/theme/token.types';
import '../styles/VersionHistory.css';

const versionHistoryStyles = tv({
  slots: {
    container: 'version-history-container',
    timeline: 'version-timeline',
    diff: 'version-diff',
  },
});

interface VersionHistoryProps {
  themeId: string;
  projectId: string;
}

export function VersionHistory({ themeId, projectId }: VersionHistoryProps) {
  const styles = versionHistoryStyles();

  const { tokens: currentTokens } = useTokens({ themeId, enableRealtime: false });

  const [versions, setVersions] = useState<ThemeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ThemeVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<ThemeVersion | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);

  const [commitMessage, setCommitMessage] = useState('');
  const [author, setAuthor] = useState('User');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load version history
  useEffect(() => {
    loadHistory();
  }, [themeId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const history = await ThemeVersionService.getVersionHistory(themeId);
      setVersions(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : '히스토리 로드 실패');
      console.error('[VersionHistory] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      alert('커밋 메시지를 입력하세요');
      return;
    }

    try {
      const newVersion = await ThemeVersionService.autoCommit(
        themeId,
        currentTokens,
        commitMessage,
        author
      );

      setVersions([newVersion, ...versions]);
      setCommitMessage('');
      alert('버전이 생성되었습니다');
    } catch (err) {
      alert(err instanceof Error ? err.message : '커밋 실패');
      console.error('[VersionHistory] Commit failed:', err);
    }
  };

  const handleRevert = async (versionId: string) => {
    if (!confirm('이 버전으로 복원하시겠습니까?')) {
      return;
    }

    try {
      const revertVersion = await ThemeVersionService.revertToVersion(
        themeId,
        versionId,
        author
      );

      setVersions([revertVersion, ...versions]);
      alert('버전이 복원되었습니다');
    } catch (err) {
      alert(err instanceof Error ? err.message : '복원 실패');
      console.error('[VersionHistory] Revert failed:', err);
    }
  };

  const handleCompare = (versionA: ThemeVersion, versionB: ThemeVersion) => {
    const calculatedDiff = ThemeVersionService.calculateDiff(versionA, versionB);
    setDiff(calculatedDiff);
    setSelectedVersion(versionA);
    setCompareVersion(versionB);
  };

  const renderDiff = () => {
    if (!diff) return null;

    return (
      <div className={styles.diff()}>
        <div className="diff-header">
          <h3>변경 내역</h3>
          <div className="diff-stats">
            <span className="added-stat">+{diff.added.length}</span>
            <span className="modified-stat">~{diff.modified.length}</span>
            <span className="deleted-stat">-{diff.deleted.length}</span>
          </div>
        </div>

        {/* Added */}
        {diff.added.length > 0 && (
          <div className="diff-section added">
            <h4>추가된 토큰 ({diff.added.length})</h4>
            {diff.added.map((token) => (
              <div key={token.id} className="diff-item">
                <span className="diff-icon">+</span>
                <span className="token-name">{token.name}</span>
                {token.type === 'color' && typeof token.value === 'object' && (
                  <div
                    className="color-swatch"
                    style={{
                      background: `hsl(${(token.value as ColorValueHSL).h}, ${(token.value as ColorValueHSL).s}%, ${(token.value as ColorValueHSL).l}%)`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modified */}
        {diff.modified.length > 0 && (
          <div className="diff-section modified">
            <h4>수정된 토큰 ({diff.modified.length})</h4>
            {diff.modified.map(({ before, after }) => (
              <div key={after.id} className="diff-item modified-item">
                <span className="diff-icon">~</span>
                <div className="token-comparison">
                  <div className="before">
                    <span className="token-name">{before.name}</span>
                    {before.type === 'color' && typeof before.value === 'object' && (
                      <div
                        className="color-swatch"
                        style={{
                          background: `hsl(${(before.value as ColorValueHSL).h}, ${(before.value as ColorValueHSL).s}%, ${(before.value as ColorValueHSL).l}%)`,
                        }}
                      />
                    )}
                  </div>
                  <span className="arrow">→</span>
                  <div className="after">
                    <span className="token-name">{after.name}</span>
                    {after.type === 'color' && typeof after.value === 'object' && (
                      <div
                        className="color-swatch"
                        style={{
                          background: `hsl(${(after.value as ColorValueHSL).h}, ${(after.value as ColorValueHSL).s}%, ${(after.value as ColorValueHSL).l}%)`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deleted */}
        {diff.deleted.length > 0 && (
          <div className="diff-section deleted">
            <h4>삭제된 토큰 ({diff.deleted.length})</h4>
            {diff.deleted.map((token) => (
              <div key={token.id} className="diff-item">
                <span className="diff-icon">-</span>
                <span className="token-name">{token.name}</span>
                {token.type === 'color' && typeof token.value === 'object' && (
                  <div
                    className="color-swatch"
                    style={{
                      background: `hsl(${(token.value as ColorValueHSL).h}, ${(token.value as ColorValueHSL).s}%, ${(token.value as ColorValueHSL).l}%)`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container()}>
      <h2>버전 히스토리</h2>
      <p className="subtitle">
        테마의 변경 이력을 관리하고 이전 버전으로 복원할 수 있습니다
      </p>

      {/* Commit Form */}
      <div className="commit-form">
        <h3>새 버전 생성</h3>
        <div className="form-row">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="작성자"
            className="author-input"
          />
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="커밋 메시지 (예: Update primary color palette)"
            className="message-input"
          />
          <button onClick={handleCommit} className="commit-btn">
            📝 Commit
          </button>
        </div>
        <p className="commit-hint">
          현재 토큰 상태: {currentTokens.length}개 토큰
        </p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>히스토리 로드 중...</p>
        </div>
      )}

      {!loading && versions.length === 0 && (
        <div className="empty-state">
          <p>아직 생성된 버전이 없습니다</p>
          <p>위에서 첫 번째 버전을 생성해보세요</p>
        </div>
      )}

      {/* Version Timeline */}
      {!loading && versions.length > 0 && (
        <div className={styles.timeline()}>
          <h3>버전 타임라인</h3>
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`timeline-item ${selectedVersion?.id === version.id ? 'selected' : ''}`}
            >
              <div className="timeline-marker" />
              <div className="version-card">
                <div className="version-header">
                  <div className="version-info">
                    <span className="version-number">{version.version}</span>
                    <span className="version-date">
                      {new Date(version.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="version-actions">
                    {index > 0 && (
                      <button
                        onClick={() => handleCompare(versions[index - 1], version)}
                        className="compare-btn"
                      >
                        🔍 비교
                      </button>
                    )}
                    {index > 0 && (
                      <button
                        onClick={() => handleRevert(version.id)}
                        className="revert-btn"
                      >
                        ⏪ 복원
                      </button>
                    )}
                  </div>
                </div>
                <div className="version-body">
                  <p className="commit-message">{version.commit_message}</p>
                  <div className="version-meta">
                    <span className="author">👤 {version.author}</span>
                    <span className="token-count">
                      📦 {version.snapshot.tokenCount}개 토큰
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diff Viewer */}
      {renderDiff()}

      {/* Error */}
      {error && (
        <div className="error-message">
          <h3>⚠️ 오류 발생</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
