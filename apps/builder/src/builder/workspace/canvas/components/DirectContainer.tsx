import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { Container } from "pixi.js";
import { registerElement, unregisterElement, updateElementBounds } from "../elementRegistry";
import { LayoutComputedSizeContext } from "../layoutContext";
import { useExtend, PIXI_COMPONENTS } from "../pixiSetup";
import { notifyLayoutChange } from "../skia/useSkiaNode";

interface DirectContainerProps {
  children: React.ReactNode;
  elementId?: string;
  height: number;
  width: number;
  x: number;
  y: number;
}

export const DirectContainer = memo(function DirectContainer({
  elementId,
  x,
  y,
  width,
  height,
  children,
}: DirectContainerProps) {
  useExtend(PIXI_COMPONENTS);

  const containerRef = useRef<Container | null>(null);
  const handleContainerRef = useCallback(
    (container: Container | null) => {
      containerRef.current = container;
      if (container && elementId) {
        registerElement(elementId, container);
      }
    },
    [elementId],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !elementId || container.destroyed) return;
    try {
      const bounds = container.getBounds();
      if (bounds.width > 0 || bounds.height > 0) {
        updateElementBounds(elementId, {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });
      }
    } catch {
      // Container destroyed 또는 아직 미렌더링
    }
    notifyLayoutChange();
  }, [elementId, x, y, width, height]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !elementId) return;
    const rafId = requestAnimationFrame(() => {
      if (container.destroyed) return;
      try {
        const bounds = container.getBounds();
        if (bounds.width > 0 || bounds.height > 0) {
          updateElementBounds(elementId, {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          });
        }
      } catch {
        // Container destroyed
      }
      notifyLayoutChange();
    });
    return () => cancelAnimationFrame(rafId);
  }, [elementId]);

  useEffect(() => {
    if (!elementId) return;
    return () => {
      unregisterElement(elementId);
    };
  }, [elementId]);

  const computedSize = useMemo(
    () => ({ width: Math.max(width, 0), height: Math.max(height, 0) }),
    [width, height],
  );

  return (
    <LayoutComputedSizeContext.Provider value={computedSize}>
      <pixiContainer
        ref={handleContainerRef}
        x={x}
        y={y}
        label={elementId ?? "direct-wrapper"}
      >
        {children}
      </pixiContainer>
    </LayoutComputedSizeContext.Provider>
  );
});
