import type { CanvasKit, Canvas, FontMgr } from "canvaskit-wasm";
import { beginRenderEffects, endRenderEffects } from "./effects";
import { toSkiaBlendMode } from "./blendModes";
import { renderBox } from "./nodeRendererBorders";
import { buildClipPath, sortByStackingOrder } from "./nodeRendererClip";
import { renderImage } from "./nodeRendererImage";
import { getEditingElementId } from "./nodeRendererState";
import {
  renderLine,
  renderArc,
  renderIconPath,
  renderPartialBorder,
  renderScrollbar,
} from "./nodeRendererShapes";
import { renderText } from "./nodeRendererText";
import type { SkiaNodeData } from "./nodeRendererTypes";
import { notifyLayoutChange } from "./useSkiaNode";

// ============================================
// Drag Visual Offset (Pencil deferred-drop 패턴)
// globalThis 사용 — HMR 모듈 인스턴스 분리 방지
// ============================================

interface DragVisualOffsetData {
  elementId: string;
  dx: number;
  dy: number;
}

const G = globalThis as unknown as {
  __xstudio_dragVisualOffset?: DragVisualOffsetData | null;
};

function _get(): DragVisualOffsetData | null {
  return G.__xstudio_dragVisualOffset ?? null;
}

/**
 * 드래그 중인 요소의 시각적 오프셋을 설정한다.
 * Store는 변경하지 않고, 렌더링 시점에만 canvas.translate로 적용.
 *
 * @param skipInvalidation true면 notifyLayoutChange() 호출 스킵 (drop 시 store 갱신이 별도로 트리거)
 */
export function setDragVisualOffset(
  elementId: string | null,
  dx = 0,
  dy = 0,
  skipInvalidation = false,
): void {
  const prev = _get();
  G.__xstudio_dragVisualOffset =
    elementId !== null ? { elementId, dx, dy } : null;

  if (skipInvalidation) return;

  const next = G.__xstudio_dragVisualOffset;
  const changed =
    (prev === null) !== (next === null) ||
    (prev &&
      next &&
      (prev.elementId !== next.elementId ||
        prev.dx !== next.dx ||
        prev.dy !== next.dy));
  if (changed) {
    notifyLayoutChange();
  }
}

/** 현재 드래그 시각적 오프셋 반환 */
export function getDragVisualOffset() {
  return _get();
}

export function renderNode(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  cullingBounds: DOMRect,
  fontMgr?: FontMgr,
): void {
  const left = cullingBounds.x;
  const top = cullingBounds.y;
  renderNodeInternal(
    ck,
    canvas,
    node,
    left,
    top,
    left + cullingBounds.width,
    top + cullingBounds.height,
    fontMgr,
  );
}

function renderNodeInternal(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  cullLeft: number,
  cullTop: number,
  cullRight: number,
  cullBottom: number,
  fontMgr?: FontMgr,
): void {
  if (!node.visible) return;

  // Pencil deferred-drop: 드래그 대상 요소에 시각적 오프셋 적용
  const dragOffset = _get();
  const isDragTarget =
    dragOffset !== null && node.elementId === dragOffset.elementId;
  const offsetX = isDragTarget ? dragOffset.dx : 0;
  const offsetY = isDragTarget ? dragOffset.dy : 0;

  if (node.width > 0 || node.height > 0) {
    const nodeLeft = node.x + offsetX;
    const nodeTop = node.y + offsetY;
    const nodeRight = nodeLeft + node.width;
    const nodeBottom = nodeTop + node.height;
    if (
      cullLeft > nodeRight ||
      cullRight < nodeLeft ||
      cullTop > nodeBottom ||
      cullBottom < nodeTop
    ) {
      return;
    }
  }

  canvas.save();
  canvas.translate(node.x + offsetX, node.y + offsetY);

  if (node.transform) {
    canvas.concat(node.transform);
  }

  if (node.clipPath) {
    const clipP = buildClipPath(ck, node.clipPath, node.width, node.height);
    if (clipP) {
      canvas.clipPath(clipP, ck.ClipOp.Intersect, true);
      clipP.delete();
    }
  }

  let hasBlendLayer = false;
  if (node.blendMode && node.blendMode !== "normal") {
    const blendPaint = new ck.Paint();
    blendPaint.setBlendMode(
      toSkiaBlendMode(ck, node.blendMode) as Parameters<
        typeof blendPaint.setBlendMode
      >[0],
    );
    canvas.saveLayer(blendPaint);
    blendPaint.delete();
    hasBlendLayer = true;
  }

  const layerCount = node.effects
    ? beginRenderEffects(ck, canvas, node.effects)
    : 0;

  switch (node.type) {
    case "box":
      renderBox(ck, canvas, node);
      break;
    case "text":
      if (node.box) renderBox(ck, canvas, node);
      if (
        fontMgr &&
        !(node.elementId && node.elementId === getEditingElementId())
      ) {
        renderText(ck, canvas, node, fontMgr);
      }
      break;
    case "image":
      renderImage(ck, canvas, node, fontMgr);
      break;
    case "line":
      renderLine(ck, canvas, node);
      break;
    case "arc":
      renderArc(ck, canvas, node);
      break;
    case "icon_path":
      renderIconPath(ck, canvas, node);
      break;
    case "partial_border":
      renderPartialBorder(ck, canvas, node);
      break;
    case "container":
      break;
  }

  if (node.children) {
    if (node.clipChildren && node.width > 0 && node.height > 0) {
      canvas.save();
      const clipRect = ck.LTRBRect(0, 0, node.width, node.height);
      canvas.clipRect(clipRect, ck.ClipOp.Intersect, true);
    }

    const hasScrollOffset =
      node.scrollOffset &&
      (node.scrollOffset.scrollTop !== 0 || node.scrollOffset.scrollLeft !== 0);
    if (hasScrollOffset) {
      canvas.save();
      canvas.translate(
        -node.scrollOffset!.scrollLeft,
        -node.scrollOffset!.scrollTop,
      );
    }

    const childCullLeft =
      cullLeft - node.x + (node.scrollOffset?.scrollLeft ?? 0);
    const childCullTop = cullTop - node.y + (node.scrollOffset?.scrollTop ?? 0);
    const childCullRight =
      cullRight - node.x + (node.scrollOffset?.scrollLeft ?? 0);
    const childCullBottom =
      cullBottom - node.y + (node.scrollOffset?.scrollTop ?? 0);
    const hasZIndex = node.children.some((c) => c.zIndex !== undefined);
    const childrenToRender = hasZIndex
      ? sortByStackingOrder(node.children)
      : node.children;
    for (const child of childrenToRender) {
      renderNodeInternal(
        ck,
        canvas,
        child,
        childCullLeft,
        childCullTop,
        childCullRight,
        childCullBottom,
        fontMgr,
      );
    }

    if (hasScrollOffset) {
      canvas.restore();
    }

    if (node.scrollbar) {
      renderScrollbar(ck, canvas, node);
    }

    if (node.clipChildren && node.width > 0 && node.height > 0) {
      canvas.restore();
    }
  }

  endRenderEffects(canvas, layerCount);
  if (hasBlendLayer) canvas.restore();
  canvas.restore();
}
