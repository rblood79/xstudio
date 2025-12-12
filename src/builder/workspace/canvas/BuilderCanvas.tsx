/**
 * Builder Canvas
 *
 * 🚀 Phase 10 B1.1: WebGL 기반 메인 캔버스
 * 🚀 Phase 10 B1.2: ElementSprite 렌더링 시스템 통합
 *
 * 기능:
 * - PixiJS Application 초기화
 * - Element 렌더링 (ElementSprite)
 * - Selection Overlay (B1.3에서 완성)
 * - Zoom/Pan (B1.4에서 완성)
 *
 * @since 2025-12-11 Phase 10 B1.1
 * @updated 2025-12-11 Phase 10 B1.2 - ElementSprite 통합
 */

import { useCallback, useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react';
import { Application, extend, useApplication } from '@pixi/react';
import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Text as PixiText,
  TextStyle as PixiTextStyle,
} from 'pixi.js';
import { useStore } from '../../stores';

// 기본 PixiJS 컴포넌트만 extend (layoutContainer 제외)
extend({
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Text: PixiText,
  TextStyle: PixiTextStyle,
});
import { useCanvasSyncStore } from './canvasSync';
import { useWebGLCanvas } from '../../../utils/featureFlags';
import { ElementSprite } from './sprites';
import {
  SelectionLayer,
  useDragInteraction,
  findElementsInLasso,
  type HandlePosition,
  type BoundingBox,
  type CursorStyle,
} from './selection';
import { GridLayer, useZoomPan } from './grid';
import { BodyLayer } from './layers';
import { TextEditOverlay, useTextEdit } from '../overlay';
import { calculateLayout, type LayoutResult } from './layout';

// ============================================
// Types
// ============================================

export interface BuilderCanvasProps {
  /** 페이지 영역 너비 (breakpoint 크기) */
  pageWidth?: number;
  /** 페이지 영역 높이 (breakpoint 크기) */
  pageHeight?: number;
  /** 배경색 */
  backgroundColor?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_BACKGROUND = 0xf8fafc; // slate-50

// ============================================
// Sub-Components
// ============================================

// GridLayer는 ./grid/GridLayer.tsx로 이동됨 (B1.4)

/**
 * Canvas Resize Handler (Figma-style with CSS Transform)
 *
 * 전략:
 * 1. 애니메이션 중: CSS transform scale로 즉시 시각적 크기 조절 (깜빡임 없음)
 * 2. 애니메이션 종료 후 (150ms debounce): 실제 WebGL resize 수행
 * 3. resize 완료 후 CSS transform 제거
 *
 * 이렇게 하면 패널 열기/닫기 애니메이션 중 검은 화면이 보이지 않습니다.
 */
function CanvasResizeHandler({ width, height }: { width: number; height: number }) {
  const { app } = useApplication();
  const debounceTimer = useRef<number>(0);
  const baseSize = useRef<{ width: number; height: number }>({ width, height });
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!app?.renderer) return;

    const canvas = app.canvas as HTMLCanvasElement;
    if (!canvas) return;

    // 첫 렌더링: 즉시 resize (초기화)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      app.renderer.resize(width, height);
      baseSize.current = { width, height };
      return;
    }

    // 크기가 동일하면 skip
    if (baseSize.current.width === width && baseSize.current.height === height) {
      return;
    }

    // 애니메이션 중: CSS transform으로 즉시 스케일 조절
    const scaleX = width / baseSize.current.width;
    const scaleY = height / baseSize.current.height;
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = `scale(${scaleX}, ${scaleY})`;

    // 이전 debounce timer 취소
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 애니메이션 종료 후 (150ms 동안 변화 없으면): 실제 resize
    debounceTimer.current = window.setTimeout(() => {
      if (app.renderer) {
        // CSS transform 제거
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';

        // 실제 WebGL resize
        app.renderer.resize(width, height);
        baseSize.current = { width, height };
      }
      debounceTimer.current = 0;
    }, 150);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = 0;
      }
    };
  }, [app, width, height]);

  return null;
}

/**
 * 캔버스 경계 표시
 */
function CanvasBounds({ width, height }: { width: number; height: number }) {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 2, color: 0x3b82f6, alpha: 0.5 });
    g.rect(0, 0, width, height);
    g.stroke();
  }, [width, height]);

  return <pixiGraphics draw={draw} />;
}

/**
 * 클릭 가능한 백그라운드 (빈 영역 클릭 감지용)
 */
function ClickableBackground({
  width,
  height,
  onClick,
}: {
  width: number;
  height: number;
  onClick?: () => void;
}) {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    // 투명한 영역 (클릭 감지용)
    g.rect(0, 0, width, height);
    g.fill({ color: 0xffffff, alpha: 0 });
  }, [width, height]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor="default"
      onPointerDown={onClick}
    />
  );
}

// SelectionOverlay는 SelectionLayer로 대체됨 (B1.3)

/**
 * 요소 레이어 (ElementSprite 사용)
 *
 * 현재 페이지의 모든 요소를 ElementSprite로 렌더링합니다.
 * DOM 레이아웃 방식 (display: block, position: relative)을 재현합니다.
 */
function ElementsLayer({
  selectedIds,
  layoutResult,
  onClick,
  onDoubleClick,
}: {
  selectedIds: string[];
  layoutResult: LayoutResult;
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
}) {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);

  const elementById = useMemo(() => new Map(elements.map((el) => [el.id, el])), [elements]);

  // 깊이 맵을 한 번 계산하여 정렬 비용 감소
  const depthMap = useMemo(() => {
    const cache = new Map<string, number>();

    const computeDepth = (id: string | null): number => {
      if (!id) return 0;
      const cached = cache.get(id);
      if (cached !== undefined) return cached;

      const el = elementById.get(id);
      if (!el || el.tag.toLowerCase() === 'body') {
        cache.set(id, 0);
        return 0;
      }

      const depth = 1 + computeDepth(el.parent_id);
      cache.set(id, depth);
      return depth;
    };

    elements.forEach((el) => {
      cache.set(el.id, computeDepth(el.id));
    });

    return cache;
  }, [elements, elementById]);

  // 현재 페이지의 요소만 필터링 (Body 제외, 실제 렌더링 대상만)
  const pageElements = elements.filter((el) => {
    if (el.page_id !== currentPageId) return false;
    // Body 태그는 캔버스 전체를 의미하므로 렌더링에서 제외 (대소문자 무시)
    if (el.tag.toLowerCase() === 'body') return false;
    return true;
  });

  // 깊이 + order_num 기준으로 정렬 (부모 먼저 → 자식 나중에 렌더링)
  // DOM 방식: 자식이 부모 위에 표시됨
  const sortedElements = [...pageElements].sort((a, b) => {
    const depthA = depthMap.get(a.id) ?? 0;
    const depthB = depthMap.get(b.id) ?? 0;

    // 깊이가 다르면 깊이 순서 (낮은 것 먼저 = 부모 먼저)
    if (depthA !== depthB) return depthA - depthB;

    // 같은 깊이면 order_num 순서
    return (a.order_num || 0) - (b.order_num || 0);
  });

  return (
    <pixiContainer label="ElementsLayer" eventMode="static" interactiveChildren={true}>
      {sortedElements.map((element) => (
        <ElementSprite
          key={element.id}
          element={element}
          isSelected={selectedIds.includes(element.id)}
          layoutPosition={layoutResult.positions.get(element.id)}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </pixiContainer>
  );
}

// ============================================
// Main Component
// ============================================

export function BuilderCanvas({
  pageWidth = DEFAULT_WIDTH,
  pageHeight = DEFAULT_HEIGHT,
  backgroundColor = DEFAULT_BACKGROUND,
}: BuilderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 컨테이너 ref 콜백: 마운트 시점에 DOM 노드를 안전하게 확보
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerEl(node);
  }, []);

  // Container 크기 감지 (ResizeObserver)
  useLayoutEffect(() => {
    if (!containerEl) return;

    const updateSize = () => {
      setContainerSize({
        width: containerEl.clientWidth,
        height: containerEl.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerEl);

    return () => resizeObserver.disconnect();
  }, [containerEl]);

  // Store state
  const elements = useStore((state) => state.elements);
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setSelectedElements = useStore((state) => state.setSelectedElements);
  const clearSelection = useStore((state) => state.clearSelection);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const currentPageId = useStore((state) => state.currentPageId);
  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);

  // Canvas sync actions
  const setCanvasReady = useCanvasSyncStore((state) => state.setCanvasReady);
  const setContextLost = useCanvasSyncStore((state) => state.setContextLost);
  const syncPixiVersion = useCanvasSyncStore((state) => state.syncPixiVersion);
  const renderVersion = useCanvasSyncStore((state) => state.renderVersion);

  // 페이지 단위 레이아웃 계산 (재사용)
  const layoutResult = useMemo(() => {
    if (!currentPageId) return { positions: new Map() };
    return calculateLayout(elements, currentPageId, pageWidth, pageHeight);
  }, [elements, currentPageId, pageWidth, pageHeight]);

  // Zoom/Pan 인터랙션
  useZoomPan({
    containerEl,
    minZoom: 0.1,
    maxZoom: 5,
    zoomStep: 0.1,
  });

  // 현재 페이지 요소 필터링 (라쏘 선택용)
  const pageElements = useMemo(() => {
    return elements.filter((el) => el.page_id === currentPageId && el.tag !== 'Body');
  }, [elements, currentPageId]);

  // 라쏘 선택 영역 내 요소 찾기
  const findElementsInLassoArea = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      return findElementsInLasso(
        pageElements.map((el) => ({
          id: el.id,
          props: { style: el.props?.style as Record<string, unknown> },
        })),
        start,
        end
      );
    },
    [pageElements]
  );

  // 드래그 인터랙션 - startLasso, updateDrag, endDrag는 추후 구현 예정
  const {
    dragState,
    startMove,
    startResize,
    // startLasso,
    // updateDrag,
    // endDrag,
  } = useDragInteraction({
    onMoveEnd: useCallback(
      (elementId: string, delta: { x: number; y: number }) => {
        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        const style = element.props?.style as Record<string, unknown> | undefined;
        const currentX = Number(style?.left) || 0;
        const currentY = Number(style?.top) || 0;

        updateElementProps(elementId, {
          style: {
            ...style,
            left: currentX + delta.x,
            top: currentY + delta.y,
          },
        });
      },
      [elements, updateElementProps]
    ),
    onResizeEnd: useCallback(
      (elementId: string, _handle: HandlePosition, newBounds: BoundingBox) => {
        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        const style = element.props?.style as Record<string, unknown> | undefined;

        updateElementProps(elementId, {
          style: {
            ...style,
            left: newBounds.x,
            top: newBounds.y,
            width: newBounds.width,
            height: newBounds.height,
          },
        });
      },
      [elements, updateElementProps]
    ),
    onLassoEnd: useCallback(
      (selectedIds: string[]) => {
        if (selectedIds.length > 0) {
          setSelectedElements(selectedIds);
        }
      },
      [setSelectedElements]
    ),
    findElementsInLasso: findElementsInLassoArea,
  });

  // 리사이즈 시작 핸들러
  const handleResizeStart = useCallback(
    (elementId: string, handle: HandlePosition, bounds: BoundingBox) => {
      // TODO: 실제 마우스 위치를 캔버스 좌표로 변환 필요
      startResize(elementId, handle, bounds, { x: 0, y: 0 });
    },
    [startResize]
  );

  // 이동 시작 핸들러
  const handleMoveStart = useCallback(
    (elementId: string, bounds: BoundingBox) => {
      // TODO: 실제 마우스 위치를 캔버스 좌표로 변환 필요
      startMove(elementId, bounds, { x: 0, y: 0 });
    },
    [startMove]
  );

  // 커서 변경 핸들러
  const handleCursorChange = useCallback((cursor: CursorStyle) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }
  }, []);

  // 텍스트 편집 (B1.5)
  const {
    editState,
    startEdit,
    updateText,
    completeEdit,
    cancelEdit,
    isEditing,
  } = useTextEdit();

  // Element click handler
  const handleElementClick = useCallback(
    (elementId: string) => {
      // 텍스트 편집 중이면 클릭 무시
      if (isEditing) return;
      setSelectedElement(elementId);
    },
    [setSelectedElement, isEditing]
  );

  // Element double click handler (텍스트 편집 시작)
  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      startEdit(elementId);
    },
    [startEdit]
  );

  // WebGL context recovery
  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };

    const handleContextRestored = () => {
      setContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [setContextLost]);

  // Sync render version after each frame
  useEffect(() => {
    syncPixiVersion(renderVersion);
  }, [renderVersion, syncPixiVersion]);

  // Mark canvas as ready
  useEffect(() => {
    setCanvasReady(true);
    return () => setCanvasReady(false);
  }, [setCanvasReady]);

  return (
    <div
      ref={setContainerNode}
      className="builder-canvas-container"
    >
      {containerEl && containerSize.width > 0 && containerSize.height > 0 && (
        <Application
          width={containerSize.width}
          height={containerSize.height}
          background={backgroundColor}
          antialias={true}
          resolution={window.devicePixelRatio}
          autoDensity={true}
        >
        {/* Canvas Resize Handler - renderer 직접 resize */}
        <CanvasResizeHandler width={containerSize.width} height={containerSize.height} />

        {/* 전체 Canvas 영역 클릭 → 선택 해제 (Camera 바깥, zoom/pan 영향 안 받음) */}
        <ClickableBackground
          width={containerSize.width}
          height={containerSize.height}
          onClick={clearSelection}
        />

        {/* Camera/Viewport */}
        <pixiContainer
          label="Camera"
          x={panOffset.x}
          y={panOffset.y}
          scale={zoom}
          eventMode="static"
          interactiveChildren={true}
        >
          {/* Grid Layer (최하단) */}
          <GridLayer
            width={pageWidth}
            height={pageHeight}
            zoom={zoom}
            showGrid={true}
          />

          {/* Body Layer (Body 요소의 배경색, 테두리 등) */}
          <BodyLayer
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            onClick={handleElementClick}
          />

          {/* Page Bounds (breakpoint 경계선) */}
          <CanvasBounds width={pageWidth} height={pageHeight} />

          {/* Elements Layer (ElementSprite 기반) */}
          <ElementsLayer
            selectedIds={selectedElementIds}
            layoutResult={layoutResult}
            onClick={handleElementClick}
            onDoubleClick={handleElementDoubleClick}
          />

          {/* Selection Layer (최상단) */}
          <SelectionLayer
            dragState={dragState}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            layoutResult={layoutResult}
            onResizeStart={handleResizeStart}
            onMoveStart={handleMoveStart}
            onCursorChange={handleCursorChange}
          />
        </pixiContainer>
        </Application>
      )}

      {/* 텍스트 편집 오버레이 (B1.5) */}
      {editState && editState.elementId && (
        <TextEditOverlay
          elementId={editState.elementId}
          initialValue={editState.value}
          position={editState.position}
          size={editState.size}
          zoom={zoom}
          panOffset={panOffset}
          style={editState.style}
          onChange={updateText}
          onComplete={completeEdit}
          onCancel={cancelEdit}
        />
      )}
    </div>
  );
}

// ============================================
// Feature Flag Wrapper
// ============================================

/**
 * Feature Flag에 따라 WebGL 또는 기존 iframe 캔버스 반환
 */
export function BuilderCanvasWithFlag(props: BuilderCanvasProps) {
  const useWebGL = useWebGLCanvas();

  if (!useWebGL) {
    // 기존 iframe Canvas (Fallback)
    return null; // BuilderCore에서 기존 iframe 렌더링
  }

  return <BuilderCanvas {...props} />;
}

export default BuilderCanvas;
