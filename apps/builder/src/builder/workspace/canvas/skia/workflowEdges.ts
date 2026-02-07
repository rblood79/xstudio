/**
 * Workflow Edge Computation
 *
 * 페이지 간 연결 관계(navigation, event-navigation)를 element 데이터에서 추출한다.
 * 기존 workflow/store의 extractNavigationLinks / extractNavigationFromEvents 로직을
 * ReactFlow 의존 없이 순수 함수로 재구현.
 *
 * SkiaOverlay에서 페이지 프레임 간 베지어 커브를 그리기 위한 데이터 소스.
 */

import type { Element, Page } from '../../../../types/core/store.types';

// ============================================
// Types
// ============================================

export type WorkflowEdgeType = 'navigation' | 'event-navigation';

export interface WorkflowEdge {
  /** Source page ID */
  sourcePageId: string;
  /** Target page ID */
  targetPageId: string;
  /** Edge type */
  type: WorkflowEdgeType;
  /** Label (e.g. event type) */
  label?: string;
}

export interface PageFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Helpers
// ============================================

/** Normalize slug for comparison (remove leading/trailing slashes, query/hash) */
function normalizeSlug(slug?: string | null): string {
  if (!slug) return '';
  return slug.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '');
}

// ============================================
// Edge Extraction
// ============================================

/**
 * Extract navigation links from elements (Link/a/Button href → page slug).
 */
function extractNavigationLinks(
  pageId: string,
  elements: Element[],
  slugMap: Map<string, string>,
): string[] {
  const pageElements = elements.filter((el) => el.page_id === pageId);
  const links: string[] = [];

  for (const el of pageElements) {
    const props = el.props as Record<string, unknown> | undefined;
    if (!props) continue;

    const href =
      (props.href as string | undefined) ||
      (props.to as string | undefined) ||
      (props.path as string | undefined) ||
      (props.url as string | undefined) ||
      ((props.link as { href?: string } | undefined)?.href);

    const tagLower = (el.tag || '').toLowerCase();
    const isNavigableTag = tagLower === 'link' || tagLower === 'a' || tagLower === 'button';

    if (isNavigableTag && href && !href.startsWith('http') && !href.startsWith('#')) {
      const cleanHref = normalizeSlug(href);
      const targetPageId = slugMap.get(cleanHref);
      if (targetPageId && targetPageId !== pageId) {
        links.push(targetPageId);
      }
    }
  }

  return [...new Set(links)];
}

/**
 * Extract navigate actions from element events (onClick, onSubmit → navigate).
 */
function extractEventNavigations(
  pageId: string,
  elements: Element[],
  slugMap: Map<string, string>,
  pathMap: Map<string, string>,
): Array<{ targetPageId: string; eventType: string }> {
  const pageElements = elements.filter((el) => el.page_id === pageId);
  const results: Array<{ targetPageId: string; eventType: string }> = [];

  for (const el of pageElements) {
    const events = (el as unknown as { events?: Array<{
      event_type?: string;
      event?: string;
      enabled?: boolean;
      actions?: Array<{
        type?: string;
        enabled?: boolean;
        config?: Record<string, unknown>;
        value?: Record<string, unknown>;
      }>;
    }> }).events;
    if (!events || !Array.isArray(events)) continue;

    for (const event of events) {
      if (event.enabled === false) continue;
      const eventType = (event.event_type || event.event || '').toString();
      const actions = Array.isArray(event.actions) ? event.actions : [];

      for (const action of actions) {
        if (action.type !== 'navigate' || action.enabled === false) continue;

        const path =
          (action.config as Record<string, string> | undefined)?.path ||
          (action.config as Record<string, string> | undefined)?.href ||
          (action.config as Record<string, string> | undefined)?.to ||
          (action.config as Record<string, string> | undefined)?.url ||
          (action.value as Record<string, string> | undefined)?.path ||
          (action.value as Record<string, string> | undefined)?.href ||
          (action.value as Record<string, string> | undefined)?.to ||
          (action.value as Record<string, string> | undefined)?.url;

        if (!path || path.startsWith('http') || path.startsWith('#')) continue;

        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const cleanPath = normalizedPath === '/' ? '/' : normalizeSlug(path);

        const targetPageId = pathMap.get(normalizedPath) || slugMap.get(cleanPath);
        if (targetPageId && targetPageId !== pageId) {
          results.push({ targetPageId, eventType });
        }
      }
    }
  }

  return results;
}

// ============================================
// Public API
// ============================================

/**
 * Compute all workflow edges between pages.
 *
 * @param pages - All project pages
 * @param elements - All project elements
 * @returns Array of edges representing page-to-page connections
 */
export function computeWorkflowEdges(
  pages: Page[],
  elements: Element[],
): WorkflowEdge[] {
  if (pages.length < 2) return [];

  const edges: WorkflowEdge[] = [];

  // Build slug → pageId maps
  const slugMap = new Map<string, string>();
  const pathMap = new Map<string, string>();

  for (const p of pages) {
    const normalized = normalizeSlug(p.slug);
    slugMap.set(normalized, p.id);
    pathMap.set(`/${normalized}`, p.id);
    if (normalized === 'home' || normalized === '') {
      pathMap.set('/', p.id);
    }
  }

  // Dedupe key → avoid duplicate edges
  const seen = new Set<string>();

  for (const page of pages) {
    // Navigation links (Link/a/Button elements)
    const navTargets = extractNavigationLinks(page.id, elements, slugMap);
    for (const targetId of navTargets) {
      const key = `nav:${page.id}:${targetId}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          sourcePageId: page.id,
          targetPageId: targetId,
          type: 'navigation',
          label: 'Link',
        });
      }
    }

    // Event-based navigations (onClick navigate, onSubmit navigate)
    const eventNavs = extractEventNavigations(page.id, elements, slugMap, pathMap);
    for (const nav of eventNavs) {
      const key = `event:${page.id}:${nav.targetPageId}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          sourcePageId: page.id,
          targetPageId: nav.targetPageId,
          type: 'event-navigation',
          label: nav.eventType,
        });
      }
    }
  }

  return edges;
}
