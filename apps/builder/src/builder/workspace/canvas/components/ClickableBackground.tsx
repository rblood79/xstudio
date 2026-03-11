import { useApplication } from "@pixi/react";
import { Graphics as PixiGraphics } from "pixi.js";
import { useCallback, useEffect, useRef } from "react";
import { PIXI_COMPONENTS, useExtend } from "../pixiSetup";
import { screenToViewportPoint } from "../viewport/viewportTransforms";

interface ClickableBackgroundProps {
  onClick?: () => void;
  onLassoDrag?: (position: { x: number; y: number }) => void;
  onLassoEnd?: () => void;
  onLassoStart?: (position: { x: number; y: number }) => void;
  panOffset: { x: number; y: number };
  zoom: number;
}

export function ClickableBackground({
  onClick,
  onLassoStart,
  onLassoDrag,
  onLassoEnd,
  zoom,
  panOffset,
}: ClickableBackgroundProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();

  useEffect(() => {
    if (!app || !app.renderer) {
      return;
    }

    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = app.canvas as HTMLCanvasElement;
    } catch {
      return;
    }

    if (!canvas) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        canvas.style.cursor = "crosshair";
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        canvas.style.cursor = "default";
      }
    };

    // eslint-disable-next-line local/prefer-keyboard-shortcuts-registry
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [app]);

  const draw = useCallback((graphics: PixiGraphics) => {
    graphics.clear();
    graphics.rect(-5000, -5000, 10000, 10000);
    graphics.fill({ color: 0xffffff, alpha: 0 });
  }, []);

  const isDraggingRef = useRef(false);
  const isPointerDownOnCanvasRef = useRef(false);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      return screenToViewportPoint({ x: screenX, y: screenY }, zoom, panOffset);
    },
    [panOffset, zoom],
  );

  const handlePointerDown = useCallback(
    (event: { global: { x: number; y: number } }) => {
      isPointerDownOnCanvasRef.current = true;
      isDraggingRef.current = true;
      onLassoStart?.(screenToCanvas(event.global.x, event.global.y));
    },
    [onLassoStart, screenToCanvas],
  );

  const handlePointerMove = useCallback(
    (event: { global: { x: number; y: number } }) => {
      if (!isDraggingRef.current) {
        return;
      }

      onLassoDrag?.(screenToCanvas(event.global.x, event.global.y));
    },
    [onLassoDrag, screenToCanvas],
  );

  const handlePointerUp = useCallback(() => {
    if (!isPointerDownOnCanvasRef.current) {
      return;
    }

    isPointerDownOnCanvasRef.current = false;

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onLassoEnd?.();
      return;
    }

    onClick?.();
  }, [onClick, onLassoEnd]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor="default"
      onPointerDown={handlePointerDown}
      onGlobalPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    />
  );
}
