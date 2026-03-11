import { useEffect } from "react";

interface UseCanvasSurfaceLifecycleParams {
  appReady: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  renderVersion: number;
  setCanvasReady: (ready: boolean) => void;
  setContextLost: (lost: boolean) => void;
  syncPixiVersion: (version: number) => void;
}

export function useCanvasSurfaceLifecycle({
  appReady,
  containerRef,
  renderVersion,
  setCanvasReady,
  setContextLost,
  syncPixiVersion,
}: UseCanvasSurfaceLifecycleParams): void {
  useEffect(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) {
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };

    const handleContextRestored = () => {
      setContextLost(false);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [appReady, containerRef, setContextLost]);

  useEffect(() => {
    syncPixiVersion(renderVersion);
  }, [renderVersion, syncPixiVersion]);

  useEffect(() => {
    setCanvasReady(true);
    return () => setCanvasReady(false);
  }, [setCanvasReady]);
}
