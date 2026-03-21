/**
 * Skia Drop Indicator 렌더러
 *
 * 드래그 중 drop 대상 컨테이너의 아웃라인 + 삽입 위치 라인을
 * CanvasKit으로 렌더링한다.
 * Pencil eQ.render() 패턴 참조 (scenegraph.txt L932-976).
 * 카메라 변환(translate + scale) 내부에서 씬-로컬 좌표로 호출된다.
 */

import type { CanvasKit, Canvas } from "canvaskit-wasm";
import type { BoundingBox } from "../selection/types";

// blue-500 (#3b82f6)
const DROP_R = 0x3b / 255;
const DROP_G = 0x82 / 255;
const DROP_B = 0xf6 / 255;

export interface DropIndicatorState {
  targetBounds: BoundingBox;
  insertIndex: number;
  childBounds: BoundingBox[];
  isHorizontal: boolean;
}

/**
 * Drop indicator를 CanvasKit으로 렌더링한다.
 *
 * 1. 타겟 컨테이너 아웃라인 (3/zoom 두께, blue-500)
 * 2. 삽입 위치 dashed line (2/zoom 두께, 자식 간 중점)
 */
export function renderDropIndicator(
  ck: CanvasKit,
  canvas: Canvas,
  state: DropIndicatorState,
  zoom: number,
): void {
  const { targetBounds, insertIndex, childBounds, isHorizontal } = state;

  const paint = new ck.Paint();
  paint.setColor(ck.Color4f(DROP_R, DROP_G, DROP_B, 1));
  paint.setAntiAlias(true);
  paint.setStyle(ck.PaintStyle.Stroke);

  // 1. 타겟 컨테이너 아웃라인
  const sw = 3 / zoom;
  paint.setStrokeWidth(sw);
  canvas.drawRect4f(
    targetBounds.x - sw / 2,
    targetBounds.y - sw / 2,
    targetBounds.x + targetBounds.width + sw / 2,
    targetBounds.y + targetBounds.height + sw / 2,
    paint,
  );

  // 2. 삽입 라인 (dashed)
  if (insertIndex >= 0 && childBounds.length > 0) {
    const lw = 2 / zoom;
    paint.setStrokeWidth(lw);
    const dashEffect = ck.PathEffect.MakeDash([8 / zoom, 8 / zoom]);
    paint.setPathEffect(dashEffect);

    const start = (b: BoundingBox) => (isHorizontal ? b.x : b.y);
    const end = (b: BoundingBox) =>
      isHorizontal ? b.x + b.width : b.y + b.height;

    let linePos: number;
    if (insertIndex === 0) {
      linePos = (start(targetBounds) + start(childBounds[0])) / 2;
    } else if (insertIndex >= childBounds.length) {
      linePos =
        (end(childBounds[childBounds.length - 1]) + end(targetBounds)) / 2;
    } else {
      linePos =
        (end(childBounds[insertIndex - 1]) + start(childBounds[insertIndex])) /
        2;
    }

    if (isHorizontal) {
      canvas.drawRect4f(
        linePos,
        targetBounds.y,
        linePos,
        targetBounds.y + targetBounds.height,
        paint,
      );
    } else {
      canvas.drawRect4f(
        targetBounds.x,
        linePos,
        targetBounds.x + targetBounds.width,
        linePos,
        paint,
      );
    }

    dashEffect.delete();
  }

  paint.delete();
}
