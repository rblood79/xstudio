import { useApplication } from "@pixi/react";
import { Graphics as PixiGraphics } from "pixi.js";
import { useCallback, useEffect, useRef } from "react";
import { PIXI_COMPONENTS, useExtend } from "../pixiSetup";

interface ClickableBackgroundProps {
  onClick?: () => void;
  panOffset: { x: number; y: number };
  zoom: number;
}

export function ClickableBackground({ onClick }: ClickableBackgroundProps) {
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

  const isPointerDownOnCanvasRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    isPointerDownOnCanvasRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isPointerDownOnCanvasRef.current) {
      return;
    }

    isPointerDownOnCanvasRef.current = false;
    onClick?.();
  }, [onClick]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor="default"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    />
  );
}
