import { useCallback } from "react";
import { Graphics as PixiGraphics } from "pixi.js";
import { PIXI_COMPONENTS, useExtend } from "../pixiSetup";
import { useThemeColors } from "../hooks/useThemeColors";
import { getOutlineVariantColor } from "../utils/cssVariableReader";

interface CanvasBoundsProps {
  height: number;
  width: number;
  zoom?: number;
}

export function CanvasBounds({
  width,
  height,
  zoom = 1,
}: CanvasBoundsProps) {
  useExtend(PIXI_COMPONENTS);
  useThemeColors();

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  const strokeWidth = 1 / zoom;

  const draw = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      graphics.setStrokeStyle({
        width: strokeWidth,
        color: getOutlineVariantColor(),
      });
      graphics.rect(0, 0, roundedWidth, roundedHeight);
      graphics.stroke();
    },
    [roundedHeight, roundedWidth, strokeWidth],
  );

  return <pixiGraphics draw={draw} />;
}
