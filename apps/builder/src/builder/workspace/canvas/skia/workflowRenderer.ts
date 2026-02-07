/**
 * Skia Workflow Edge Renderer
 *
 * 페이지 프레임 간 연결(navigation/event-navigation)을 CanvasKit으로 렌더링한다.
 * selectionRenderer.ts / aiEffects.ts와 동일한 패턴(순수 함수 + SkiaDisposable).
 *
 * 카메라 변환(translate + scale) 내부에서 씬-로컬 좌표로 호출된다.
 */

import type { CanvasKit, Canvas } from 'canvaskit-wasm';
import { SkiaDisposable } from './disposable';
import type { WorkflowEdge, PageFrame } from './workflowEdges';

// ============================================
// Constants
// ============================================

/** Navigation edge: blue-500 (#3b82f6) */
const NAV_R = 0x3b / 255;
const NAV_G = 0x82 / 255;
const NAV_B = 0xf6 / 255;

/** Event navigation edge: purple-500 (#a855f7) */
const EVENT_R = 0xa8 / 255;
const EVENT_G = 0x55 / 255;
const EVENT_B = 0xf7 / 255;

/** Arrow head size (scene-local px, scaled by 1/zoom) */
const ARROW_SIZE = 8;

/** Edge stroke width (scene-local px, scaled by 1/zoom) */
const EDGE_STROKE_WIDTH = 2;

/** Curvature offset for Bezier control points */
const CURVE_OFFSET_RATIO = 0.4;

/** Edge label font size (screen px) */
const LABEL_FONT_SIZE = 10;
const LABEL_PADDING_X = 4;
const LABEL_PADDING_Y = 2;
const LABEL_BG_OPACITY = 0.85;
const LABEL_BORDER_RADIUS = 3;

// ============================================
// Helpers
// ============================================

interface EdgeEndpoints {
  /** Start point (center of source page bottom edge) */
  sx: number;
  sy: number;
  /** End point (center of target page top edge) */
  ex: number;
  ey: number;
}

/**
 * Compute edge endpoints between two page frames.
 * Uses shortest-path anchoring: connects from nearest edges of source/target.
 */
function computeEndpoints(source: PageFrame, target: PageFrame): EdgeEndpoints {
  const sCx = source.x + source.width / 2;
  const sCy = source.y + source.height / 2;
  const tCx = target.x + target.width / 2;
  const tCy = target.y + target.height / 2;

  const dx = tCx - sCx;
  const dy = tCy - sCy;

  // Determine which edges to connect based on relative position
  // Prefer horizontal connections when pages are side-by-side
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal: connect right→left or left→right
    if (dx > 0) {
      return {
        sx: source.x + source.width, sy: sCy,
        ex: target.x, ey: tCy,
      };
    } else {
      return {
        sx: source.x, sy: sCy,
        ex: target.x + target.width, ey: tCy,
      };
    }
  } else {
    // Vertical: connect bottom→top or top→bottom
    if (dy > 0) {
      return {
        sx: sCx, sy: source.y + source.height,
        ex: tCx, ey: target.y,
      };
    } else {
      return {
        sx: sCx, sy: source.y,
        ex: tCx, ey: target.y + target.height,
      };
    }
  }
}

/**
 * Draw an arrow head at the end point of an edge.
 */
function drawArrowHead(
  ck: CanvasKit,
  canvas: Canvas,
  paint: ReturnType<CanvasKit['Paint']['prototype']['constructor']>,
  ex: number,
  ey: number,
  /** Direction angle from control point to end point */
  angle: number,
  size: number,
): void {
  const path = new ck.Path();
  const a1 = angle + Math.PI * 0.8;
  const a2 = angle - Math.PI * 0.8;

  path.moveTo(ex, ey);
  path.lineTo(ex + size * Math.cos(a1), ey + size * Math.sin(a1));
  path.lineTo(ex + size * Math.cos(a2), ey + size * Math.sin(a2));
  path.close();

  const fillPaint = paint.copy();
  fillPaint.setStyle(ck.PaintStyle.Fill);
  canvas.drawPath(path, fillPaint);

  path.delete();
  fillPaint.delete();
}

// ============================================
// Main Renderer
// ============================================

/**
 * Render workflow edges between page frames using CanvasKit.
 *
 * Called within camera transform context (scene-local coordinates).
 * strokeWidth = N/zoom to maintain consistent screen-space thickness.
 */
export function renderWorkflowEdges(
  ck: CanvasKit,
  canvas: Canvas,
  edges: WorkflowEdge[],
  pageFrameMap: Map<string, PageFrame>,
  zoom: number,
  fontMgr?: unknown,
): void {
  if (edges.length === 0) return;

  const scope = new SkiaDisposable();
  try {
    const sw = EDGE_STROKE_WIDTH / zoom;
    const arrowSize = ARROW_SIZE / zoom;

    // Navigation paint (blue, solid)
    const navPaint = scope.track(new ck.Paint());
    navPaint.setAntiAlias(true);
    navPaint.setStyle(ck.PaintStyle.Stroke);
    navPaint.setStrokeWidth(sw);
    navPaint.setColor(ck.Color4f(NAV_R, NAV_G, NAV_B, 0.7));

    // Event navigation paint (purple, dashed)
    const eventPaint = scope.track(new ck.Paint());
    eventPaint.setAntiAlias(true);
    eventPaint.setStyle(ck.PaintStyle.Stroke);
    eventPaint.setStrokeWidth(sw);
    eventPaint.setColor(ck.Color4f(EVENT_R, EVENT_G, EVENT_B, 0.7));
    // Dash effect: [dash, gap] in scene-local units
    const dashLen = 6 / zoom;
    const gapLen = 4 / zoom;
    const dashEffect = ck.PathEffect.MakeDash([dashLen, gapLen]);
    if (dashEffect) {
      eventPaint.setPathEffect(dashEffect);
    }

    // Label paints
    const labelBgPaint = scope.track(new ck.Paint());
    labelBgPaint.setAntiAlias(true);
    labelBgPaint.setStyle(ck.PaintStyle.Fill);

    for (const edge of edges) {
      const source = pageFrameMap.get(edge.sourcePageId);
      const target = pageFrameMap.get(edge.targetPageId);
      if (!source || !target) continue;

      const { sx, sy, ex, ey } = computeEndpoints(source, target);
      const paint = edge.type === 'navigation' ? navPaint : eventPaint;

      // Compute Bezier control points
      const dx = ex - sx;
      const dy = ey - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = dist * CURVE_OFFSET_RATIO;

      let cpx1: number, cpy1: number, cpx2: number, cpy2: number;

      // Control points follow the dominant direction
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal flow
        cpx1 = sx + (dx > 0 ? offset : -offset);
        cpy1 = sy;
        cpx2 = ex + (dx > 0 ? -offset : offset);
        cpy2 = ey;
      } else {
        // Vertical flow
        cpx1 = sx;
        cpy1 = sy + (dy > 0 ? offset : -offset);
        cpx2 = ex;
        cpy2 = ey + (dy > 0 ? -offset : offset);
      }

      // Draw cubic Bezier curve
      const path = scope.track(new ck.Path());
      path.moveTo(sx, sy);
      path.cubicTo(cpx1, cpy1, cpx2, cpy2, ex, ey);
      canvas.drawPath(path, paint);

      // Arrow head at end
      const arrowAngle = Math.atan2(ey - cpy2, ex - cpx2);
      const arrowPaint = edge.type === 'navigation' ? navPaint : eventPaint;
      drawArrowHead(ck, canvas, arrowPaint, ex, ey, arrowAngle, arrowSize);

      // Edge label at midpoint (only if label exists and fontMgr available)
      if (edge.label && fontMgr) {
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        const fontSize = LABEL_FONT_SIZE / zoom;
        const padX = LABEL_PADDING_X / zoom;
        const padY = LABEL_PADDING_Y / zoom;
        const borderRadius = LABEL_BORDER_RADIUS / zoom;

        // Approximate text width (rough: fontSize * 0.6 * charCount)
        const textWidth = fontSize * 0.6 * edge.label.length;
        const textHeight = fontSize;

        // Background
        const isNav = edge.type === 'navigation';
        labelBgPaint.setColor(ck.Color4f(
          isNav ? NAV_R : EVENT_R,
          isNav ? NAV_G : EVENT_G,
          isNav ? NAV_B : EVENT_B,
          LABEL_BG_OPACITY,
        ));
        const bgRect = ck.RRectXY(
          ck.LTRBRect(
            mx - textWidth / 2 - padX,
            my - textHeight / 2 - padY,
            mx + textWidth / 2 + padX,
            my + textHeight / 2 + padY,
          ),
          borderRadius,
          borderRadius,
        );
        canvas.drawRRect(bgRect, labelBgPaint);

        // Text (white on colored bg)
        const textPaint = scope.track(new ck.Paint());
        textPaint.setAntiAlias(true);
        textPaint.setStyle(ck.PaintStyle.Fill);
        textPaint.setColor(ck.Color4f(1, 1, 1, 1));

        const font = new ck.Font(null, fontSize);
        canvas.drawText(
          edge.label,
          mx - textWidth / 2,
          my + textHeight / 4,
          textPaint,
          font,
        );
        font.delete();
      }
    }

    // Clean up dash effect
    if (dashEffect) dashEffect.delete();
  } finally {
    scope.dispose();
  }
}
