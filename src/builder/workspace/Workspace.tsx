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
import { useStore } from "../stores";
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";
import { Minus, Plus, Scan, ChevronDown } from "lucide-react";
import { iconProps, iconSmall } from "../../utils/ui/uiConstants";
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

  // 🚀 Phase 2 최적화: containerSize를 ref로 관리 (React 리렌더 방지)
  const containerSizeRef = useRef({ width: 0, height: 0 });
  // % breakpoint일 때만 React state로 관리 (canvasSize 재계산용)
  const [containerSizeForPercent, setContainerSizeForPercent] = useState({ width: 0, height: 0 });
  const usesPercentBreakpointRef = useRef(false);

  // Feature flags
  const useWebGL = isWebGLCanvas();
  const compareMode = isCanvasCompareMode();

  // ============================================
  // Canvas Size from Breakpoint
  // ============================================

  // 선택된 breakpoint 정보
  const selectedBreakpoint = useMemo(() => {
    if (!breakpoint || !breakpoints || breakpoints.length === 0) {
      return null;
    }
    const selectedId = Array.from(breakpoint)[0] as string;
    return breakpoints.find((bp) => bp.id === selectedId) ?? null;
  }, [breakpoint, breakpoints]);

  // % breakpoint 여부 체크 및 ref 업데이트
  const usesPercentBreakpoint = useMemo(() => {
    if (!selectedBreakpoint) return false;
    const widthStr = String(selectedBreakpoint.max_width);
    const heightStr = String(selectedBreakpoint.max_height);
    return widthStr.includes("%") || heightStr.includes("%");
  }, [selectedBreakpoint]);

  // ref 동기화 (useEffect에서 업데이트)
  useEffect(() => {
    usesPercentBreakpointRef.current = usesPercentBreakpoint;
  }, [usesPercentBreakpoint]);

  const canvasSize = useMemo(() => {
    if (!selectedBreakpoint) {
      return { width: 1920, height: 1080 }; // Default fallback
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

    // % breakpoint일 때만 containerSizeForPercent 사용
    // 비-% breakpoint에서는 parseSize가 숫자값을 직접 반환하므로 containerSize 미사용
    const containerSize = usesPercentBreakpoint
      ? containerSizeForPercent
      : { width: 0, height: 0 };

    const size = {
      width: parseSize(selectedBreakpoint.max_width, containerSize.width),
      height: parseSize(selectedBreakpoint.max_height, containerSize.height),
    };

    return size;
  }, [selectedBreakpoint, usesPercentBreakpoint, containerSizeForPercent]);

  // Canvas sync store
  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);
  const setZoom = useCanvasSyncStore((state) => state.setZoom);
  const setPanOffset = useCanvasSyncStore((state) => state.setPanOffset);
  const isCanvasReady = useCanvasSyncStore((state) => state.isCanvasReady);
  const isContextLost = useCanvasSyncStore((state) => state.isContextLost);

  // 🚀 Phase 2 최적화: breakpoint 변경 시에만 줌/팬 초기화
  const lastCenteredKeyRef = useRef<string | null>(null);
  const centerCanvasRef = useRef<() => boolean>(() => false);

  // 🚀 Fit 모드 추적: zoom이 fit 상태일 때 리사이즈 시 center 유지
  const isFitModeRef = useRef(true); // 초기 로드 시 fit 모드로 시작

  // 🚀 패널 토글 감지: 패널 리사이즈 시 centerCanvas 스킵
  const isPanelResizingRef = useRef(false);

  // 줌/팬 초기화 함수 (재사용)
  const centerCanvas = useCallback(() => {
    const containerSize = containerSizeRef.current;
    if (containerSize.width <= 0 || containerSize.height <= 0) return false;

    const scaleX = containerSize.width / canvasSize.width;
    const scaleY = containerSize.height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9;

    setZoom(fitZoom);
    setPanOffset({
      x: (containerSize.width - canvasSize.width * fitZoom) / 2,
      y: (containerSize.height - canvasSize.height * fitZoom) / 2,
    });
    return true;
  }, [canvasSize.width, canvasSize.height, setZoom, setPanOffset]);

  // ref 동기화 (useEffect에서 stale closure 방지)
  useEffect(() => {
    centerCanvasRef.current = centerCanvas;
  }, [centerCanvas]);

  // 🚀 패널 토글 감지: panelLayout 변경 시 플래그 설정
  useEffect(() => {
    let prevShowLeft = useStore.getState().panelLayout.showLeft;
    let prevShowRight = useStore.getState().panelLayout.showRight;

    const unsubscribe = useStore.subscribe((state) => {
      const { showLeft, showRight } = state.panelLayout;
      // showLeft 또는 showRight가 변경되었을 때만 처리
      if (showLeft !== prevShowLeft || showRight !== prevShowRight) {
        prevShowLeft = showLeft;
        prevShowRight = showRight;
        // 패널 토글 시 플래그 설정
        isPanelResizingRef.current = true;
        // 300ms 후 플래그 해제 (ResizeObserver보다 충분히 긴 시간)
        setTimeout(() => {
          isPanelResizingRef.current = false;
        }, 300);
      }
    });
    return unsubscribe;
  }, []);

  // Center canvas when breakpoint changes (NOT when container resizes)
  useEffect(() => {
    // breakpoint ID + 정의값 조합 키
    const breakpointKey = selectedBreakpoint
      ? `${selectedBreakpoint.id}:${selectedBreakpoint.max_width}x${selectedBreakpoint.max_height}`
      : null;

    // 같은 키면 센터링 스킵 (패널 resize 무시)
    if (lastCenteredKeyRef.current === breakpointKey) return;

    // 실제로 센터링이 수행된 후에만 키 업데이트
    // containerSize가 아직 0,0이면 키를 업데이트하지 않아서 나중에 다시 시도됨
    if (centerCanvas()) {
      lastCenteredKeyRef.current = breakpointKey;
    }
  }, [selectedBreakpoint, canvasSize.width, canvasSize.height, centerCanvas]);

  // ============================================
  // Container Size Tracking
  // ============================================

  // 🚀 Phase 2 최적화: ResizeObserver 콜백에서 contentRect 사용 (Forced Reflow 방지)
  // ref + store 업데이트, % breakpoint일 때만 React state 업데이트
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // ✅ contentRect 사용 (Forced Reflow 방지)
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;

      // ✅ 동일값 스킵
      const prev = containerSizeRef.current;
      if (prev.width === width && prev.height === height) return;

      // ✅ RAF 스로틀
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        // 초기 로드 여부 체크 (센터링 아직 안 됨)
        const isInitialLoad = containerSizeRef.current.width === 0;

        // ref 업데이트 (React 리렌더 없음)
        containerSizeRef.current = { width, height };

        // 🚀 패널 토글로 인한 리사이즈는 store 업데이트 스킵 (GridLayer 리렌더 방지)
        if (isPanelResizingRef.current) {
          return;
        }

        // store 업데이트 (GridLayer 등이 subscribe)
        useCanvasSyncStore.getState().setContainerSize({ width, height });

        // % breakpoint일 때만 React state 업데이트
        if (usesPercentBreakpointRef.current) {
          setContainerSizeForPercent({ width, height });
        }

        // 🚀 초기 로드 또는 fit 모드일 때 센터링 수행
        if (isInitialLoad || isFitModeRef.current) {
          centerCanvasRef.current();
        }
      });
    });

    resizeObserver.observe(container);

    // 초기 크기 설정
    const initialWidth = container.clientWidth;
    const initialHeight = container.clientHeight;
    if (initialWidth > 0 && initialHeight > 0) {
      containerSizeRef.current = { width: initialWidth, height: initialHeight };
      useCanvasSyncStore.getState().setContainerSize({ width: initialWidth, height: initialHeight });
      if (usesPercentBreakpointRef.current) {
        setContainerSizeForPercent({ width: initialWidth, height: initialHeight });
      }
      // 🚀 초기 센터링 수행 (ref 사용 - 의존성 불필요)
      centerCanvasRef.current();
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []); // 의존성 없음 - ref 사용으로 stale closure 방지

  // ============================================
  // Zoom/Pan Controls (useViewportControl에서 처리)
  // ============================================

  // ============================================
  // Zoom Presets (중앙 기준 줌)
  // ============================================

  const zoomTo = useCallback(
    (level: number) => {
      // 🚀 수동 zoom 변경 시 fit 모드 해제
      isFitModeRef.current = false;

      const containerSize = containerSizeRef.current;
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
    [zoom, panOffset, setZoom, setPanOffset]
  );

  const zoomToFit = useCallback(() => {
    const containerSize = containerSizeRef.current;
    if (containerSize.width === 0 || containerSize.height === 0) return;

    // 🚀 Fit 버튼 클릭 시 fit 모드 활성화
    isFitModeRef.current = true;

    const scaleX = containerSize.width / canvasSize.width;
    const scaleY = containerSize.height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9; // 10% 여백

    setZoom(fitZoom);
    setPanOffset({
      x: (containerSize.width - canvasSize.width * fitZoom) / 2,
      y: (containerSize.height - canvasSize.height * fitZoom) / 2,
    });
  }, [canvasSize, setZoom, setPanOffset]);

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
            <Minus size={iconProps.size} />
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
                <ChevronDown size={iconSmall.size} />
              </Button>
            </div>
            <Popover className="zoom-combobox-popover">
              <ListBox className="zoom-combobox-listbox">
                {ZOOM_PRESETS.map((preset) => (
                  <ListBoxItem
                    key={preset}
                    id={preset}
                    className="zoom-combobox-item"
                    textValue={`${preset}%`}
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
            <Plus size={iconProps.size} />
          </button>
          <button className="zoom-control-button" onClick={zoomToFit}>
            <Scan size={iconProps.size} />
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
          <Minus size={iconProps.size} />
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
              <ChevronDown size={iconSmall.size} />
            </Button>
          </div>
          <Popover className="zoom-combobox-popover">
            <ListBox className="zoom-combobox-listbox">
              {ZOOM_PRESETS.map((preset) => (
                <ListBoxItem
                  key={preset}
                  id={preset}
                  className="zoom-combobox-item"
                  textValue={`${preset}%`}
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
          <Plus size={iconProps.size} />
        </button>
        <button className="zoom-control-button" onClick={zoomToFit}>
          <Scan size={iconProps.size} />
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
