/**
 * Canvas Debug Logging — ADR-035 Phase 0
 *
 * 카테고리별 debug 로깅 유틸리티.
 * 기본 모든 카테고리 off, 런타임에서 `canvasDebug.enable(...)` 로 활성화.
 *
 * 사용:
 *   canvasDebug.viewport("fit", { zoom: 1.0 });
 *   canvasDebug.enable("viewport", "invalidation");
 *   canvasDebug.disable("viewport");
 */

const CANVAS_DEBUG_CATEGORIES = [
  "viewport",
  "render",
  "layout",
  "selection",
  "invalidation",
  "resource",
  "workflow",
  "metrics",
] as const;

type CanvasDebugCategory = (typeof CANVAS_DEBUG_CATEGORIES)[number];

const enabledCategories = new Set<CanvasDebugCategory>();

const CATEGORY_LABELS: Record<CanvasDebugCategory, string> = {
  viewport: "🔭 [Viewport]",
  render: "🎨 [Render]",
  layout: "📐 [Layout]",
  selection: "🖱️ [Selection]",
  invalidation: "♻️ [Invalidation]",
  resource: "📦 [Resource]",
  workflow: "🔗 [Workflow]",
  metrics: "📊 [Metrics]",
};

function log(
  category: CanvasDebugCategory,
  action: string,
  data?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (!enabledCategories.has(category)) return;

  const label = CATEGORY_LABELS[category];
  if (data) {
    console.log(`${label} ${action}`, data);
  } else {
    console.log(`${label} ${action}`);
  }
}

export const canvasDebug = {
  viewport: (action: string, data?: Record<string, unknown>) =>
    log("viewport", action, data),
  render: (action: string, data?: Record<string, unknown>) =>
    log("render", action, data),
  layout: (action: string, data?: Record<string, unknown>) =>
    log("layout", action, data),
  selection: (action: string, data?: Record<string, unknown>) =>
    log("selection", action, data),
  invalidation: (action: string, data?: Record<string, unknown>) =>
    log("invalidation", action, data),
  resource: (action: string, data?: Record<string, unknown>) =>
    log("resource", action, data),
  workflow: (action: string, data?: Record<string, unknown>) =>
    log("workflow", action, data),
  metrics: (action: string, data?: Record<string, unknown>) =>
    log("metrics", action, data),

  enable(...categories: CanvasDebugCategory[]): void {
    for (const c of categories) {
      enabledCategories.add(c);
    }
    console.log(
      `[CanvasDebug] Enabled: ${categories.join(", ")} (active: ${[...enabledCategories].join(", ")})`,
    );
  },

  disable(...categories: CanvasDebugCategory[]): void {
    for (const c of categories) {
      enabledCategories.delete(c);
    }
  },

  disableAll(): void {
    enabledCategories.clear();
  },

  enableAll(): void {
    for (const c of CANVAS_DEBUG_CATEGORIES) {
      enabledCategories.add(c);
    }
    console.log(`[CanvasDebug] All categories enabled`);
  },

  /** 현재 활성 카테고리 목록 */
  get active(): CanvasDebugCategory[] {
    return [...enabledCategories];
  },
} as const;

// 개발 콘솔에서 접근 가능하도록 전역 등록
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__canvasDebug = canvasDebug;
}
