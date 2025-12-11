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

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  Application,
  extend,
} from '@pixi/react';
import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
  Text as PixiText,
  TextStyle as PixiTextStyle,
} from 'pixi.js';
import { useStore } from '../../stores';
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
import { TextEditOverlay, useTextEdit } from '../overlay';

// Extend PixiJS with required components
extend({
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  TextStyle: PixiTextStyle,
});

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

// SelectionOverlay는 SelectionLayer로 대체됨 (B1.3)

/**
 * 요소 레이어 (ElementSprite 사용)
 *
 * 현재 페이지의 모든 요소를 ElementSprite로 렌더링합니다.
 */
function ElementsLayer({
  selectedIds,
  onClick,
  onDoubleClick,
}: {
  selectedIds: string[];
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
}) {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);

  // 현재 페이지의 요소만 필터링 (Body 제외, 실제 렌더링 대상만)
  const pageElements = elements.filter((el) => {
    if (el.page_id !== currentPageId) return false;
    // Body 태그는 캔버스 전체를 의미하므로 렌더링에서 제외 (대소문자 무시)
    if (el.tag.toLowerCase() === 'body') return false;
    return true;
  });

  // order_num 기준으로 정렬 (낮은 순서가 먼저 렌더링)
  const sortedElements = [...pageElements].sort(
    (a, b) => (a.order_num || 0) - (b.order_num || 0)
  );

  return (
    <pixiContainer eventMode="static" interactiveChildren={true}>
      {sortedElements.map((element) => (
        <ElementSprite
          key={element.id}
          element={element}
          isSelected={selectedIds.includes(element.id)}
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
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // 컨테이너 크기 추적 (Canvas는 항상 100%)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setCanvasSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Store state
  const elements = useStore((state) => state.elements);
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setSelectedElements = useStore((state) => state.setSelectedElements);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const currentPageId = useStore((state) => state.currentPageId);
  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);

  // Canvas sync actions
  const setCanvasReady = useCanvasSyncStore((state) => state.setCanvasReady);
  const setContextLost = useCanvasSyncStore((state) => state.setContextLost);
  const syncPixiVersion = useCanvasSyncStore((state) => state.syncPixiVersion);
  const renderVersion = useCanvasSyncStore((state) => state.renderVersion);

  // Zoom/Pan 인터랙션 - 현재 미사용, 추후 구현 예정
  useZoomPan({
    containerRef,
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
      ref={containerRef}
      className="builder-canvas-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
      }}
    >
      <Application
        width={canvasSize.width}
        height={canvasSize.height}
        background={backgroundColor}
        antialias={true}
        resolution={window.devicePixelRatio}
        autoDensity={true}
      >
        {/* Camera/Viewport */}
        <pixiContainer
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

          {/* Page Bounds (breakpoint 크기) */}
          <CanvasBounds width={pageWidth} height={pageHeight} />

          {/* Elements Layer (ElementSprite 기반) */}
          <ElementsLayer
            selectedIds={selectedElementIds}
            onClick={handleElementClick}
            onDoubleClick={handleElementDoubleClick}
          />

          {/* Selection Layer (최상단) */}
          <SelectionLayer
            dragState={dragState}
            onResizeStart={handleResizeStart}
            onMoveStart={handleMoveStart}
            onCursorChange={handleCursorChange}
          />
        </pixiContainer>
      </Application>

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
