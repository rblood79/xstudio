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
import type { WorkflowEdge } from './workflowEdges';

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

interface EndpointPair {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

// ============================================
// Constants
// ============================================

const EDGE_STROKE_WIDTH = 2;   // screen px
const ARROW_SIZE = 8;          // screen px
const LABEL_FONT_SIZE = 10;    // screen px

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
function computeEndpoints(
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
): void {
  if (edges.length === 0) return;

  const scope = new SkiaDisposable();
  try {
    const strokeWidth = EDGE_STROKE_WIDTH / zoom;
    const arrowSize = ARROW_SIZE / zoom;

    // navigation용 Paint (solid blue)
    const navPaint = scope.track(new ck.Paint());
    navPaint.setAntiAlias(true);
    navPaint.setStyle(ck.PaintStyle.Stroke);
    navPaint.setStrokeWidth(strokeWidth);
    navPaint.setColor(
      ck.Color4f(NAVIGATION_COLOR[0], NAVIGATION_COLOR[1], NAVIGATION_COLOR[2], 1),
    );

    // event-navigation용 Paint (dashed purple)
    const eventPaint = scope.track(new ck.Paint());
    eventPaint.setAntiAlias(true);
    eventPaint.setStyle(ck.PaintStyle.Stroke);
    eventPaint.setStrokeWidth(strokeWidth);
    eventPaint.setColor(
      ck.Color4f(EVENT_NAV_COLOR[0], EVENT_NAV_COLOR[1], EVENT_NAV_COLOR[2], 1),
    );
    const dashEffect = scope.track(
      ck.PathEffect.MakeDash([6 / zoom, 4 / zoom]),
    );
    eventPaint.setPathEffect(dashEffect);

    // 화살표 Fill paint (navigation)
    const navArrowPaint = scope.track(new ck.Paint());
    navArrowPaint.setAntiAlias(true);
    navArrowPaint.setStyle(ck.PaintStyle.Fill);
    navArrowPaint.setColor(
      ck.Color4f(NAVIGATION_COLOR[0], NAVIGATION_COLOR[1], NAVIGATION_COLOR[2], 1),
    );

    // 화살표 Fill paint (event-navigation)
    const eventArrowPaint = scope.track(new ck.Paint());
    eventArrowPaint.setAntiAlias(true);
    eventArrowPaint.setStyle(ck.PaintStyle.Fill);
    eventArrowPaint.setColor(
      ck.Color4f(EVENT_NAV_COLOR[0], EVENT_NAV_COLOR[1], EVENT_NAV_COLOR[2], 1),
    );

    for (const edge of edges) {
      const sourceFrame = pageFrameMap.get(edge.sourcePageId);
      const targetFrame = pageFrameMap.get(edge.targetPageId);
      if (!sourceFrame || !targetFrame) continue;

      // 소스 요소 바운드 조회 (요소 레벨 앵커링)
      const sourceElBounds = edge.sourceElementId && elementBoundsMap
        ? elementBoundsMap.get(edge.sourceElementId)
        : undefined;

      // 엔드포인트 계산 (소스 요소가 있으면 요소에서 출발)
      const { sx, sy, ex, ey } = computeEndpoints(sourceFrame, targetFrame, sourceElBounds);

      // Bezier 제어점 계산
      const dist = Math.hypot(ex - sx, ey - sy);
      const offset = dist * 0.4;

      // 수평/수직 방향에 따른 제어점
      const dx = Math.abs(ex - sx);
      const dy = Math.abs(ey - sy);

      let cpx1: number, cpy1: number, cpx2: number, cpy2: number;

      if (dx > dy) {
        // 수평 방향: 수평으로 제어점 오프셋
        cpx1 = sx + Math.sign(ex - sx) * offset;
        cpy1 = sy;
        cpx2 = ex - Math.sign(ex - sx) * offset;
        cpy2 = ey;
      } else {
        // 수직 방향: 수직으로 제어점 오프셋
        cpx1 = sx;
        cpy1 = sy + Math.sign(ey - sy) * offset;
        cpx2 = ex;
        cpy2 = ey - Math.sign(ey - sy) * offset;
      }

      // Bezier path 그리기
      const path = scope.track(new ck.Path());
      path.moveTo(sx, sy);
      path.cubicTo(cpx1, cpy1, cpx2, cpy2, ex, ey);

      const isEvent = edge.type === 'event-navigation';
      canvas.drawPath(path, isEvent ? eventPaint : navPaint);

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

      canvas.drawPath(arrowPath, isEvent ? eventArrowPaint : navArrowPaint);
    }
  } finally {
    scope.dispose();
  }
}
