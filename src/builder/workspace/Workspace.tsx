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

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  Key,
  ComboBox,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
} from "react-aria-components";
import { BuilderCanvas } from "./canvas/BuilderCanvas";
import { useCanvasSyncStore } from "./canvas/canvasSync";
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";
import { Minus, Plus, Scan, ChevronDown } from "lucide-react";
import "./Workspace.css";
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

/** 줌 프리셋 옵션 (%) */
const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400, 500];

// ============================================
// Main Component
// ============================================

export function Workspace({
  breakpoint,
  breakpoints,
  fallbackCanvas,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Feature flags
  const useWebGL = isWebGLCanvas();
  const compareMode = isCanvasCompareMode();

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
    const parseSize = (
      value: string | number,
      containerDimension: number
    ): number => {
      if (typeof value === "number") return value;
      const strValue = String(value);
      // Handle percentage values
      if (strValue.includes("%")) {
        const percent = parseFloat(strValue) / 100;
        return containerDimension > 0
          ? Math.floor(containerDimension * percent)
          : 1920;
      }
      const numValue = parseInt(strValue, 10);
      return isNaN(numValue) ? 1920 : numValue;
    };

    const size = {
      width: parseSize(selectedBreakpoint.max_width, containerSize.width),
      height: parseSize(selectedBreakpoint.max_height, containerSize.height),
    };

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
  }, [
    canvasSize.width,
    canvasSize.height,
    containerSize.width,
    containerSize.height,
    setZoom,
    setPanOffset,
  ]);

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
  // Zoom ComboBox
  // ============================================

  const [zoomInputValue, setZoomInputValue] = useState("");

  // zoom 값 변경 시 입력 값 동기화
  useEffect(() => {
    setZoomInputValue(`${Math.round(zoom * 100)}%`);
  }, [zoom]);

  const handleZoomInputChange = useCallback((value: string) => {
    setZoomInputValue(value);
  }, []);

  const handleZoomSelectionChange = useCallback(
    (key: Key | null) => {
      if (key === null) return;
      const percent = Number(key);
      if (!isNaN(percent)) {
        zoomTo(percent / 100);
      }
    },
    [zoomTo]
  );

  const handleZoomInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = zoomInputValue.replace("%", "").trim();
        const percent = parseFloat(trimmed);
        if (!isNaN(percent) && percent >= 10 && percent <= 500) {
          zoomTo(percent / 100);
        } else {
          // 유효하지 않으면 현재 값으로 복원
          setZoomInputValue(`${Math.round(zoom * 100)}%`);
        }
        (e.target as HTMLInputElement).blur();
      }
    },
    [zoomInputValue, zoomTo, zoom]
  );

  const handleZoomInputBlur = useCallback(() => {
    const trimmed = zoomInputValue.replace("%", "").trim();
    const percent = parseFloat(trimmed);
    if (!isNaN(percent) && percent >= 10 && percent <= 500) {
      zoomTo(percent / 100);
    } else {
      // 유효하지 않으면 현재 값으로 복원
      setZoomInputValue(`${Math.round(zoom * 100)}%`);
    }
  }, [zoomInputValue, zoomTo, zoom]);

  // ============================================
  // Render
  // ============================================

  // 비교 모드: iframe + PixiJS 동시 표시
  if (compareMode && fallbackCanvas) {
    return (
      <div ref={containerRef} className="workspace workspace--compare-mode">
        {/* 왼쪽: iframe Canvas */}
        <div className="workspace-compare-panel workspace-compare-panel--left">
          <div className="workspace-compare-label">iframe Preview</div>
          <div className="workspace-compare-content">
            {fallbackCanvas}
          </div>
        </div>

        {/* 오른쪽: PixiJS Canvas */}
        <div className="workspace-compare-panel workspace-compare-panel--right">
          <div className="workspace-compare-label">PixiJS Canvas</div>
          <div className="workspace-compare-content">
            <BuilderCanvas
              pageWidth={canvasSize.width}
              pageHeight={canvasSize.height}
            />
          </div>
        </div>

        {/* Zoom Controls (PixiJS용) */}
        <div className="workspace-zoom-controls">
          <button
            className="zoom-control-button"
            onClick={() => zoomTo(zoom - ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
          >
            <Minus size={16} />
          </button>
          <ComboBox
            className="zoom-combobox"
            inputValue={zoomInputValue}
            onInputChange={handleZoomInputChange}
            onSelectionChange={handleZoomSelectionChange}
            aria-label="Zoom level"
            allowsCustomValue
          >
            <div className="zoom-combobox-container">
              <Input
                className="zoom-combobox-input"
                onKeyDown={handleZoomInputKeyDown}
                onBlur={handleZoomInputBlur}
              />
              <Button className="zoom-combobox-button">
                <ChevronDown size={12} />
              </Button>
            </div>
            <Popover className="zoom-combobox-popover">
              <ListBox className="zoom-combobox-listbox">
                {ZOOM_PRESETS.map((preset) => (
                  <ListBoxItem
                    key={preset}
                    id={preset}
                    className="zoom-combobox-item"
                  >
                    {preset}%
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </ComboBox>
          <button
            className="zoom-control-button"
            onClick={() => zoomTo(zoom + ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus size={16} />
          </button>
          <button className="zoom-control-button" onClick={zoomToFit}>
            <Scan size={16} />
          </button>
        </div>

        {/* Status Indicator */}
        {(isContextLost || !isCanvasReady) && (
          <div className="workspace-status-indicator">
            {isContextLost
              ? "⚠️ GPU 리소스 복구 중..."
              : "🔄 캔버스 초기화 중..."}
          </div>
        )}
      </div>
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

      {/* Zoom Controls */}
      <div className="workspace-zoom-controls">
        <button
          className="zoom-control-button"
          onClick={() => zoomTo(zoom - ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
        >
          <Minus size={16} />
        </button>
        <ComboBox
          className="zoom-combobox"
          inputValue={zoomInputValue}
          onInputChange={handleZoomInputChange}
          onSelectionChange={handleZoomSelectionChange}
          aria-label="Zoom level"
          allowsCustomValue
        >
          <div className="zoom-combobox-container">
            <Input
              className="zoom-combobox-input"
              onKeyDown={handleZoomInputKeyDown}
              onBlur={handleZoomInputBlur}
            />
            <Button className="zoom-combobox-button">
              <ChevronDown size={12} />
            </Button>
          </div>
          <Popover className="zoom-combobox-popover">
            <ListBox className="zoom-combobox-listbox">
              {ZOOM_PRESETS.map((preset) => (
                <ListBoxItem
                  key={preset}
                  id={preset}
                  className="zoom-combobox-item"
                >
                  {preset}%
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </ComboBox>
        <button
          className="zoom-control-button"
          onClick={() => zoomTo(zoom + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
        >
          <Plus size={16} />
        </button>
        <button className="zoom-control-button" onClick={zoomToFit}>
          <Scan size={16} />
        </button>
      </div>

      {/* Status Indicator */}
      {(isContextLost || !isCanvasReady) && (
        <div className="workspace-status-indicator">
          {isContextLost
            ? "⚠️ GPU 리소스 복구 중..."
            : "🔄 캔버스 초기화 중..."}
        </div>
      )}
    </main>
  );
}

export default Workspace;
