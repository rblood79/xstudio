/**
 * ThemeStudio - 테마 관리 메인 UI
 * 테마 생성, 편집, AI 생성, Figma Import 통합 인터페이스
 */

import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { useThemes, useActiveTheme } from '../../hooks/theme';
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
    container: 'theme-studio-container',
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

  // Theme 데이터 로드
  const { themes, loading: themesLoading, createTheme, activateTheme } = useThemes({
    projectId,
    enableRealtime: true,
  });

  const { activeTheme, loading: activeLoading } = useActiveTheme({
    projectId,
    enableRealtime: true,
  });

  const loading = themesLoading || activeLoading;

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
    <div className={styles.container()}>
      {/* Header */}
      <header className={styles.header()}>
        <div className="header-content">
          <h1 className="studio-title">ThemeStudio</h1>

          {/* Active Theme Selector */}
          <div className="active-theme-selector">
            <label>활성 테마:</label>
            <select
              value={activeTheme?.id || ''}
              onChange={(e) => activateTheme(e.target.value)}
            >
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

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
              Export
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
                onClick={() => activateTheme(theme.id)}
              >
                <span className="theme-name">{theme.name}</span>
                <span className="theme-status">{theme.status}</span>
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
                  activateTheme(themeId);
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
                  activateTheme(darkThemeId);
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
