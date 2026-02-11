/**
 * Workflow Edge Renderer (CanvasKit)
 *
 * 페이지 간 네비게이션 관계를 Bezier 곡선 + 화살표로 렌더링한다.
 * selectionRenderer.ts와 동일한 패턴(순수 함수 + SkiaDisposable).
 *
 * 카메라 변환(translate + scale) 내부에서 씬-로컬 좌표로 호출된다.
 */

import type { CanvasKit, Canvas, FontMgr } from 'canvaskit-wasm';
import { SkiaDisposable } from './disposable';
import type { WorkflowEdge, DataSourceEdge, LayoutGroup } from './workflowEdges';

// ============================================
// Types
// ============================================

export interface PageFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 소스 요소의 씬-로컬 바운드 (elementRegistry 기반) */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EndpointPair {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

export interface ControlPoints {
  cpx1: number;
  cpy1: number;
  cpx2: number;
  cpy2: number;
}

export interface EdgeBezierGeometry {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  cpx1: number;
  cpy1: number;
  cpx2: number;
  cpy2: number;
}

export interface WorkflowHighlightState {
  hoveredEdgeId: string | null;
  focusedPageId: string | null;
  directEdgeIds: Set<string>;
  secondaryEdgeIds: Set<string>;
}

// ============================================
// Constants
// ============================================

const EDGE_STROKE_WIDTH = 2;   // screen px
const ARROW_SIZE = 8;          // screen px
const LABEL_FONT_SIZE = 10;    // screen px
const DS_INDICATOR_RADIUS = 5; // screen px (data source indicator circle)
const DS_LABEL_FONT_SIZE = 9;  // screen px
const LAYOUT_GROUP_PADDING = 20; // screen px
const LAYOUT_STROKE_WIDTH = 1.5; // screen px
const LAYOUT_LABEL_FONT_SIZE = 10; // screen px

/** blue-500 (#3b82f6) */
const NAVIGATION_COLOR: [number, number, number] = [
  0x3b / 255,
  0x82 / 255,
  0xf6 / 255,
];

/** purple-500 (#a855f7) */
const EVENT_NAV_COLOR: [number, number, number] = [
  0xa8 / 255,
  0x55 / 255,
  0xf7 / 255,
];

// ============================================
// Endpoint Computation
// ============================================

/**
 * 소스(요소 or 페이지)와 타겟 페이지의 상대 위치에 따라 연결점(앵커)을 결정한다.
 *
 * sourceElementBounds가 제공되면 요소 바운드를 소스 앵커로 사용하고,
 * 없으면 sourceFrame(페이지 프레임)을 사용한다.
 *
 * - 수평 거리가 수직 거리보다 크면: source 오른쪽 → target 왼쪽
 * - 그 외: source 하단 → target 상단
 */
export function computeEndpoints(
  sourceFrame: PageFrame,
  target: PageFrame,
  sourceElementBounds?: ElementBounds,
): EndpointPair {
  // 소스 요소가 있으면 요소 바운드를, 없으면 페이지 프레임을 사용
  const source = sourceElementBounds ?? sourceFrame;
  const sourceCx = source.x + source.width / 2;
  const sourceCy = source.y + source.height / 2;
  const targetCx = target.x + target.width / 2;
  const targetCy = target.y + target.height / 2;

  const dx = targetCx - sourceCx;
  const dy = targetCy - sourceCy;

  if (Math.abs(dx) > Math.abs(dy)) {
    // 수평 연결: source right-center → target left-center
    if (dx >= 0) {
      return {
        sx: source.x + source.width,
        sy: source.y + source.height / 2,
        ex: target.x,
        ey: target.y + target.height / 2,
      };
    }
    // 역방향: source left-center → target right-center
    return {
      sx: source.x,
      sy: source.y + source.height / 2,
      ex: target.x + target.width,
      ey: target.y + target.height / 2,
    };
  }

  // 수직 연결: source bottom-center → target top-center
  if (dy >= 0) {
    return {
      sx: source.x + source.width / 2,
      sy: source.y + source.height,
      ex: target.x + target.width / 2,
      ey: target.y,
    };
  }
  // 역방향: source top-center → target bottom-center
  return {
    sx: source.x + source.width / 2,
    sy: source.y,
    ex: target.x + target.width / 2,
    ey: target.y + target.height,
  };
}

/**
 * 엔드포인트 쌍으로부터 Bezier 제어점을 계산한다.
 *
 * 수평/수직 방향에 따라 제어점 오프셋 방향이 결정된다.
 * offset = dist * 0.4
 */
export function computeControlPoints(endpoints: EndpointPair): ControlPoints {
  const { sx, sy, ex, ey } = endpoints;
  const dist = Math.hypot(ex - sx, ey - sy);
  const offset = dist * 0.4;

  const dx = Math.abs(ex - sx);
  const dy = Math.abs(ey - sy);

  if (dx > dy) {
    return {
      cpx1: sx + Math.sign(ex - sx) * offset,
      cpy1: sy,
      cpx2: ex - Math.sign(ex - sx) * offset,
      cpy2: ey,
    };
  }

  return {
    cpx1: sx,
    cpy1: sy + Math.sign(ey - sy) * offset,
    cpx2: ex,
    cpy2: ey - Math.sign(ey - sy) * offset,
  };
}

/**
 * 엔드포인트 + 제어점을 포함한 전체 Bezier 지오메트리를 계산한다.
 *
 * computeEndpoints + computeControlPoints를 결합하여 단일 객체로 반환한다.
 */
export function computeEdgeBezier(
  sourceFrame: PageFrame,
  targetFrame: PageFrame,
  sourceElementBounds?: ElementBounds,
): EdgeBezierGeometry {
  const endpoints = computeEndpoints(sourceFrame, targetFrame, sourceElementBounds);
  const controlPoints = computeControlPoints(endpoints);
  return {
    ...endpoints,
    ...controlPoints,
  };
}

// ============================================
// Edge Renderer
// ============================================

/**
 * 워크플로우 엣지(Bezier 곡선 + 화살표)를 CanvasKit으로 렌더링한다.
 *
 * navigation: 실선 blue-500
 * event-navigation: 점선 purple-500
 *
 * 모든 크기는 1/zoom으로 스케일하여 화면상 일정 크기 유지.
 */
export function renderWorkflowEdges(
  ck: CanvasKit,
  canvas: Canvas,
  edges: WorkflowEdge[],
  pageFrameMap: Map<string, PageFrame>,
  zoom: number,
  _fontMgr?: FontMgr,
  elementBoundsMap?: Map<string, ElementBounds>,
  highlightState?: WorkflowHighlightState,
): void {
  if (edges.length === 0) return;

  const scope = new SkiaDisposable();
  try {
    const arrowSize = ARROW_SIZE / zoom;

    // 하이라이트 활성 여부 (hoveredEdgeId 또는 focusedPageId가 있으면 활성)
    const isHighlightActive = highlightState != null &&
      (highlightState.hoveredEdgeId != null || highlightState.focusedPageId != null);

    for (const edge of edges) {
      const sourceFrame = pageFrameMap.get(edge.sourcePageId);
      const targetFrame = pageFrameMap.get(edge.targetPageId);
      if (!sourceFrame || !targetFrame) continue;

      // 하이라이트 상태에 따른 strokeWidth / opacity 결정
      let edgeStrokeWidth = EDGE_STROKE_WIDTH / zoom;
      let edgeOpacity = 1.0;

      if (isHighlightActive && highlightState != null) {
        if (highlightState.hoveredEdgeId === edge.id) {
          edgeStrokeWidth = 4 / zoom;
          edgeOpacity = 1.0;
        } else if (highlightState.directEdgeIds.has(edge.id)) {
          edgeStrokeWidth = 3 / zoom;
          edgeOpacity = 1.0;
        } else if (highlightState.secondaryEdgeIds.has(edge.id)) {
          edgeStrokeWidth = 2 / zoom;
          edgeOpacity = 0.5;
        } else {
          edgeStrokeWidth = 2 / zoom;
          edgeOpacity = 0.15;
        }
      }

      const isEvent = edge.type === 'event-navigation';
      const color = isEvent ? EVENT_NAV_COLOR : NAVIGATION_COLOR;

      // 엣지별 Stroke Paint
      const strokePaint = scope.track(new ck.Paint());
      strokePaint.setAntiAlias(true);
      strokePaint.setStyle(ck.PaintStyle.Stroke);
      strokePaint.setStrokeWidth(edgeStrokeWidth);
      strokePaint.setColor(
        ck.Color4f(color[0], color[1], color[2], edgeOpacity),
      );
      if (isEvent) {
        const dashEff = scope.track(
          ck.PathEffect.MakeDash([6 / zoom, 4 / zoom]),
        );
        strokePaint.setPathEffect(dashEff);
      }

      // 화살표 Fill Paint
      const arrowPaint = scope.track(new ck.Paint());
      arrowPaint.setAntiAlias(true);
      arrowPaint.setStyle(ck.PaintStyle.Fill);
      arrowPaint.setColor(
        ck.Color4f(color[0], color[1], color[2], edgeOpacity),
      );

      // 소스 요소 바운드 조회 (요소 레벨 앵커링)
      const sourceElBounds = edge.sourceElementId && elementBoundsMap
        ? elementBoundsMap.get(edge.sourceElementId)
        : undefined;

      // 엔드포인트 계산 (소스 요소가 있으면 요소에서 출발)
      const endpoints = computeEndpoints(sourceFrame, targetFrame, sourceElBounds);
      const { sx, sy, ex, ey } = endpoints;

      // Bezier 제어점 계산
      const { cpx1, cpy1, cpx2, cpy2 } = computeControlPoints(endpoints);

      // Bezier path 그리기
      const path = scope.track(new ck.Path());
      path.moveTo(sx, sy);
      path.cubicTo(cpx1, cpy1, cpx2, cpy2, ex, ey);
      canvas.drawPath(path, strokePaint);

      // 화살표 그리기
      const angle = Math.atan2(ey - cpy2, ex - cpx2);
      const arrowAngle = Math.PI * 0.8;

      const ax1 = ex + arrowSize * Math.cos(angle + arrowAngle);
      const ay1 = ey + arrowSize * Math.sin(angle + arrowAngle);
      const ax2 = ex + arrowSize * Math.cos(angle - arrowAngle);
      const ay2 = ey + arrowSize * Math.sin(angle - arrowAngle);

      const arrowPath = scope.track(new ck.Path());
      arrowPath.moveTo(ex, ey);
      arrowPath.lineTo(ax1, ay1);
      arrowPath.lineTo(ax2, ay2);
      arrowPath.close();
      canvas.drawPath(arrowPath, arrowPaint);
    }
  } finally {
    scope.dispose();
  }
}

// ============================================
// Data Source Colors
// ============================================

/** green-500 (#22c55e) */
const DS_COLOR_DATA_TABLE: [number, number, number] = [0x22 / 255, 0xc5 / 255, 0x5e / 255];
/** amber-500 (#f59e0b) */
const DS_COLOR_API: [number, number, number] = [0xf5 / 255, 0x9e / 255, 0x0b / 255];
/** emerald-500 (#10b981) */
const DS_COLOR_SUPABASE: [number, number, number] = [0x10 / 255, 0xb9 / 255, 0x81 / 255];
/** gray-400 (#9ca3af) */
const DS_COLOR_MOCK: [number, number, number] = [0x9c / 255, 0xa3 / 255, 0xaf / 255];

/** secondary-400 (#a78bfa) violet-400 */
const LAYOUT_GROUP_COLOR: [number, number, number] = [0xa7 / 255, 0x8b / 255, 0xfa / 255];

function getDataSourceColor(sourceType: DataSourceEdge['sourceType']): [number, number, number] {
  switch (sourceType) {
    case 'dataTable': return DS_COLOR_DATA_TABLE;
    case 'api': return DS_COLOR_API;
    case 'supabase': return DS_COLOR_SUPABASE;
    case 'mock': return DS_COLOR_MOCK;
  }
}

// ============================================
// Data Source Edge Renderer
// ============================================

/**
 * 데이터 소스 엣지를 렌더링한다.
 *
 * 각 DataSourceEdge에 대해:
 * - 첫 번째 바인딩 요소가 속한 페이지 프레임 위에 색상 원 + 이름 레이블 표시
 * - 바인딩된 각 요소에서 데이터 소스 인디케이터로 점선 연결
 *
 * 모든 크기는 1/zoom으로 스케일하여 화면상 일정 크기 유지.
 */
export function renderDataSourceEdges(
  ck: CanvasKit,
  canvas: Canvas,
  dataSourceEdges: DataSourceEdge[],
  pageFrameMap: Map<string, PageFrame>,
  elementBoundsMap: Map<string, ElementBounds>,
  zoom: number,
  fontMgr?: FontMgr,
): void {
  if (dataSourceEdges.length === 0) return;

  const scope = new SkiaDisposable();
  try {
    const radius = DS_INDICATOR_RADIUS / zoom;
    const fontSize = DS_LABEL_FONT_SIZE / zoom;
    const lineStrokeWidth = 1 / zoom;
    const dashInterval = [3 / zoom, 3 / zoom];

    // 인덱스별로 인디케이터를 수직 오프셋하여 겹침 방지
    let dsIndex = 0;

    for (const ds of dataSourceEdges) {
      const color = getDataSourceColor(ds.sourceType);

      // 인디케이터 위치: 첫 번째 바인딩 요소의 페이지 위
      const firstBound = ds.boundElements[0];
      if (!firstBound) continue;

      const pageFrame = pageFrameMap.get(firstBound.pageId);
      if (!pageFrame) continue;

      const indicatorX = pageFrame.x + (20 / zoom) + dsIndex * (80 / zoom);
      const indicatorY = pageFrame.y - (20 / zoom);

      // 원형 인디케이터 (filled)
      const circlePaint = scope.track(new ck.Paint());
      circlePaint.setAntiAlias(true);
      circlePaint.setStyle(ck.PaintStyle.Fill);
      circlePaint.setColor(ck.Color4f(color[0], color[1], color[2], 1));
      canvas.drawCircle(indicatorX, indicatorY, radius, circlePaint);

      // 라벨 텍스트
      if (fontMgr) {
        const typeface = fontMgr.matchFamilyStyle('Pretendard', {
          weight: ck.FontWeight.Normal,
          width: ck.FontWidth.Normal,
          slant: ck.FontSlant.Upright,
        });
        if (typeface) {
          const labelPaint = scope.track(new ck.Paint());
          labelPaint.setAntiAlias(true);
          labelPaint.setStyle(ck.PaintStyle.Fill);
          labelPaint.setColor(ck.Color4f(color[0], color[1], color[2], 1));

          const font = scope.track(new ck.Font(typeface, fontSize));
          font.setSubpixel(true);
          const labelX = indicatorX + radius + (4 / zoom);
          const labelY = indicatorY + fontSize * 0.35;
          canvas.drawText(ds.name, labelX, labelY, labelPaint, font);
        }
      }

      // 바인딩된 요소들에서 인디케이터로 점선 연결
      const linePaint = scope.track(new ck.Paint());
      linePaint.setAntiAlias(true);
      linePaint.setStyle(ck.PaintStyle.Stroke);
      linePaint.setStrokeWidth(lineStrokeWidth);
      linePaint.setColor(ck.Color4f(color[0], color[1], color[2], 0.6));
      const lineDash = scope.track(ck.PathEffect.MakeDash(dashInterval));
      linePaint.setPathEffect(lineDash);

      for (const bound of ds.boundElements) {
        const elBounds = elementBoundsMap.get(bound.elementId);
        if (!elBounds) continue;

        const elCx = elBounds.x + elBounds.width / 2;
        const elCy = elBounds.y;

        const linePath = scope.track(new ck.Path());
        linePath.moveTo(elCx, elCy);
        linePath.lineTo(indicatorX, indicatorY + radius);
        canvas.drawPath(linePath, linePaint);
      }

      dsIndex++;
    }
  } finally {
    scope.dispose();
  }
}

// ============================================
// Layout Group Renderer
// ============================================

/**
 * 레이아웃 그룹을 렌더링한다.
 *
 * 각 LayoutGroup에 대해:
 * - 그룹 내 모든 페이지 프레임의 바운딩 박스 계산
 * - 패딩을 적용한 둥근 대시 사각형
 * - 반투명 배경
 * - 좌상단에 레이아웃 이름 라벨
 *
 * 모든 크기는 1/zoom으로 스케일하여 화면상 일정 크기 유지.
 */
export function renderLayoutGroups(
  ck: CanvasKit,
  canvas: Canvas,
  layoutGroups: LayoutGroup[],
  pageFrameMap: Map<string, PageFrame>,
  zoom: number,
  fontMgr?: FontMgr,
): void {
  if (layoutGroups.length === 0) return;

  const scope = new SkiaDisposable();
  try {
    const padding = LAYOUT_GROUP_PADDING / zoom;
    const strokeWidth = LAYOUT_STROKE_WIDTH / zoom;
    const cornerRadius = 8 / zoom;
    const fontSize = LAYOUT_LABEL_FONT_SIZE / zoom;

    // 스트로크 Paint (dashed)
    const strokePaint = scope.track(new ck.Paint());
    strokePaint.setAntiAlias(true);
    strokePaint.setStyle(ck.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(strokeWidth);
    strokePaint.setColor(
      ck.Color4f(LAYOUT_GROUP_COLOR[0], LAYOUT_GROUP_COLOR[1], LAYOUT_GROUP_COLOR[2], 0.7),
    );
    const dashEffect = scope.track(ck.PathEffect.MakeDash([8 / zoom, 4 / zoom]));
    strokePaint.setPathEffect(dashEffect);

    // 배경 Fill Paint
    const fillPaint = scope.track(new ck.Paint());
    fillPaint.setAntiAlias(true);
    fillPaint.setStyle(ck.PaintStyle.Fill);
    fillPaint.setColor(
      ck.Color4f(LAYOUT_GROUP_COLOR[0], LAYOUT_GROUP_COLOR[1], LAYOUT_GROUP_COLOR[2], 0.05),
    );

    // 라벨 Paint
    const labelPaint = scope.track(new ck.Paint());
    labelPaint.setAntiAlias(true);
    labelPaint.setStyle(ck.PaintStyle.Fill);
    labelPaint.setColor(
      ck.Color4f(LAYOUT_GROUP_COLOR[0], LAYOUT_GROUP_COLOR[1], LAYOUT_GROUP_COLOR[2], 0.9),
    );

    for (const group of layoutGroups) {
      // 그룹 내 페이지들의 바운딩 박스 계산
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasFrames = false;

      for (const pageId of group.pageIds) {
        const frame = pageFrameMap.get(pageId);
        if (!frame) continue;
        hasFrames = true;
        minX = Math.min(minX, frame.x);
        minY = Math.min(minY, frame.y);
        maxX = Math.max(maxX, frame.x + frame.width);
        maxY = Math.max(maxY, frame.y + frame.height);
      }

      if (!hasFrames) continue;

      // 패딩 적용
      const rect = ck.XYWHRect(
        minX - padding,
        minY - padding,
        (maxX - minX) + padding * 2,
        (maxY - minY) + padding * 2,
      );
      const rrect = ck.RRectXY(rect, cornerRadius, cornerRadius);

      // 배경 + 스트로크 렌더링
      canvas.drawRRect(rrect, fillPaint);
      canvas.drawRRect(rrect, strokePaint);

      // 레이아웃 이름 라벨 (좌상단)
      if (fontMgr) {
        const typeface = fontMgr.matchFamilyStyle('Pretendard', {
          weight: ck.FontWeight.Normal,
          width: ck.FontWidth.Normal,
          slant: ck.FontSlant.Upright,
        });
        if (typeface) {
          const font = scope.track(new ck.Font(typeface, fontSize));
          font.setSubpixel(true);
          const labelX = minX - padding + (6 / zoom);
          const labelY = minY - padding - (6 / zoom);
          canvas.drawText(group.layoutName, labelX, labelY, labelPaint, font);
        }
      }
    }
  } finally {
    scope.dispose();
  }
}

// ============================================
// Page Frame Highlight Renderer
// ============================================

/**
 * 하이라이트 대상 페이지 프레임에 둥근 테두리 + 반투명 배경을 렌더링한다.
 *
 * hover/focus 상태의 페이지를 시각적으로 강조하는 데 사용한다.
 */
export function renderPageFrameHighlight(
  ck: CanvasKit,
  canvas: Canvas,
  pageIds: Set<string>,
  pageFrameMap: Map<string, PageFrame>,
  zoom: number,
  color: [number, number, number],
  opacity: number,
): void {
  if (pageIds.size === 0) return;

  const scope = new SkiaDisposable();
  try {
    const strokeWidth = 2 / zoom;

    // 테두리 Paint
    const borderPaint = scope.track(new ck.Paint());
    borderPaint.setAntiAlias(true);
    borderPaint.setStyle(ck.PaintStyle.Stroke);
    borderPaint.setStrokeWidth(strokeWidth);
    borderPaint.setColor(ck.Color4f(color[0], color[1], color[2], opacity));

    // 반투명 배경 Fill Paint
    const fillPaint = scope.track(new ck.Paint());
    fillPaint.setAntiAlias(true);
    fillPaint.setStyle(ck.PaintStyle.Fill);
    fillPaint.setColor(ck.Color4f(color[0], color[1], color[2], opacity * 0.1));

    for (const pageId of pageIds) {
      const frame = pageFrameMap.get(pageId);
      if (!frame) continue;

      const rect = ck.XYWHRect(frame.x, frame.y, frame.width, frame.height);

      canvas.drawRect(rect, fillPaint);
      canvas.drawRect(rect, borderPaint);
    }
  } finally {
    scope.dispose();
  }
}
