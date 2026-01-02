/**
 * Export Utilities
 *
 * 🚀 Phase 10: 프로젝트 Export/Import 유틸리티
 *
 * Builder에서 생성된 프로젝트를 JSON으로 내보내고,
 * Publish 앱에서 로드할 수 있는 기능을 제공합니다.
 *
 * @since 2026-01-02
 */

import type { Element, Page } from '../types/element.types';

// ============================================
// Types
// ============================================

/**
 * 내보내기용 프로젝트 데이터
 */
export interface ExportedProjectData {
  /** 내보내기 버전 */
  version: string;
  /** 내보내기 시간 */
  exportedAt: string;
  /** 프로젝트 정보 */
  project: {
    id: string;
    name: string;
  };
  /** 페이지 목록 */
  pages: Page[];
  /** 요소 목록 */
  elements: Element[];
  /** 현재 페이지 ID (선택사항) */
  currentPageId?: string | null;
}

/**
 * Import 결과
 */
export interface ImportResult {
  success: boolean;
  data?: ExportedProjectData;
  error?: string;
}

// ============================================
// Export Functions
// ============================================

/**
 * 프로젝트 데이터를 JSON 문자열로 변환
 */
export function serializeProjectData(
  projectId: string,
  projectName: string,
  pages: Page[],
  elements: Element[],
  currentPageId?: string | null
): string {
  const exportData: ExportedProjectData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      id: projectId,
      name: projectName,
    },
    pages,
    elements,
    currentPageId,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 프로젝트 데이터를 JSON 파일로 다운로드
 */
export function downloadProjectAsJson(
  projectId: string,
  projectName: string,
  pages: Page[],
  elements: Element[],
  currentPageId?: string | null
): void {
  const jsonString = serializeProjectData(
    projectId,
    projectName,
    pages,
    elements,
    currentPageId
  );

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName || 'project'}-${projectId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================
// Import Functions
// ============================================

/**
 * JSON 문자열에서 프로젝트 데이터 파싱
 */
export function parseProjectData(jsonString: string): ImportResult {
  try {
    const data = JSON.parse(jsonString) as ExportedProjectData;

    // 기본 검증
    if (!data.version || !data.project || !data.pages || !data.elements) {
      return {
        success: false,
        error: 'Invalid project data format: missing required fields',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
    };
  }
}

/**
 * URL에서 프로젝트 데이터 로드
 */
export async function loadProjectFromUrl(url: string): Promise<ImportResult> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      };
    }

    const jsonString = await response.text();
    return parseProjectData(jsonString);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load project',
    };
  }
}

/**
 * File 객체에서 프로젝트 데이터 로드
 */
export async function loadProjectFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        resolve(parseProjectData(content));
      } else {
        resolve({
          success: false,
          error: 'Failed to read file content',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
      });
    };

    reader.readAsText(file);
  });
}
