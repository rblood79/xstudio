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

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Key } from 'react-aria-components';
import { BuilderCanvas } from './canvas/BuilderCanvas';
import { useCanvasSyncStore } from './canvas/canvasSync';
import { useWebGLCanvas } from '../../utils/featureFlags';
import './Workspace.css';
// ============================================
// Types
// ============================================

export interface Breakpoint {
  id: string;
  label: string;
  max_width: string | number;
  max_height: string | number;
}

export interface WorkspaceProps {
  /** 현재 선택된 breakpoint */
  breakpoint?: Set<Key>;
  /** breakpoint 목록 */
  breakpoints?: Breakpoint[];
  /** 기존 iframe 캔버스 (Feature Flag OFF 시 사용) */
  fallbackCanvas?: React.ReactNode;
}

// ============================================
// Constants
// ============================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

// ============================================
// Main Component
// ============================================

export function Workspace({ breakpoint, breakpoints, fallbackCanvas }: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Feature flag
  const useWebGL = useWebGLCanvas();

  // ============================================
  // Canvas Size from Breakpoint
  // ============================================

  const canvasSize = useMemo(() => {
    if (!breakpoint || !breakpoints || breakpoints.length === 0) {
      return { width: 1920, height: 1080 }; // Default fallback
    }

    // Get selected breakpoint ID
    const selectedId = Array.from(breakpoint)[0] as string;
    const selectedBreakpoint = breakpoints.find((bp) => bp.id === selectedId);

    if (!selectedBreakpoint) {
      return { width: 1920, height: 1080 };
    }

    // Parse width and height from breakpoint
    // Handle percentage values ("100%") by using container size
    const parseSize = (value: string | number, containerDimension: number): number => {
      if (typeof value === 'number') return value;
      const strValue = String(value);
      // Handle percentage values
      if (strValue.includes('%')) {
        const percent = parseFloat(strValue) / 100;
        return containerDimension > 0 ? Math.floor(containerDimension * percent) : 1920;
      }
      const numValue = parseInt(strValue, 10);
      return isNaN(numValue) ? 1920 : numValue;
    };

    const size = {
      width: parseSize(selectedBreakpoint.max_width, containerSize.width),
      height: parseSize(selectedBreakpoint.max_height, containerSize.height),
    };

    console.log('[Workspace] Canvas size:', size, 'Breakpoint:', selectedId);
    return size;
  }, [breakpoint, breakpoints, containerSize]);

  // Canvas sync store
  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);
  const setZoom = useCanvasSyncStore((state) => state.setZoom);
  const setPanOffset = useCanvasSyncStore((state) => state.setPanOffset);
  const isCanvasReady = useCanvasSyncStore((state) => state.isCanvasReady);
  const isContextLost = useCanvasSyncStore((state) => state.isContextLost);

  // Center canvas when breakpoint changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      // Center the canvas
      const scaleX = containerSize.width / canvasSize.width;
      const scaleY = containerSize.height / canvasSize.height;
      const fitZoom = Math.min(scaleX, scaleY) * 0.9;

      setZoom(fitZoom);
      setPanOffset({
        x: (containerSize.width - canvasSize.width * fitZoom) / 2,
        y: (containerSize.height - canvasSize.height * fitZoom) / 2,
      });
    }
  }, [canvasSize.width, canvasSize.height, containerSize.width, containerSize.height, setZoom, setPanOffset]);

  // ============================================
  // Container Size Tracking
  // ============================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // ============================================
  // Zoom Controls (휠 줌은 useZoomPan에서 처리)
  // ============================================

  // ============================================
  // Pan Controls (useZoomPan에서 처리)
  // ============================================

  // ============================================
  // Zoom Presets (중앙 기준 줌)
  // ============================================

  const zoomTo = useCallback(
    (level: number) => {
      if (containerSize.width === 0 || containerSize.height === 0) {
        setZoom(level);
        return;
      }

      // 뷰포트 중앙 좌표
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;

      // 현재 zoom과 panOffset
      const currentZoom = zoom;
      const currentPanOffset = panOffset;

      // 새 줌 레벨
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));

      // 줌 비율
      const zoomRatio = newZoom / currentZoom;

      // 중앙 기준 panOffset 계산
      const newPanX = centerX - (centerX - currentPanOffset.x) * zoomRatio;
      const newPanY = centerY - (centerY - currentPanOffset.y) * zoomRatio;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    },
    [containerSize, zoom, panOffset, setZoom, setPanOffset]
  );

  const zoomToFit = useCallback(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const scaleX = containerSize.width / canvasSize.width;
    const scaleY = containerSize.height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9; // 10% 여백

    setZoom(fitZoom);
    setPanOffset({
      x: (containerSize.width - canvasSize.width * fitZoom) / 2,
      y: (containerSize.height - canvasSize.height * fitZoom) / 2,
    });
  }, [containerSize, canvasSize, setZoom, setPanOffset]);

  // ============================================
  // Render
  // ============================================

  // Feature Flag OFF: 기존 iframe 캔버스 사용
  if (!useWebGL && fallbackCanvas) {
    return (
      <div
        ref={containerRef}
        className="workspace"
      >
        {fallbackCanvas}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="workspace"
    >
      {/* WebGL Canvas Layer */}
      <div
        className="workspace-canvas"
      >
        <BuilderCanvas
          pageWidth={canvasSize.width}
          pageHeight={canvasSize.height}
        />
      </div>

      {/* DOM Overlay Layer (B1.5에서 구현) */}
      <div className="workspace-overlay">
        {/* TextEditOverlay will be added in B1.5 */}
      </div>

      {/* Zoom Controls */}
      <div className="workspace-zoom-controls">
        <button
          className="zoom-control-button"
          onClick={() => zoomTo(zoom - ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
        >
          −
        </button>
        <span className="zoom-control-text">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="zoom-control-button"
          onClick={() => zoomTo(zoom + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
        >
          +
        </button>
        <button
          className="zoom-control-button"
          onClick={zoomToFit}
        >
          Fit
        </button>
      </div>

      {/* Status Indicator */}
      {(isContextLost || !isCanvasReady) && (
        <div
          className="workspace-status-indicator"
        >
          {isContextLost ? '⚠️ GPU 리소스 복구 중...' : '🔄 캔버스 초기화 중...'}
        </div>
      )}
    </div>
  );
}

export default Workspace;
