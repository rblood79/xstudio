/**
 * Publish App
 *
 * 🚀 Phase 10 B2.3: Publish 앱 메인 컴포넌트
 *
 * Builder에서 생성된 프로젝트를 렌더링하는 앱입니다.
 *
 * @since 2025-12-11 Phase 10 B2.3
 * @updated 2026-01-02 JSON 로드 기능 추가
 * @updated 2026-01-02 Phase 1 - 검증 강화, Phase 2 - 멀티 페이지 네비게이션
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Element, Page } from '@xstudio/shared';
import {
  loadProjectFromUrl,
  loadProjectFromFile,
  type ExportedProjectData,
  type ExportError,
  ExportErrorCode,
} from '@xstudio/shared/utils';
import { PageRenderer } from './renderer';
import { PageNav } from './components/PageNav';
import { usePageRouting } from './hooks/usePageRouting';
import './styles/index.css';

// ============================================
// Types
// ============================================

interface ProjectData {
  pages: Page[];
  elements: Element[];
  currentPageId: string | null;
  projectName: string;
  version: string;
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

// ============================================
// Error Display Component
// ============================================

interface ErrorDisplayProps {
  error: ExportError;
  errors?: ExportError[];
  onRetry: () => void;
}

function ErrorDisplay({ error, errors, onRetry }: ErrorDisplayProps) {
  return (
    <div className="publish-error" role="alert" aria-live="assertive">
      <div className="error-icon">⚠️</div>
      <h1>프로젝트를 불러올 수 없습니다</h1>
      <div className="error-details">
        <p className="error-message">{error.message}</p>
        {error.field && (
          <p className="error-field">
            <strong>필드:</strong> {error.field}
          </p>
        )}
        {error.detail && (
          <p className="error-detail">
            <strong>상세:</strong> {error.detail}
          </p>
        )}
        <p className="error-code">
          <code>{error.code}</code>
        </p>
      </div>

      {errors && errors.length > 1 && (
        <details className="error-list">
          <summary>모든 오류 보기 ({errors.length}개)</summary>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>
                <code>{err.code}</code>: {err.message}
                {err.field && <span className="error-field"> ({err.field})</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <button className="retry-button" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}

// ============================================
// Loading Component
// ============================================

function LoadingScreen() {
  return (
    <div className="publish-loading" aria-busy="true" aria-live="polite">
      <div className="loading-spinner" />
      <p>프로젝트를 불러오는 중...</p>
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="publish-empty">
      <p>{message}</p>
    </div>
  );
}

// ============================================
// App Component
// ============================================

export function App() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<ExportError | null>(null);
  const [errors, setErrors] = useState<ExportError[] | undefined>(undefined);
  const [warnings, setWarnings] = useState<ExportError[] | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 페이지 라우팅
  const { currentPageId, currentPage, setCurrentPageId } = usePageRouting({
    pages: projectData?.pages || [],
    defaultPageId: projectData?.currentPageId,
  });

  // 현재 페이지의 요소들
  const currentElements = projectData?.elements.filter(
    (el) => el.page_id === currentPageId
  ) || [];

  // 프로젝트 데이터 설정
  const setProject = useCallback((data: ExportedProjectData, loadWarnings?: ExportError[]) => {
    const projectData: ProjectData = {
      pages: data.pages,
      elements: data.elements,
      currentPageId: data.currentPageId || null,
      projectName: data.project.name,
      version: data.version,
    };

    setProjectData(projectData);
    setWarnings(loadWarnings);
    setLoadingState('loaded');
    setError(null);
    setErrors(undefined);
  }, []);

  // 에러 설정
  const setLoadError = useCallback((err: ExportError, allErrors?: ExportError[]) => {
    setError(err);
    setErrors(allErrors);
    setLoadingState('error');
  }, []);

  // URL 파라미터에서 프로젝트 로드
  useEffect(() => {
    async function loadFromUrlParam() {
      const urlParams = new URLSearchParams(window.location.search);
      const projectUrl = urlParams.get('project');

      if (projectUrl) {
        setLoadingState('loading');
        const result = await loadProjectFromUrl(projectUrl);

        if (result.success) {
          setProject(result.data, result.warnings);
        } else {
          setLoadError(result.error, result.errors);
        }
        return true;
      }
      return false;
    }

    async function loadFromDefaultPath() {
      setLoadingState('loading');
      const result = await loadProjectFromUrl('/project.json');

      if (result.success) {
        setProject(result.data, result.warnings);
        return true;
      }
      return false;
    }

    function loadFromSessionStorage(): boolean {
      const previewData = sessionStorage.getItem('xstudio-preview-data');
      if (previewData) {
        try {
          const parsed = JSON.parse(previewData);
          // sessionStorage 데이터는 이미 검증된 형식이므로 직접 사용
          const projectData: ProjectData = {
            pages: parsed.pages,
            elements: parsed.elements,
            currentPageId: parsed.currentPageId || null,
            projectName: parsed.project?.name || 'Preview',
            version: parsed.version,
          };
          setProjectData(projectData);
          setLoadingState('loaded');
          // 사용 후 삭제 (새로고침 시 다시 로드하지 않음)
          // sessionStorage.removeItem('xstudio-preview-data');
          return true;
        } catch (error) {
          console.warn('[Publish] Failed to parse sessionStorage data:', error);
        }
      }
      return false;
    }

    async function init() {
      // 1. sessionStorage에서 로드 시도 (Builder Preview 모드)
      const loadedFromSession = loadFromSessionStorage();
      if (loadedFromSession) return;

      // 2. URL 파라미터에서 로드 시도
      const loadedFromUrl = await loadFromUrlParam();
      if (loadedFromUrl) return;

      // 3. /project.json에서 로드 시도
      const loadedFromDefault = await loadFromDefaultPath();
      if (loadedFromDefault) return;

      // 4. 프로젝트 없음 - 파일 드롭 대기
      setLoadingState('idle');
    }

    init();
  }, [setProject, setLoadError]);

  // 파일 드롭 핸들러
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || !file.name.endsWith('.json')) {
        setLoadError({
          code: ExportErrorCode.VALIDATION_ERROR,
          message: 'JSON 파일만 업로드할 수 있습니다',
          severity: 'error',
        });
        return;
      }

      setLoadingState('loading');
      const result = await loadProjectFromFile(file);

      if (result.success) {
        setProject(result.data, result.warnings);
      } else {
        setLoadError(result.error, result.errors);
      }
    },
    [setProject, setLoadError]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setLoadingState('loading');
      const result = await loadProjectFromFile(file);

      if (result.success) {
        setProject(result.data, result.warnings);
      } else {
        setLoadError(result.error, result.errors);
      }
    },
    [setProject, setLoadError]
  );

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // 재시도 핸들러
  const handleRetry = useCallback(() => {
    setError(null);
    setErrors(undefined);
    setLoadingState('idle');
  }, []);

  // 에러 상태
  if (loadingState === 'error' && error) {
    return <ErrorDisplay error={error} errors={errors} onRetry={handleRetry} />;
  }

  // 로딩 상태
  if (loadingState === 'loading') {
    return <LoadingScreen />;
  }

  // 프로젝트 없음 - 파일 드롭 UI
  if (loadingState === 'idle' || !projectData) {
    return (
      <div
        className={`publish-dropzone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="프로젝트 파일 업로드"
        aria-describedby="dropzone-instructions"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <div className="dropzone-content">
          <h1>XStudio Publish</h1>
          <p id="dropzone-instructions">
            JSON 파일을 드래그하거나 Enter 키를 눌러 파일을 선택하세요
          </p>
          <p className="or">또는</p>
          <button onClick={() => fileInputRef.current?.click()}>
            파일 선택
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    );
  }

  // 페이지 없음
  if (projectData.pages.length === 0) {
    return <EmptyState message="페이지가 없습니다" />;
  }

  // 현재 페이지가 없음
  if (!currentPage) {
    return <EmptyState message="페이지를 찾을 수 없습니다" />;
  }

  // 프로젝트 렌더링
  return (
    <div className="publish-app">
      {/* 경고 표시 */}
      {warnings && warnings.length > 0 && (
        <div className="publish-warnings" role="status">
          {warnings.map((w, i) => (
            <div key={i} className="warning-item">
              ⚠️ {w.message}
            </div>
          ))}
        </div>
      )}

      <div className="publish-layout">
        {/* 페이지 네비게이션 */}
        <PageNav
          pages={projectData.pages}
          currentPageId={currentPageId}
          onPageChange={setCurrentPageId}
        />

        {/* 메인 콘텐츠 */}
        <main className="publish-content">
          {currentElements.length === 0 ? (
            <EmptyState message="이 페이지에 요소가 없습니다" />
          ) : (
            <PageRenderer
              page={currentPage}
              elements={projectData.elements}
              className="publish-page"
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
