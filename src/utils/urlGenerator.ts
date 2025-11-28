/**
 * URL Generator Utility
 *
 * Nested Routes & Slug System을 위한 URL 생성 유틸리티
 *
 * URL 결정 우선순위:
 * 1. Page.slug가 절대 경로 (/ 로 시작)인 경우 → 그대로 사용
 * 2. Layout.slug가 있는 경우 → Layout.slug + "/" + Page.slug
 * 3. parent_id가 있는 경우 → 부모 URL + "/" + Page.slug
 * 4. 그 외 → "/" + Page.slug
 */

import type { Page } from '../types/builder/unified.types';
import type { Layout } from '../types/builder/layout.types';

// ============================================
// Types
// ============================================

interface GeneratePageUrlParams {
  page: Page;
  layout?: Layout | null;
  allPages?: Page[];
}

// ============================================
// URL Generation
// ============================================

/**
 * 페이지의 최종 URL을 생성합니다.
 *
 * @param page - 대상 페이지
 * @param layout - 페이지에 적용된 Layout (optional)
 * @param allPages - 전체 페이지 목록 (parent_id 기반 URL 생성 시 필요)
 *
 * @example
 * // Absolute path
 * generatePageUrl({ page: { slug: '/products/shoes' } })
 * // → '/products/shoes'
 *
 * @example
 * // With Layout slug
 * generatePageUrl({
 *   page: { slug: 'nike', layout_id: 'layout-1' },
 *   layout: { slug: '/products' }
 * })
 * // → '/products/nike'
 *
 * @example
 * // With parent_id (hierarchical)
 * generatePageUrl({
 *   page: { slug: 'nike', parent_id: 'page-2' },
 *   allPages: [
 *     { id: 'page-1', slug: '/products' },
 *     { id: 'page-2', slug: 'shoes', parent_id: 'page-1' }
 *   ]
 * })
 * // → '/products/shoes/nike'
 */
export function generatePageUrl({ page, layout, allPages }: GeneratePageUrlParams): string {
  // 1. 절대 경로인 경우 그대로 반환
  if (page.slug.startsWith('/')) {
    return page.slug;
  }

  // 2. Layout slug가 있는 경우
  if (layout?.slug) {
    return normalizeUrl(`${layout.slug}/${page.slug}`);
  }

  // 3. parent_id가 있는 경우 (계층 기반)
  if (page.parent_id && allPages) {
    const parentUrl = buildParentPath(page.parent_id, allPages);
    return normalizeUrl(`${parentUrl}/${page.slug}`);
  }

  // 4. 기본값: 상대 경로를 절대 경로로 변환
  return normalizeUrl(`/${page.slug}`);
}

// ============================================
// Helper Functions
// ============================================

/**
 * 부모 페이지 경로를 재귀적으로 구성합니다.
 *
 * @param parentId - 부모 페이지 ID
 * @param allPages - 전체 페이지 목록
 */
function buildParentPath(parentId: string, allPages: Page[]): string {
  const parent = allPages.find((p) => p.id === parentId);
  if (!parent) return '';

  // 부모가 절대 경로면 그대로 반환
  if (parent.slug.startsWith('/')) {
    return parent.slug;
  }

  // 부모도 parent_id가 있으면 재귀
  if (parent.parent_id) {
    return `${buildParentPath(parent.parent_id, allPages)}/${parent.slug}`;
  }

  return `/${parent.slug}`;
}

/**
 * URL 정규화 (연속 슬래시 제거)
 *
 * @param url - 정규화할 URL
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+/g, '/');
}

// ============================================
// Circular Reference Detection
// ============================================

/**
 * 순환 참조 검증
 *
 * 페이지의 parent_id 설정 시 순환 참조가 발생하는지 확인합니다.
 *
 * @param pageId - 검증 대상 페이지 ID
 * @param newParentId - 설정하려는 새 parent_id
 * @param allPages - 전체 페이지 목록
 * @returns true면 순환 참조 발생
 *
 * @example
 * // Page A → Page B → Page A 형태의 순환 참조
 * hasCircularReference('page-a', 'page-b', [
 *   { id: 'page-a', parent_id: null },
 *   { id: 'page-b', parent_id: 'page-a' }
 * ])
 * // → true (page-a를 page-b의 자식으로 설정하면 순환)
 */
export function hasCircularReference(
  pageId: string,
  newParentId: string | null,
  allPages: Page[]
): boolean {
  if (!newParentId) return false;

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === pageId) return true; // 순환 발견
    if (visited.has(currentId)) return true; // 이미 방문 (무한 루프 방지)
    visited.add(currentId);

    const parent = allPages.find((p) => p.id === currentId);
    currentId = parent?.parent_id || null;
  }

  return false;
}

// ============================================
// Nesting Depth Calculation
// ============================================

/**
 * 중첩 깊이 계산
 *
 * 페이지의 계층 구조에서 현재 페이지의 깊이를 계산합니다.
 * 루트 레벨(parent_id 없음)은 0, 한 단계 자식은 1, ...
 *
 * @param pageId - 대상 페이지 ID
 * @param allPages - 전체 페이지 목록
 * @returns 중첩 깊이 (0부터 시작)
 *
 * @example
 * // /products/shoes/nike 구조에서
 * getNestingDepth('nike-page-id', allPages)
 * // → 2 (products=0, shoes=1, nike=2)
 */
export function getNestingDepth(pageId: string, allPages: Page[]): number {
  let depth = 0;
  let currentId: string | null = pageId;

  while (currentId) {
    const page = allPages.find((p) => p.id === currentId);
    if (!page?.parent_id) break;
    depth++;
    currentId = page.parent_id;
  }

  return depth;
}

// ============================================
// URL Validation & Conflict Detection
// ============================================

/**
 * URL 중복 검사
 *
 * 새로운 페이지 URL이 기존 페이지들과 충돌하는지 확인합니다.
 *
 * @param newUrl - 검사할 새 URL
 * @param allPages - 전체 페이지 목록
 * @param layouts - 전체 레이아웃 목록 (Layout slug 적용 시 필요)
 * @param excludePageId - 제외할 페이지 ID (수정 시 자기 자신 제외)
 * @returns 충돌하는 페이지 또는 null
 */
export function findUrlConflict(
  newUrl: string,
  allPages: Page[],
  layouts: Layout[] = [],
  excludePageId?: string
): Page | null {
  for (const page of allPages) {
    if (excludePageId && page.id === excludePageId) continue;

    const layout = page.layout_id ? layouts.find((l) => l.id === page.layout_id) : null;
    const existingUrl = generatePageUrl({ page, layout, allPages });

    if (existingUrl === newUrl) {
      return page;
    }
  }

  return null;
}
