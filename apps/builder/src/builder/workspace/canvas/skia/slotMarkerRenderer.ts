import type { CanvasKit, Canvas } from "canvaskit-wasm";
import type { EditingSemanticsRole } from "../../../utils/editingSemantics";
import type { BoundingBox } from "../selection/types";
import { SkiaDisposable } from "./disposable";
import { getSemanticOverlayColor } from "./semanticOverlayColors";

const SLOT_HATCH_ALPHA = 0.42;
const SLOT_HATCH_SPACING = 7;
const SLOT_HATCH_MAX_LINES = 180;
const SLOT_BORDER_ALPHA = 0.95;

export function renderSlotHatchPattern(
  ck: CanvasKit,
  canvas: Canvas,
  bounds: BoundingBox,
  zoom: number,
  role: EditingSemanticsRole | null,
  showHatch = true,
): void {
  if (bounds.width <= 0 || bounds.height <= 0) return;

  const scope = new SkiaDisposable();
  try {
    const rect = ck.LTRBRect(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );

    if (showHatch) {
      canvas.save();
      canvas.clipRect(rect, ck.ClipOp.Intersect, true);

      const paint = scope.track(new ck.Paint());
      paint.setAntiAlias(true);
      paint.setStyle(ck.PaintStyle.Stroke);
      paint.setStrokeWidth(1.5 / zoom);
      paint.setColor(getSemanticOverlayColor(ck, role, SLOT_HATCH_ALPHA));

      const spacing = SLOT_HATCH_SPACING / zoom;
      const totalSpan = bounds.width + bounds.height;
      const effectiveSpacing =
        totalSpan / spacing > SLOT_HATCH_MAX_LINES
          ? totalSpan / SLOT_HATCH_MAX_LINES
          : spacing;

      const path = scope.track(new ck.Path());
      for (let d = -bounds.height; d < bounds.width; d += effectiveSpacing) {
        const x0 = bounds.x + d;
        const y0 = bounds.y;
        const x1 = bounds.x + d + bounds.height;
        const y1 = bounds.y + bounds.height;
        path.moveTo(x0, y0);
        path.lineTo(x1, y1);
      }

      canvas.drawPath(path, paint);
      canvas.restore();
    }

    const borderPaint = scope.track(new ck.Paint());
    borderPaint.setAntiAlias(true);
    borderPaint.setStyle(ck.PaintStyle.Stroke);
    borderPaint.setStrokeWidth(1.5 / zoom);
    borderPaint.setColor(getSemanticOverlayColor(ck, role, SLOT_BORDER_ALPHA));
    canvas.drawRect(rect, borderPaint);
  } finally {
    scope.dispose();
  }
}
