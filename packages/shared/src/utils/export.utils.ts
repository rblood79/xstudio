/**
 * Export Utilities
 *
 * 🚀 Phase 10: 프로젝트 Export/Import 유틸리티
 *
 * Builder에서 생성된 프로젝트를 JSON으로 내보내고,
 * Publish 앱에서 로드할 수 있는 기능을 제공합니다.
 *
 * @since 2026-01-02
 * @updated 2026-01-02 Phase 1 - Zod 검증 추가
 */

import type { Element, Page } from "../types/element.types";
import {
  ExportErrorCode,
  EXPORT_LIMITS,
  type ExportedProjectData,
  type ExportError,
  type ImportResult,
} from "../types/export.types";
import type { ZodError } from "zod";
import {
  ExportedProjectSchema,
  detectPageCycle,
  findInvalidParentIds,
  findDuplicateSlugs,
} from "../schemas/project.schema";
import { migrateProject } from "./migration.utils";
import { buildRegistryFontFaceCss } from "./fontRegistry";
import type { FontRegistryV2 } from "../types/font.types";

// ============================================
// Constants
// ============================================

const CURRENT_VERSION = "1.0.0";
const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

// ============================================
// Error Helpers
// ============================================

/**
 * ExportError 생성 헬퍼
 */
function createError(
  code: ExportErrorCode,
  message: string,
  options?: {
    field?: string;
    detail?: string;
    severity?: ExportError["severity"];
  },
): ExportError {
  return {
    code,
    message,
    field: options?.field,
    detail: options?.detail,
    severity: options?.severity ?? "error",
  };
}

/**
 * Zod 에러를 ExportError로 변환
 */
function zodErrorToExportError(zodError: ZodError): ExportError {
  const firstError = zodError.issues[0];
  const field = firstError?.path.map(String).join(".") || undefined;
  const message = firstError?.message || "Validation failed";

  return createError(ExportErrorCode.VALIDATION_ERROR, message, {
    field,
    detail:
      zodError.issues.length > 1
        ? `+${zodError.issues.length - 1} more errors`
        : undefined,
  });
}

/**
 * 모든 Zod 에러를 ExportError 배열로 변환
 */
function zodErrorsToExportErrors(zodError: ZodError): ExportError[] {
  return zodError.issues.map((err) => {
    const field = err.path.map(String).join(".") || undefined;
    return createError(ExportErrorCode.VALIDATION_ERROR, err.message, {
      field,
    });
  });
}

// ============================================
// Security Helpers
// ============================================

/**
 * 위험한 키를 필터링하는 JSON 파서
 */
function safeJsonParse<T>(jsonString: string): T {
  return JSON.parse(jsonString, (key, value) => {
    if (DANGEROUS_KEYS.includes(key)) {
      console.warn(`[Security] Blocked dangerous key: ${key}`);
      return undefined;
    }
    return value;
  });
}

/**
 * 파일 크기 검증
 */
function validateFileSize(size: number): ExportError | null {
  if (size > EXPORT_LIMITS.MAX_FILE_SIZE) {
    return createError(
      ExportErrorCode.FILE_TOO_LARGE,
      `File exceeds ${EXPORT_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      { detail: `Size: ${(size / 1024 / 1024).toFixed(2)}MB` },
    );
  }
  return null;
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
  currentPageId?: string | null,
): string {
  const exportData: ExportedProjectData = {
    version: CURRENT_VERSION,
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
  currentPageId?: string | null,
): void {
  const jsonString = serializeProjectData(
    projectId,
    projectName,
    pages,
    elements,
    currentPageId,
  );

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName || "project"}-${projectId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================
// Import Functions
// ============================================

/**
 * JSON 문자열에서 프로젝트 데이터 파싱 및 검증
 */
export function parseProjectData(jsonString: string): ImportResult {
  // 1. JSON 파싱
  let parsed: unknown;
  try {
    parsed = safeJsonParse(jsonString);
  } catch (error) {
    return {
      success: false,
      error: createError(
        ExportErrorCode.PARSE_ERROR,
        error instanceof Error ? error.message : "Failed to parse JSON",
      ),
    };
  }

  // 2. 버전 마이그레이션 (스키마 검증 전)
  const migrationResult = migrateProject(parsed);
  if (!migrationResult.success) {
    return {
      success: false,
      error:
        migrationResult.error ||
        createError(ExportErrorCode.VALIDATION_ERROR, "Migration failed"),
    };
  }

  // 마이그레이션 발생 시 로그
  if (migrationResult.migratedFrom) {
    console.log(
      `[Migration] Project migrated from v${migrationResult.migratedFrom} to v${migrationResult.migratedTo}`,
    );
  }

  // 3. Zod 스키마 검증
  const result = ExportedProjectSchema.safeParse(migrationResult.data);

  if (!result.success) {
    return {
      success: false,
      error: zodErrorToExportError(result.error),
      errors: zodErrorsToExportErrors(result.error),
    };
  }

  const data = result.data as ExportedProjectData;
  const warnings: ExportError[] = [];

  // 마이그레이션 경고 추가
  if (migrationResult.migratedFrom) {
    warnings.push({
      code: ExportErrorCode.UNKNOWN_VERSION,
      message: `Project was migrated from v${migrationResult.migratedFrom} to v${migrationResult.migratedTo}`,
      severity: "info",
    });
  }

  // 3. 추가 비즈니스 로직 검증

  // 3.1 페이지 순환 참조 검사
  const cyclePageId = detectPageCycle(data.pages);
  if (cyclePageId) {
    return {
      success: false,
      error: createError(
        ExportErrorCode.PARENT_CYCLE,
        `Page "${cyclePageId}" forms a circular reference`,
        {
          field: `pages[${data.pages.findIndex((p) => p.id === cyclePageId)}].parent_id`,
        },
      ),
    };
  }

  // 3.2 존재하지 않는 parent_id 검사
  const invalidParentPages = findInvalidParentIds(data.pages);
  if (invalidParentPages.length > 0) {
    const pageId = invalidParentPages[0];
    const pageIndex = data.pages.findIndex((p) => p.id === pageId);
    return {
      success: false,
      error: createError(
        ExportErrorCode.VALIDATION_ERROR,
        `Page "${pageId}" references non-existent parent`,
        { field: `pages[${pageIndex}].parent_id` },
      ),
    };
  }

  // 3.3 중복 slug 경고 (에러는 아니지만 경고)
  const duplicateSlugs = findDuplicateSlugs(data.pages);
  if (duplicateSlugs.length > 0) {
    warnings.push(
      createError(
        ExportErrorCode.VALIDATION_ERROR,
        `Duplicate slugs found for pages: ${duplicateSlugs.join(", ")}`,
        { severity: "warning" },
      ),
    );
  }

  // 3.4 exportedAt 미래 시각 경고
  const exportedAt = new Date(data.exportedAt);
  if (exportedAt > new Date()) {
    warnings.push(
      createError(
        ExportErrorCode.VALIDATION_ERROR,
        "exportedAt is in the future",
        { field: "exportedAt", severity: "warning" },
      ),
    );
  }

  return {
    success: true,
    data,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
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
        error: createError(
          ExportErrorCode.PARSE_ERROR,
          `Failed to fetch: ${response.status} ${response.statusText}`,
        ),
      };
    }

    // Content-Length가 있으면 파일 크기 검증
    const contentLength = response.headers.get("Content-Length");
    if (contentLength) {
      const sizeError = validateFileSize(parseInt(contentLength, 10));
      if (sizeError) {
        return { success: false, error: sizeError };
      }
    }

    const jsonString = await response.text();

    // 파일 크기 검증 (Content-Length가 없는 경우)
    const sizeError = validateFileSize(jsonString.length);
    if (sizeError) {
      return { success: false, error: sizeError };
    }

    return parseProjectData(jsonString);
  } catch (error) {
    return {
      success: false,
      error: createError(
        ExportErrorCode.PARSE_ERROR,
        error instanceof Error ? error.message : "Failed to load project",
      ),
    };
  }
}

/**
 * File 객체에서 프로젝트 데이터 로드
 */
export async function loadProjectFromFile(file: File): Promise<ImportResult> {
  // 파일 크기 검증
  const sizeError = validateFileSize(file.size);
  if (sizeError) {
    return { success: false, error: sizeError };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        resolve(parseProjectData(content));
      } else {
        resolve({
          success: false,
          error: createError(
            ExportErrorCode.PARSE_ERROR,
            "Failed to read file content",
          ),
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: createError(ExportErrorCode.PARSE_ERROR, "Failed to read file"),
      });
    };

    reader.readAsText(file);
  });
}

// ============================================
// Static HTML Generation
// ============================================

/**
 * 정적 HTML 파일 생성
 *
 * 프로젝트 데이터를 인라인으로 포함한 standalone HTML 파일을 생성합니다.
 */
export function generateStaticHtml(
  projectId: string,
  projectName: string,
  pages: Page[],
  elements: Element[],
  currentPageId?: string | null,
  fontRegistry?: FontRegistryV2,
  themeCSS: string = "",
): string {
  const projectData: ExportedProjectData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { id: projectId, name: projectName },
    pages,
    elements,
    currentPageId,
    fontRegistry,
  };

  const customFontCss = fontRegistry
    ? buildRegistryFontFaceCss(fontRegistry)
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName)}</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Base styles */
    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    ${customFontCss}

    ${themeCSS}

    /* Navigation */
    .publish-nav {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    .publish-nav a {
      color: #333;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
    }
    .publish-nav a:hover { background: #e0e0e0; }
    .publish-nav a.active { background: #333; color: white; }

    /* Page container */
    .page-container { padding: 1rem; }
    .page { display: none; }
    .page.active { display: block; }

    /* Component styles */
    .component { position: relative; }

    /* Flex/Grid support */
    [data-layout="flex"] { display: flex; }
    [data-layout="grid"] { display: grid; }

    /* Button styles */
    button {
      padding: 0.5rem 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    }
    button:hover { background: #f5f5f5; }

    /* Input styles */
    input, textarea, select {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <nav class="publish-nav" id="pageNav"></nav>
  <main class="page-container" id="pageContainer"></main>

  <script type="application/json" id="projectData">${JSON.stringify(projectData)}</script>

  <script>
    (function() {
      // 프로젝트 데이터 로드
      const projectData = JSON.parse(document.getElementById('projectData').textContent);
      const { pages, elements, currentPageId } = projectData;

      // 네비게이션 렌더링
      const nav = document.getElementById('pageNav');
      pages.forEach(page => {
        const link = document.createElement('a');
        link.href = '#' + (page.slug || page.id);
        link.textContent = page.name || page.slug || 'Page';
        link.dataset.pageId = page.id;
        nav.appendChild(link);
      });

      // Element를 DOM으로 변환
      function renderElement(el, allElements) {
        const children = allElements
          .filter(child => child.parent_id === el.id && !child.deleted)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        const tag = mapTagToHtml(el.tag);
        const dom = document.createElement(tag);
        dom.className = 'component';
        dom.dataset.elementId = el.id;

        // Props 적용
        if (el.props) {
          // Style 적용
          if (el.props.style) {
            Object.assign(dom.style, el.props.style);
          }

          // 텍스트 콘텐츠
          if (el.props.children && typeof el.props.children === 'string') {
            dom.textContent = el.props.children;
          }

          // 속성들
          if (el.props.placeholder) dom.placeholder = el.props.placeholder;
          if (el.props.src) dom.src = el.props.src;
          if (el.props.href) dom.href = el.props.href;
          if (el.props.alt) dom.alt = el.props.alt;
        }

        // 자식 요소 렌더링
        children.forEach(child => {
          dom.appendChild(renderElement(child, allElements));
        });

        return dom;
      }

      // Tag 매핑
      function mapTagToHtml(tag) {
        const map = {
          'Container': 'div', 'Box': 'div', 'Flex': 'div', 'Grid': 'div',
          'Text': 'span', 'Heading': 'h2', 'Paragraph': 'p', 'Label': 'label',
          'Button': 'button', 'Link': 'a', 'Image': 'img',
          'Input': 'input', 'TextField': 'input', 'TextArea': 'textarea',
          'Select': 'select', 'Checkbox': 'input', 'Radio': 'input',
          'Form': 'form', 'Section': 'section', 'Article': 'article',
          'Header': 'header', 'Footer': 'footer', 'Nav': 'nav', 'Main': 'main',
          'Aside': 'aside', 'Div': 'div', 'Span': 'span',
        };
        return map[tag] || 'div';
      }

      // 페이지 렌더링
      function renderPage(pageId) {
        const container = document.getElementById('pageContainer');
        container.innerHTML = '';

        const pageElements = elements.filter(el => el.page_id === pageId && !el.deleted);
        const rootElements = pageElements
          .filter(el => !el.parent_id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        const pageDiv = document.createElement('div');
        pageDiv.className = 'page active';

        rootElements.forEach(el => {
          pageDiv.appendChild(renderElement(el, pageElements));
        });

        container.appendChild(pageDiv);

        // 네비게이션 활성화
        nav.querySelectorAll('a').forEach(a => {
          a.classList.toggle('active', a.dataset.pageId === pageId);
        });
      }

      // 해시 변경 처리
      function handleHashChange() {
        const hash = window.location.hash.slice(1);
        const page = pages.find(p => p.slug === hash || p.id === hash);
        if (page) {
          renderPage(page.id);
        } else if (pages.length > 0) {
          const defaultPage = pages.find(p => p.id === currentPageId) || pages[0];
          renderPage(defaultPage.id);
        }
      }

      window.addEventListener('hashchange', handleHashChange);
      handleHashChange();
    })();
  </script>
</body>
</html>`;
}

/**
 * HTML 이스케이프
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 정적 HTML 파일 다운로드
 */
export function downloadStaticHtml(
  projectId: string,
  projectName: string,
  pages: Page[],
  elements: Element[],
  currentPageId?: string | null,
  fontRegistry?: FontRegistryV2,
  themeCSS: string = "",
): void {
  const html = generateStaticHtml(
    projectId,
    projectName,
    pages,
    elements,
    currentPageId,
    fontRegistry,
    themeCSS,
  );

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName || "project"}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================
// Re-exports for convenience
// ============================================

export type {
  ExportedProjectData,
  ImportResult,
  ExportError,
} from "../types/export.types";
export { ExportErrorCode, EXPORT_LIMITS } from "../types/export.types";
