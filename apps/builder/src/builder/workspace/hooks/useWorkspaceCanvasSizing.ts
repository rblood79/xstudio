import type { Key } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewportSyncStore } from "../canvas/stores";
import {
  applyViewportState,
  computeCenteredViewport,
  computeFitViewport,
} from "../canvas/viewport/viewportActions";
import type { Breakpoint } from "../types";
import { subscribeToPanelLayoutChanges } from "../utils/panelLayoutRuntime";

interface UseWorkspaceCanvasSizingOptions {
  breakpoint?: Set<Key>;
  breakpoints?: Breakpoint[];
  compareMode: boolean;
  compareSplit: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface WorkspaceCanvasSize {
  height: number;
  width: number;
}

export interface UseWorkspaceCanvasSizingResult {
  canvasSize: WorkspaceCanvasSize;
}

export function useWorkspaceCanvasSizing({
  breakpoint,
  breakpoints,
  compareMode,
  compareSplit,
  containerRef,
}: UseWorkspaceCanvasSizingOptions): UseWorkspaceCanvasSizingResult {
  const containerSizeRef = useRef({ height: 0, width: 0 });
  const [containerSizeForPercent, setContainerSizeForPercent] = useState({
    height: 0,
    width: 0,
  });
  const usesPercentBreakpointRef = useRef(false);

  const selectedBreakpoint = useMemo(() => {
    if (!breakpoint || !breakpoints || breakpoints.length === 0) {
      return null;
    }

    const selectedId = Array.from(breakpoint)[0] as string;
    return breakpoints.find((candidate) => candidate.id === selectedId) ?? null;
  }, [breakpoint, breakpoints]);

  const usesPercentBreakpoint = useMemo(() => {
    if (!selectedBreakpoint) {
      return false;
    }

    return (
      String(selectedBreakpoint.max_width).includes("%") ||
      String(selectedBreakpoint.max_height).includes("%")
    );
  }, [selectedBreakpoint]);

  useEffect(() => {
    usesPercentBreakpointRef.current = usesPercentBreakpoint;
  }, [usesPercentBreakpoint]);

  const canvasSize = useMemo(() => {
    if (!selectedBreakpoint) {
      return { height: 1080, width: 1920 };
    }

    const parseSize = (
      value: string | number,
      containerDimension: number,
    ): number => {
      if (typeof value === "number") {
        return value;
      }

      const stringValue = String(value);
      if (stringValue.includes("%")) {
        const percent = parseFloat(stringValue) / 100;
        return containerDimension > 0
          ? Math.floor(containerDimension * percent)
          : 1920;
      }

      const parsed = parseInt(stringValue, 10);
      return Number.isNaN(parsed) ? 1920 : parsed;
    };

    const containerSize = usesPercentBreakpoint
      ? containerSizeForPercent
      : { height: 0, width: 0 };

    return {
      height: parseSize(selectedBreakpoint.max_height, containerSize.height),
      width: parseSize(selectedBreakpoint.max_width, containerSize.width),
    };
  }, [containerSizeForPercent, selectedBreakpoint, usesPercentBreakpoint]);

  useEffect(() => {
    useViewportSyncStore.getState().setCanvasSize(canvasSize);
  }, [canvasSize]);

  const lastCenteredKeyRef = useRef<string | null>(null);
  const centerCanvasRef = useRef<() => boolean>(() => false);
  const centerCanvasAt100Ref = useRef<() => boolean>(() => false);
  const isFitModeRef = useRef(false);
  const isPanelResizingRef = useRef(false);

  const centerCanvas = useCallback(() => {
    const containerSize = containerSizeRef.current;
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return false;
    }

    const effectiveWidth = compareMode
      ? containerSize.width * ((100 - compareSplit) / 100)
      : containerSize.width;

    applyViewportState(
      computeFitViewport({
        canvasSize,
        containerSize: {
          height: containerSize.height,
          width: effectiveWidth,
        },
      }),
    );
    return true;
  }, [canvasSize, compareMode, compareSplit]);

  const centerCanvasAt100 = useCallback(() => {
    const containerSize = containerSizeRef.current;
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return false;
    }

    const effectiveWidth = compareMode
      ? containerSize.width * ((100 - compareSplit) / 100)
      : containerSize.width;

    applyViewportState(
      computeCenteredViewport({
        canvasSize,
        containerSize: {
          height: containerSize.height,
          width: effectiveWidth,
        },
        zoom: 1,
      }),
    );
    return true;
  }, [canvasSize, compareMode, compareSplit]);

  useEffect(() => {
    centerCanvasRef.current = centerCanvas;
    centerCanvasAt100Ref.current = centerCanvasAt100;
  }, [centerCanvas, centerCanvasAt100]);

  useEffect(() => {
    const unsubscribe = subscribeToPanelLayoutChanges({
      onToggle: () => {
        isPanelResizingRef.current = true;
      },
      onLayoutChange: () => {
        isPanelResizingRef.current = false;
      },
    });

    return () => {
      isPanelResizingRef.current = false;
      unsubscribe();
    };
  }, [containerRef]);

  const lastCompareModeRef = useRef(compareMode);

  useEffect(() => {
    const breakpointKey = selectedBreakpoint
      ? `${selectedBreakpoint.id}:${selectedBreakpoint.max_width}x${selectedBreakpoint.max_height}`
      : null;

    if (lastCenteredKeyRef.current === breakpointKey) {
      return;
    }

    if (centerCanvas()) {
      lastCenteredKeyRef.current = breakpointKey;
    }
  }, [canvasSize.height, canvasSize.width, centerCanvas, selectedBreakpoint]);

  // Compare mode 토글 시 viewport 재센터링
  useEffect(() => {
    if (lastCompareModeRef.current !== compareMode) {
      lastCompareModeRef.current = compareMode;
      // 약간의 지연 후 센터링 (레이아웃 변경 완료 대기)
      requestAnimationFrame(() => {
        centerCanvasAt100Ref.current();
      });
    }
  }, [compareMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let rafId: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { height, width } = entry.contentRect;
      if (width <= 0 || height <= 0) {
        return;
      }

      const previous = containerSizeRef.current;
      if (previous.width === width && previous.height === height) {
        return;
      }

      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;

        const isInitialLoad = containerSizeRef.current.width === 0;
        containerSizeRef.current = { height, width };

        if (isPanelResizingRef.current) {
          return;
        }

        useViewportSyncStore.getState().setContainerSize({ height, width });

        if (usesPercentBreakpointRef.current) {
          setContainerSizeForPercent({ height, width });
        }

        if (isInitialLoad) {
          centerCanvasAt100Ref.current();
        } else if (isFitModeRef.current) {
          centerCanvasRef.current();
        }
      });
    });

    resizeObserver.observe(container);

    const initialWidth = container.clientWidth;
    const initialHeight = container.clientHeight;
    if (initialWidth > 0 && initialHeight > 0) {
      containerSizeRef.current = {
        height: initialHeight,
        width: initialWidth,
      };
      useViewportSyncStore
        .getState()
        .setContainerSize({ height: initialHeight, width: initialWidth });

      if (usesPercentBreakpointRef.current) {
        setContainerSizeForPercent({
          height: initialHeight,
          width: initialWidth,
        });
      }

      centerCanvasAt100Ref.current();
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return {
    canvasSize,
  };
}
