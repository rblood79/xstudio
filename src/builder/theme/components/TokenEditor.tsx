/**
 * Token Editor
 * 토큰 편집 메인 UI
 */

import { useState, useMemo } from 'react';
import { tv } from 'tailwind-variants';
import { useTokens, useTokenStats } from '../../../hooks/theme';
import type { DesignToken, ColorValueHSL } from '../../../types/theme/token.types';
import { parseTokenName } from '../../../utils/theme/tokenParser';
import { generateDarkVariant } from '../../../utils/theme/colorUtils';
import '../styles/TokenEditor.css';

const tokenEditorStyles = tv({
  slots: {
    container: 'token-editor-container',
    sidebar: 'token-editor-sidebar',
    main: 'token-editor-main',
    panel: 'token-editor-panel',
  },
});

interface TokenEditorProps {
  themeId: string;
  projectId: string;
}

export function TokenEditor({ themeId, projectId }: TokenEditorProps) {
  const styles = tokenEditorStyles();

  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'raw' | 'semantic'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 토큰 데이터 로드
  const {
    tokens,
    loading,
    createToken,
    updateToken,
    deleteToken,
  } = useTokens({
    themeId,
    filter: {
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      scope: scopeFilter === 'all' ? undefined : scopeFilter,
      search: searchQuery || undefined,
    },
    enableRealtime: true,
  });

  const { stats } = useTokenStats({ themeId });

  // 카테고리 추출
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tokens.forEach((token) => {
      const parsed = parseTokenName(token.name);
      cats.add(parsed.category);
    });
    return Array.from(cats).sort();
  }, [tokens]);

  // 선택된 토큰
  const selectedToken = useMemo(() => {
    return tokens.find((t) => t.id === selectedTokenId) || null;
  }, [tokens, selectedTokenId]);

  const handleCreateToken = async () => {
    const name = prompt('토큰 이름 (예: color.brand.primary):');
    if (!name) return;

    const type = prompt('토큰 타입 (color/typography/spacing/shadow):') || 'color';
    const value = prompt('토큰 값:');
    if (!value) return;

    await createToken({
      project_id: projectId,
      name,
      type,
      value,
      scope: 'raw',
      css_variable: `--${name.replace(/\./g, '-')}`,
    });
  };

  const handleUpdateToken = async (updates: Partial<DesignToken>) => {
    if (!selectedTokenId) return;
    await updateToken(selectedTokenId, updates);
  };

  const handleDeleteToken = async () => {
    if (!selectedTokenId) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await deleteToken(selectedTokenId);
    setSelectedTokenId(null);
  };

  const handleGenerateDarkVariant = async () => {
    if (!selectedToken) return;
    if (selectedToken.type !== 'color') return;
    if (selectedToken.name.endsWith('.dark')) {
      alert('이미 다크모드 토큰입니다.');
      return;
    }

    // Check if dark variant already exists
    const darkName = `${selectedToken.name}.dark`;
    const existingDark = tokens.find((t) => t.name === darkName);
    if (existingDark) {
      alert('이미 다크모드 변형이 존재합니다.');
      return;
    }

    // Generate dark variant color
    const lightColor = selectedToken.value as ColorValueHSL;
    const darkColor = generateDarkVariant(lightColor);

    // Create new dark token
    await createToken({
      project_id: projectId,
      name: darkName,
      type: 'color',
      value: darkColor,
      scope: selectedToken.scope,
      css_variable: selectedToken.css_variable
        ? `${selectedToken.css_variable.replace(/-dark$/, '')}`
        : `--${darkName.replace(/\./g, '-')}`,
    });

    console.log(`[TokenEditor] Generated dark variant: ${darkName}`);
  };

  // Check if current token can generate dark variant
  const canGenerateDarkVariant = useMemo(() => {
    if (!selectedToken) return false;
    if (selectedToken.type !== 'color') return false;
    if (selectedToken.name.endsWith('.dark')) return false;

    const darkName = `${selectedToken.name}.dark`;
    return !tokens.some((t) => t.name === darkName);
  }, [selectedToken, tokens]);

  if (loading) {
    return (
      <div className={styles.container()}>
        <div className="loading-state">
          <div className="spinner" />
          <p>토큰 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container()}>
      {/* Sidebar - Token List */}
      <aside className={styles.sidebar()}>
        <div className="sidebar-header">
          <h3>토큰 목록</h3>
          <button className="create-token-btn" onClick={handleCreateToken}>
            + 새 토큰
          </button>
        </div>

        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="토큰 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>카테고리</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">전체</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Scope</label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | 'raw' | 'semantic')}
            >
              <option value="all">전체</option>
              <option value="raw">Raw</option>
              <option value="semantic">Semantic</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="token-stats">
            <div className="stat-item">
              <span className="stat-label">총 토큰</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Raw</span>
              <span className="stat-value">{stats.raw}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Semantic</span>
              <span className="stat-value">{stats.semantic}</span>
            </div>
          </div>
        )}

        {/* Token List */}
        <div className="token-list">
          {tokens.length === 0 ? (
            <div className="empty-state">
              <p>토큰이 없습니다</p>
            </div>
          ) : (
            tokens.map((token) => (
              <div
                key={token.id}
                className={`token-item ${selectedTokenId === token.id ? 'active' : ''}`}
                onClick={() => setSelectedTokenId(token.id)}
              >
                <div className="token-item-header">
                  <span className="token-name">{token.name}</span>
                  <span className={`token-scope ${token.scope}`}>{token.scope}</span>
                </div>
                <div className="token-item-body">
                  <span className="token-type">{token.type}</span>
                  <div className="token-preview">
                    {token.type === 'color' && token.value && (
                      <div
                        className="color-preview-box"
                        style={{
                          background: `hsl(${token.value.h || 0}, ${token.value.s || 0}%, ${token.value.l || 50}%)`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main - Token Detail Editor */}
      <main className={styles.main()}>
        {selectedToken ? (
          <div className="token-detail">
            <div className="detail-header">
              <h2>{selectedToken.name}</h2>
              <div className="detail-header-actions">
                {canGenerateDarkVariant && (
                  <button
                    className="generate-dark-btn"
                    onClick={handleGenerateDarkVariant}
                    title="자동으로 다크모드 변형 생성"
                  >
                    Generate Dark Variant
                  </button>
                )}
                <button className="delete-btn" onClick={handleDeleteToken}>
                  삭제
                </button>
              </div>
            </div>

            <div className="detail-body">
              {/* Token Name */}
              <div className="form-group">
                <label>토큰 이름</label>
                <input
                  type="text"
                  value={selectedToken.name}
                  onChange={(e) => handleUpdateToken({ name: e.target.value })}
                />
              </div>

              {/* Token Type */}
              <div className="form-group">
                <label>타입</label>
                <select
                  value={selectedToken.type}
                  onChange={(e) => handleUpdateToken({ type: e.target.value })}
                >
                  <option value="color">Color</option>
                  <option value="typography">Typography</option>
                  <option value="spacing">Spacing</option>
                  <option value="shadow">Shadow</option>
                  <option value="border">Border</option>
                  <option value="radius">Radius</option>
                </select>
              </div>

              {/* Token Scope */}
              <div className="form-group">
                <label>Scope</label>
                <select
                  value={selectedToken.scope}
                  onChange={(e) => handleUpdateToken({ scope: e.target.value as 'raw' | 'semantic' })}
                >
                  <option value="raw">Raw</option>
                  <option value="semantic">Semantic</option>
                </select>
              </div>

              {/* Token Value (타입별 편집) */}
              <div className="form-group">
                <label>값</label>
                {selectedToken.type === 'color' && selectedToken.value && (
                  <div className="color-editor">
                    <div className="color-inputs">
                      <input
                        type="number"
                        placeholder="H (0-360)"
                        value={selectedToken.value.h || 0}
                        onChange={(e) =>
                          handleUpdateToken({
                            value: { ...selectedToken.value, h: parseInt(e.target.value) },
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="S (0-100)"
                        value={selectedToken.value.s || 0}
                        onChange={(e) =>
                          handleUpdateToken({
                            value: { ...selectedToken.value, s: parseInt(e.target.value) },
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="L (0-100)"
                        value={selectedToken.value.l || 50}
                        onChange={(e) =>
                          handleUpdateToken({
                            value: { ...selectedToken.value, l: parseInt(e.target.value) },
                          })
                        }
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="A (0-1)"
                        value={selectedToken.value.a || 1}
                        onChange={(e) =>
                          handleUpdateToken({
                            value: { ...selectedToken.value, a: parseFloat(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {selectedToken.type !== 'color' && (
                  <textarea
                    value={JSON.stringify(selectedToken.value, null, 2)}
                    onChange={(e) => {
                      try {
                        const value = JSON.parse(e.target.value);
                        handleUpdateToken({ value });
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={5}
                  />
                )}
              </div>

              {/* CSS Variable */}
              <div className="form-group">
                <label>CSS Variable</label>
                <input
                  type="text"
                  value={selectedToken.css_variable || ''}
                  onChange={(e) => handleUpdateToken({ css_variable: e.target.value })}
                />
              </div>
            </div>

            {/* Token Preview */}
            <div className="token-preview">
              <h3>미리보기</h3>
              {selectedToken.type === 'color' && selectedToken.value && (
                <div className="preview-content">
                  <div
                    className="color-preview-large"
                    style={{
                      background: `hsl(${selectedToken.value.h || 0}, ${selectedToken.value.s || 0}%, ${selectedToken.value.l || 50}%)`,
                    }}
                  />
                  <div className="preview-info">
                    <p>
                      <strong>HSL:</strong> hsl({selectedToken.value.h || 0}, {selectedToken.value.s || 0}%,{' '}
                      {selectedToken.value.l || 50}%)
                    </p>
                    <p>
                      <strong>CSS Variable:</strong> {selectedToken.css_variable || 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {selectedToken.type !== 'color' && (
                <div className="preview-content">
                  <pre>{JSON.stringify(selectedToken.value, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-selection">
            <p>토큰을 선택하세요</p>
          </div>
        )}
      </main>
    </div>
  );
}
