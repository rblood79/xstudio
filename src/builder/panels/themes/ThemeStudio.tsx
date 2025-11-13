/**
 * ThemeStudio - 테마 관리 메인 UI
 * 테마 생성, 편집, AI 생성, Figma Import 통합 인터페이스
 */

import { useState, useEffect } from 'react';
import { tv } from 'tailwind-variants';
import { useThemes, useActiveTheme } from '../../../hooks/theme';
import { Moon, Sun } from 'lucide-react';
import '../../components/index.css';
import './styles/ThemeStudio.css';

// 하위 컴포넌트 import
import { AIThemeGenerator } from './components/AIThemeGenerator';
import { FigmaImporter } from './components/FigmaImporter';
import { TokenEditor } from './components/TokenEditor';
import { ThemeExporter } from './components/ThemeExporter';
import { DarkModeGenerator } from './components/DarkModeGenerator';
import { FigmaPluginExporter } from './components/FigmaPluginExporter';

const themeStudioStyles = tv({
  slots: {
    container: 'themePanel',
    header: 'theme-studio-header',
    sidebar: 'theme-studio-sidebar',
    main: 'theme-studio-main',
    panel: 'theme-studio-panel',
  },
});

interface ThemeStudioProps {
  projectId: string;
}

type ThemeStudioView = 'tokens' | 'ai-generator' | 'figma-import' | 'dark-mode' | 'figma-plugin' | 'settings';

export function ThemeStudio({ projectId }: ThemeStudioProps) {
  const styles = themeStudioStyles();

  const [currentView, setCurrentView] = useState<ThemeStudioView>('tokens');
  const [isPreviewDarkMode, setIsPreviewDarkMode] = useState(false);

  // Theme 데이터 로드
  const { themes, loading: themesLoading, createTheme, activateTheme, deleteTheme } = useThemes({
    projectId,
    enableRealtime: true,
  });

  const { activeTheme, loading: activeLoading, refetch: refetchActiveTheme } = useActiveTheme({
    projectId,
    enableRealtime: true,
  });

  const loading = themesLoading || activeLoading;

  // 다크모드 미리보기 초기화 (로컬 스토리지에서 복원)
  useEffect(() => {
    const savedMode = localStorage.getItem('themestudio-preview-dark-mode');
    const shouldBeDark = savedMode === 'dark';
    setIsPreviewDarkMode(shouldBeDark);
  }, []);

  // 테마 활성화 후 즉시 상태 업데이트
  const handleActivateTheme = async (themeId: string) => {
    await activateTheme(themeId);
    await refetchActiveTheme(); // 활성 테마 즉시 리프레시
  };

  // 다크모드 미리보기 토글
  const handleTogglePreviewDarkMode = () => {
    const newMode = !isPreviewDarkMode;
    setIsPreviewDarkMode(newMode);
    localStorage.setItem('themestudio-preview-dark-mode', newMode ? 'dark' : 'light');
    console.log('[ThemeStudio] Preview dark mode:', newMode ? 'enabled' : 'disabled');
  };

  if (loading) {
    return (
      <div className={styles.container()}>
        <div className="loading-state">
          <div className="spinner" />
          <p>테마 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.container()}
      data-theme={isPreviewDarkMode ? 'dark' : undefined}
    >
      {/* Header */}
      <header className={styles.header()}>
        <div className="header-content">
          <h1 className="studio-title">ThemeStudio</h1>

          {/* Active Theme Selector */}
          <div className="active-theme-selector">
            <label>활성 테마:</label>
            <select
              value={activeTheme?.id || ''}
              onChange={(e) => handleActivateTheme(e.target.value)}
            >
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dark Mode Preview Toggle */}
          <button
            className="preview-dark-mode-toggle"
            onClick={handleTogglePreviewDarkMode}
            title={isPreviewDarkMode ? 'Light 모드로 전환' : 'Dark 모드로 전환'}
          >
            {isPreviewDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isPreviewDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          {/* View Tabs */}
          <nav className="view-tabs">
            <button
              className={currentView === 'tokens' ? 'active' : ''}
              onClick={() => setCurrentView('tokens')}
            >
              토큰 편집
            </button>
            <button
              className={currentView === 'ai-generator' ? 'active' : ''}
              onClick={() => setCurrentView('ai-generator')}
            >
              AI 생성
            </button>
            <button
              className={currentView === 'figma-import' ? 'active' : ''}
              onClick={() => setCurrentView('figma-import')}
            >
              Figma Import
            </button>
            <button
              className={currentView === 'dark-mode' ? 'active' : ''}
              onClick={() => setCurrentView('dark-mode')}
            >
              다크 모드
            </button>
            <button
              className={currentView === 'figma-plugin' ? 'active' : ''}
              onClick={() => setCurrentView('figma-plugin')}
            >
              Figma Plugin
            </button>
            <button
              className={currentView === 'settings' ? 'active' : ''}
              onClick={() => setCurrentView('settings')}
            >
              설정
            </button>
          </nav>
        </div>
      </header>

      <div className="studio-body">
        {/* Sidebar - Theme List */}
        <aside className={styles.sidebar()}>
          <div className="sidebar-header">
            <h2>테마</h2>
            <button
              className="create-theme-btn"
              onClick={() => {
                const name = prompt('새 테마 이름:');
                if (name) {
                  createTheme(name);
                }
              }}
            >
              + 새 테마
            </button>
          </div>

          <div className="theme-list">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`theme-item ${activeTheme?.id === theme.id ? 'active' : ''}`}
              >
                <div
                  className="theme-info"
                  onClick={() => handleActivateTheme(theme.id)}
                >
                  <div className="theme-name-row">
                    <span className="theme-name">{theme.name}</span>
                    {(theme.supports_dark_mode ?? true) && (
                      <Moon size={14} className="dark-mode-indicator" />
                    )}
                  </div>
                  <span className="theme-status">{theme.status}</span>
                </div>
                <button
                  className="delete-theme-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`"${theme.name}" 테마를 삭제하시겠습니까?`)) {
                      deleteTheme(theme.id);
                    }
                  }}
                  title="테마 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.main()}>
          {currentView === 'tokens' && activeTheme && (
            <TokenEditor themeId={activeTheme.id} projectId={projectId} />
          )}

          {currentView === 'ai-generator' && (
            <div className="ai-generator-view">
              <AIThemeGenerator
                projectId={projectId}
                onThemeGenerated={(themeId) => {
                  handleActivateTheme(themeId);
                  setCurrentView('tokens');
                }}
              />
            </div>
          )}

          {currentView === 'figma-import' && (
            <div className="figma-import-view">
              <FigmaImporter
                projectId={projectId}
                themeId={activeTheme?.id || ''}
                onImportComplete={(result) => {
                  console.log('Figma import complete:', result);
                  setCurrentView('tokens');
                }}
              />
            </div>
          )}

          {currentView === 'dark-mode' && activeTheme && (
            <div className="dark-mode-view">
              <DarkModeGenerator
                projectId={projectId}
                themeId={activeTheme.id}
                onDarkThemeCreated={(darkThemeId) => {
                  handleActivateTheme(darkThemeId);
                  setCurrentView('tokens');
                }}
              />
            </div>
          )}

          {currentView === 'figma-plugin' && activeTheme && (
            <div className="figma-plugin-view">
              <FigmaPluginExporter
                projectId={projectId}
                themeId={activeTheme.id}
              />
            </div>
          )}

          {currentView === 'settings' && activeTheme && (
            <div className="settings-view">
              <div className="theme-settings-section">
                <h3>테마 설정</h3>
                <div className="setting-item">
                  <label htmlFor="dark-mode-support">
                    <Moon size={16} />
                    <span>다크모드 지원</span>
                  </label>
                  <input
                    type="checkbox"
                    id="dark-mode-support"
                    checked={activeTheme.supports_dark_mode ?? true}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      try {
                        const { supabase } = await import('../../../env/supabase.client');
                        await supabase
                          .from('design_themes')
                          .update({ supports_dark_mode: newValue })
                          .eq('id', activeTheme.id);
                        // Realtime subscription will automatically update the state
                        console.log('[ThemeStudio] Updated dark mode support:', newValue);
                      } catch (error) {
                        console.error('[ThemeStudio] Failed to update dark mode support:', error);
                      }
                    }}
                  />
                  <p className="setting-description">
                    이 옵션을 비활성화하면 Builder에서 다크모드 토글이 비활성화됩니다.
                  </p>
                </div>
              </div>
              <ThemeExporter themeId={activeTheme.id} projectId={projectId} />
            </div>
          )}
        </main>

        {/* Right Panel - Token Preview */}
        <aside className={styles.panel()}>
          <h3>미리보기</h3>
          <div className="token-preview">
            <p>선택된 토큰의 미리보기가 여기 표시됩니다</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ThemeStudio;
