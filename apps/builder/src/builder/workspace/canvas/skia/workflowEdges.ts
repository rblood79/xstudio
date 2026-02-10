/**
 * Workflow Edge Computation
 *
 * 캔버스 워크플로우 시각화를 위한 엣지 계산 로직.
 * 순수 함수로 구성되며 React/Zustand에 의존하지 않음.
 *
 * workflowStore.ts의 extractNavigationLinks / extractNavigationFromEvents 패턴을
 * 캔버스 렌더링용 독립 모듈로 추출한 것.
 */

// ============================================
// Types
// ============================================

export interface WorkflowEdge {
  id: string;
  type: 'navigation' | 'event-navigation';
  sourcePageId: string;
  targetPageId: string;
  sourceElementId?: string;
  label?: string;
}

/** 입력 페이지 최소 인터페이스 */
export interface WorkflowPageInput {
  id: string;
  title: string;
  slug: string;
}

/** 입력 요소 최소 인터페이스 */
export interface WorkflowElementInput {
  id: string;
  tag: string;
  props: Record<string, unknown>;
  page_id?: string | null;
  events?: WorkflowEventInput[];
}

/** 이벤트 액션 인터페이스 (config/value에서 경로 추출) */
interface WorkflowActionInput {
  type?: string;
  enabled?: boolean;
  condition?: string;
  config?: {
    path?: string;
    href?: string;
    to?: string;
    url?: string;
    [key: string]: unknown;
  };
  value?: {
    path?: string;
    href?: string;
    to?: string;
    url?: string;
    [key: string]: unknown;
  };
}

/** 이벤트 인터페이스 */
interface WorkflowEventInput {
  enabled?: boolean;
  event_type?: string;
  event?: string;
  actions?: WorkflowActionInput[];
}

// ============================================
// Slug Normalization
// ============================================

/**
 * 슬러그를 정규화하여 비교 가능한 형태로 변환.
 *
 * - "/home?q=1#section" → "home"
 * - "/about/" → "about"
 * - null/undefined → ""
 * - 선행/후행 슬래시, 쿼리 파라미터, 해시 제거
 */
export function normalizeSlug(slug?: string | null): string {
  if (!slug) return '';
  return slug
    .split(/[?#]/)[0]
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

// ============================================
// Internal Helpers
// ============================================

/** navigable 태그인지 확인 (Link, a, Button - 대소문자 무시) */
function isNavigableTag(tag: string): boolean {
  const lower = tag.toLowerCase();
  return lower === 'link' || lower === 'a' || lower === 'button';
}

/** props에서 href/to/path/url 등 내부 이동 경로 추출 */
function extractHrefFromProps(props: Record<string, unknown>): string | undefined {
  return (
    (props.href as string | undefined) ||
    (props.to as string | undefined) ||
    (props.path as string | undefined) ||
    (props.url as string | undefined) ||
    (props.link as { href?: string } | undefined)?.href
  );
}

/** 액션에서 경로 추출 (config → value 순으로 탐색) */
function extractPathFromAction(action: WorkflowActionInput): string | undefined {
  return (
    action.config?.path ||
    action.config?.href ||
    action.config?.to ||
    action.config?.url ||
    action.value?.path ||
    action.value?.href ||
    action.value?.to ||
    action.value?.url
  );
}

/** 외부 링크 또는 앵커인지 확인 */
function isExternalOrAnchor(href: string): boolean {
  return href.startsWith('http') || href.startsWith('#');
}

/** navigate 계열 액션 타입인지 확인 */
function isNavigateAction(actionType: string): boolean {
  const lower = actionType.toLowerCase();
  return lower === 'navigate' || lower === 'link' || lower.includes('navigate');
}

// ============================================
// Core Computation
// ============================================

/**
 * 페이지 및 요소 데이터를 기반으로 워크플로우 엣지 목록을 계산.
 *
 * 1. Link/a/Button 요소의 href 기반 navigation 엣지
 * 2. 이벤트 액션(navigate) 기반 event-navigation 엣지
 *
 * 중복 엣지는 제거됨 (동일 source-target-type 조합).
 */
export function computeWorkflowEdges(
  pages: WorkflowPageInput[],
  elements: WorkflowElementInput[],
): WorkflowEdge[] {
  // slug → pageId 매핑 (정규화된 슬러그 사용)
  const slugMap = new Map<string, string>();
  for (const page of pages) {
    const normalized = normalizeSlug(page.slug);
    if (normalized) {
      slugMap.set(normalized, page.id);
    }
  }

  // 중복 방지용 Set
  const seenEdges = new Set<string>();
  const edges: WorkflowEdge[] = [];

  function addEdge(edge: WorkflowEdge): void {
    if (seenEdges.has(edge.id)) return;
    seenEdges.add(edge.id);
    edges.push(edge);
  }

  // 페이지 ID Set (유효성 검증용)
  const pageIdSet = new Set(pages.map((p) => p.id));

  for (const element of elements) {
    const sourcePageId = element.page_id;
    if (!sourcePageId || !pageIdSet.has(sourcePageId)) continue;

    // 1) Link/a/Button 요소의 href 기반 navigation 엣지
    if (isNavigableTag(element.tag)) {
      const href = extractHrefFromProps(element.props);
      if (href && !isExternalOrAnchor(href)) {
        const cleanHref = normalizeSlug(href);
        const targetPageId = slugMap.get(cleanHref);
        if (targetPageId && targetPageId !== sourcePageId) {
          addEdge({
            id: `${element.id}-${targetPageId}-navigation`,
            type: 'navigation',
            sourcePageId,
            targetPageId,
            sourceElementId: element.id,
            label: 'Link',
          });
        }
      }
    }

    // 2) 이벤트 기반 navigation 엣지
    // props.events가 UI의 canonical 소스, element.events는 폴백
    const events = (Array.isArray((element.props as Record<string, unknown>).events)
      ? (element.props as Record<string, unknown>).events
      : element.events) as WorkflowEventInput[] | undefined;
    if (!Array.isArray(events)) continue;

    for (const event of events) {
      if (!event || event.enabled === false) continue;

      const actions = Array.isArray(event.actions) ? event.actions : [];
      const eventType = event.event_type || event.event || '';

      for (const action of actions) {
        if (!action || action.enabled === false) continue;

        const actionType = action.type || '';
        if (!isNavigateAction(actionType)) continue;

        const actionPath = extractPathFromAction(action);
        if (!actionPath || isExternalOrAnchor(actionPath)) continue;

        const cleanPath = normalizeSlug(actionPath);
        const targetPageId = slugMap.get(cleanPath);
        if (!targetPageId || targetPageId === sourcePageId) continue;

        addEdge({
          id: `${element.id}-${targetPageId}-event-navigation`,
          type: 'event-navigation',
          sourcePageId,
          targetPageId,
          sourceElementId: element.id,
          label: eventType ? `${eventType}` : 'event',
        });
      }
    }
  }

  return edges;
}

// ============================================
// Data Source Edge Types & Computation
// ============================================

export interface DataSourceEdge {
  id: string;
  sourceType: 'dataTable' | 'api' | 'supabase' | 'mock';
  name: string;
  boundElements: Array<{ elementId: string; elementTag: string; pageId: string }>;
}

export interface LayoutGroup {
  layoutId: string;
  layoutName: string;
  pageIds: string[];
}

/**
 * 요소의 데이터 바인딩을 분석하여 데이터 소스 엣지 목록을 계산.
 *
 * 두 가지 바인딩 형식을 지원:
 * A) PropertyDataBinding: { source, name } → dataTable | api
 * B) Full DataBinding: { type, config } → mock | supabase | api
 *
 * 동일 데이터 소스 ID의 바인딩은 하나로 합산됨 (boundElements 병합).
 */
export function computeDataSourceEdges(
  elements: WorkflowElementInput[],
): DataSourceEdge[] {
  const dataSourceMap = new Map<string, DataSourceEdge>();

  for (const el of elements) {
    // props.dataBinding 에서 바인딩 정보를 추출
    const binding = el.props.dataBinding as Record<string, unknown> | undefined;
    if (!binding || typeof binding !== 'object') continue;

    let sourceType: DataSourceEdge['sourceType'] | null = null;
    let name = '';
    let id = '';

    // A) PropertyDataBinding 형식: { source, name }
    if ('source' in binding && 'name' in binding && binding.name) {
      const src = binding.source as string;
      if (src === 'dataTable') {
        sourceType = 'dataTable';
        name = binding.name as string;
        id = `dataTable-${name}`;
      } else if (src === 'api') {
        sourceType = 'api';
        name = binding.name as string;
        id = `api-${name}`;
      }
    }

    // B) Full DataBinding 형식: { type, config }
    if (!sourceType && 'type' in binding && binding.config) {
      const config = binding.config as Record<string, unknown>;

      if (config.baseUrl === 'MOCK_DATA') {
        sourceType = 'mock';
        name = (config.endpoint as string) || 'Mock Data';
        id = `mock-${name}`;
      } else if (binding.source === 'supabase' && config.tableName) {
        sourceType = 'supabase';
        name = config.tableName as string;
        id = `supabase-${name}`;
      } else if (binding.source === 'api' && config.endpoint) {
        sourceType = 'api';
        name = config.endpoint as string;
        id = `api-${name}`;
      }
    }

    if (!sourceType || !name) continue;

    const boundEntry = {
      elementId: el.id,
      elementTag: el.tag,
      pageId: el.page_id || '',
    };

    const existing = dataSourceMap.get(id);
    if (existing) {
      existing.boundElements.push(boundEntry);
    } else {
      dataSourceMap.set(id, {
        id,
        sourceType,
        name,
        boundElements: [boundEntry],
      });
    }
  }

  return Array.from(dataSourceMap.values());
}

// ============================================
// Layout Group Computation
// ============================================

/**
 * 페이지들을 Layout 기준으로 그룹화.
 *
 * pages에서 layout_id를 읽고 layouts 배열과 매칭하여
 * 1개 이상의 페이지가 속한 LayoutGroup 목록을 반환.
 */
export function computeLayoutGroups(
  pages: WorkflowPageInput[],
  layouts: Array<{ id: string; name: string }>,
): LayoutGroup[] {
  const layoutNameMap = new Map<string, string>();
  for (const layout of layouts) {
    layoutNameMap.set(layout.id, layout.name);
  }

  const groupMap = new Map<string, string[]>();

  for (const page of pages) {
    const layoutId = (page as Record<string, unknown>).layout_id as string | undefined | null;
    if (!layoutId) continue;

    const existing = groupMap.get(layoutId);
    if (existing) {
      existing.push(page.id);
    } else {
      groupMap.set(layoutId, [page.id]);
    }
  }

  const groups: LayoutGroup[] = [];
  for (const [layoutId, pageIds] of groupMap) {
    const layoutName = layoutNameMap.get(layoutId) || layoutId;
    groups.push({ layoutId, layoutName, pageIds });
  }

  return groups;
}
