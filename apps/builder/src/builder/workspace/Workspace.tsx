/**
 * Workspace Container
 *
 * 🚀 Phase 10 B1.1: 캔버스와 오버레이를 포함하는 메인 워크스페이스
 *
 * 구조:
 * ```
 * <Workspace>
 *   ├── <BuilderCanvas />       (WebGL Layer)
 *   └── <Overlay>               (DOM Layer - B1.5에서 구현)
 *       └── <TextEditOverlay />
 * </Workspace>
 * ```
 *
 * @since 2025-12-11 Phase 10 B1.1
 */

import { useRef } from "react";
import { BuilderCanvas } from "./canvas/BuilderCanvas";
import { useCanvasSyncStore } from "./canvas/canvasSync";
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";
import { CanvasScrollbar } from "./scrollbar";
import { WorkflowCanvasToggles } from "./components/WorkflowCanvasToggles";
import { WorkspaceCompareMode } from "./components/WorkspaceCompareMode";
import { WorkspaceStatusIndicator } from "./components/WorkspaceStatusIndicator";
import { useWorkspaceCanvasSizing } from "./hooks/useWorkspaceCanvasSizing";
import { useWorkspaceCompareSplit } from "./hooks/useWorkspaceCompareSplit";
import type { WorkspaceProps } from "./types";
import "./Workspace.css";

export function Workspace({
  breakpoint,
  breakpoints,
  fallbackCanvas,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Feature flags
  const useWebGL = isWebGLCanvas();
  const compareMode = isCanvasCompareMode();

  const {
    compareSplit,
    handleResizeEnd,
    handleResizeMove,
    handleResizeStart,
  } = useWorkspaceCompareSplit({
    containerRef,
  });
  const { canvasSize } = useWorkspaceCanvasSizing({
    breakpoint,
    breakpoints,
    compareMode,
    compareSplit,
    containerRef,
  });

  // Canvas sync store
  const isCanvasReady = useCanvasSyncStore((state) => state.isCanvasReady);
  const isContextLost = useCanvasSyncStore((state) => state.isContextLost);

  // 비교 모드: iframe + PixiJS 동시 표시
  if (compareMode && fallbackCanvas) {
    return (
      <WorkspaceCompareMode
        compareSplit={compareSplit}
        containerRef={containerRef}
        fallbackCanvas={fallbackCanvas}
        pageWidth={canvasSize.width}
        pageHeight={canvasSize.height}
        isCanvasReady={isCanvasReady}
        isContextLost={isContextLost}
        onResizeStart={handleResizeStart}
        onResizeMove={handleResizeMove}
        onResizeEnd={handleResizeEnd}
      />
    );
  }

  // Feature Flag OFF: 기존 iframe 캔버스 사용
  if (!useWebGL && fallbackCanvas) {
    return (
      <main ref={containerRef} className="workspace">
        {fallbackCanvas}
      </main>
    );
  }

  return (
    <main ref={containerRef} className="workspace">
      {/* WebGL Canvas (DOM depth 최소화: .workspace → .builder-canvas-container → canvas) */}
      <BuilderCanvas
        pageWidth={canvasSize.width}
        pageHeight={canvasSize.height}
      />

      {/* DOM Overlay Layer (B1.5에서 구현) */}
      <div className="workspace-overlay">
        {/* TextEditOverlay will be added in B1.5 */}
      </div>

      {/* Workflow Sub-Toggles + Legend (캔버스 상단 통합) */}
      <WorkflowCanvasToggles />

      {/* Figma-style Canvas Scrollbars */}
      <CanvasScrollbar direction="horizontal" />
      <CanvasScrollbar direction="vertical" />

      <WorkspaceStatusIndicator
        isCanvasReady={isCanvasReady}
        isContextLost={isContextLost}
      />
    </main>
  );
}

export default Workspace;
