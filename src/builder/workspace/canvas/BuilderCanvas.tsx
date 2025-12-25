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

import { useCallback, useEffect, useRef, useMemo, useState, memo, startTransition } from "react";
import { Application, useApplication } from "@pixi/react";
import { Graphics as PixiGraphics } from "pixi.js";
import { useStore } from "../../stores";

// P4: useExtend 훅으로 메모이제이션된 컴포넌트 등록
// 🚀 Phase 5: 동적 해상도 및 저사양 기기 감지
import { useExtend, PIXI_COMPONENTS, isLowEndDevice, getDynamicResolution } from "./pixiSetup";
import { useCanvasSyncStore } from "./canvasSync";
import { isWebGLCanvas } from "../../../utils/featureFlags";
import { ElementSprite } from "./sprites";
import {
  SelectionLayer,
  useDragInteraction,
  findElementsInLasso,
  type HandlePosition,
  type BoundingBox,
  type CursorStyle,
  type SelectionBoxHandle,
} from "./selection";
import { GridLayer } from "./grid";
import { ViewportControlBridge } from "./viewport";
import { BodyLayer } from "./layers";
import { TextEditOverlay, useTextEdit } from "../overlay";
import { initYoga, calculateLayout, type LayoutResult } from "./layout";
import { getOutlineVariantColor } from "./utils/cssVariableReader";
import { useThemeColors } from "./hooks/useThemeColors";
import { useViewportCulling } from "./hooks/useViewportCulling";
import { longTaskMonitor } from "../../../utils/longTaskMonitor";
import type { Element } from "../../../types/core/store.types";

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
const DRAG_DISTANCE_THRESHOLD = 4;

// ============================================
// Sub-Components
// ============================================

// GridLayer는 ./grid/GridLayer.tsx로 이동됨 (B1.4)
// CanvasResizeHandler 삭제됨 - resizeTo 옵션으로 대체 (Phase 12 B3.2)

/**
 * P4: PixiJS 컴포넌트 등록 브릿지
 *
 * useExtend 훅을 사용하여 메모이제이션된 컴포넌트 등록을 수행합니다.
 * Application 내부 첫 번째 자식으로 배치해야 합니다.
 */
function PixiExtendBridge() {
  useExtend(PIXI_COMPONENTS);
  return null;
}

/**
 * 캔버스 경계 표시
 */
function CanvasBounds({ width, height, zoom = 1 }: { width: number; height: number; zoom?: number }) {
  useExtend(PIXI_COMPONENTS);
  // 테마 변경 감지 (MutationObserver 기반)
  useThemeColors();

  // 서브픽셀 렌더링 방지
  const w = Math.round(width);
  const h = Math.round(height);

  // 줌에 독립적인 선 두께 (화면상 항상 1px)
  const strokeWidth = 1 / zoom;

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const outlineColor = getOutlineVariantColor();
      // 줌에 관계없이 화면상 1px 유지
      g.setStrokeStyle({ width: strokeWidth, color: outlineColor });
      g.rect(0, 0, w, h);
      g.stroke();
    },
    [w, h, strokeWidth]
  );

  return <pixiGraphics draw={draw} />;
}

/**
 * 클릭 가능한 백그라운드 (빈 영역 클릭 감지용 + 라쏘 선택)
 * renderer.screen에서 크기를 자동으로 획득 (resizeTo 연동)
 */
interface ClickableBackgroundProps {
  onClick?: () => void;
  onLassoStart?: (position: { x: number; y: number }) => void;
  onLassoDrag?: (position: { x: number; y: number }) => void;
  onLassoEnd?: () => void;
  /** Zoom level for coordinate transformation */
  zoom: number;
  /** Pan offset for coordinate transformation */
  panOffset: { x: number; y: number };
}

function ClickableBackground({ onClick, onLassoStart, onLassoDrag, onLassoEnd, zoom, panOffset }: ClickableBackgroundProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();

  // 🚀 최적화: screenSize state 제거 - resize 리스너로 인한 리렌더링 방지
  // 대신 충분히 큰 고정 크기 사용 (10000x10000, 원점 -5000)

  // Shift 키 상태 추적 (Lasso 모드) - canvas cursor 직접 변경
  useEffect(() => {
    // app.canvas getter는 내부적으로 renderer.canvas를 참조하므로
    // renderer가 준비되기 전에 접근하면 에러 발생
    if (!app || !app.renderer) return;

    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = app.canvas as HTMLCanvasElement;
    } catch {
      // canvas가 아직 준비되지 않음
      return;
    }

    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        canvas.style.cursor = 'crosshair';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        canvas.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [app]);

  // 🚀 최적화: resize 리스너 useEffect 제거
  // renderer.on("resize", update)가 매 프레임 setScreenSize 호출하여 프레임 드랍 유발

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      // 🚀 최적화: 고정 크기 사용 (충분히 큰 영역으로 모든 뷰포트 커버)
      // 투명한 영역 (클릭 감지용)
      g.rect(-5000, -5000, 10000, 10000);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    []
  );

  // 라쏘 드래그 상태
  const isDragging = useRef(false);
  // Canvas에서 pointerDown이 시작되었는지 추적 (클릭 감지용)
  const isPointerDownOnCanvas = useRef(false);

  // 화면 좌표를 캔버스 좌표로 변환
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - panOffset.x) / zoom,
      y: (screenY - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const handlePointerDown = useCallback((e: { global: { x: number; y: number } }) => {
    isPointerDownOnCanvas.current = true;
    isDragging.current = true;
    const canvasPos = screenToCanvas(e.global.x, e.global.y);
    onLassoStart?.(canvasPos);
  }, [onLassoStart, screenToCanvas]);

  const handlePointerMove = useCallback((e: { global: { x: number; y: number } }) => {
    if (isDragging.current) {
      const canvasPos = screenToCanvas(e.global.x, e.global.y);
      onLassoDrag?.(canvasPos);
    }
  }, [onLassoDrag, screenToCanvas]);

  const handlePointerUp = useCallback(() => {
    // Canvas에서 pointerDown이 시작되지 않았으면 무시
    // (패널 등 외부에서 클릭 후 Canvas 위에서 놓는 경우 방지)
    if (!isPointerDownOnCanvas.current) {
      return;
    }

    isPointerDownOnCanvas.current = false;

    if (isDragging.current) {
      isDragging.current = false;
      onLassoEnd?.();
    } else {
      // 드래그 없이 클릭만 했으면 clearSelection
      onClick?.();
    }
  }, [onClick, onLassoEnd]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor="default"
      onPointerDown={handlePointerDown}
      onGlobalPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    />
  );
}

// SelectionOverlay는 SelectionLayer로 대체됨 (B1.3)
// CanvasSmoothResizeBridge 제거됨 - resizeTo={containerEl}로 대체 (Panel Toggle 성능 최적화)

/**
 * 요소 레이어 (ElementSprite 사용)
 *
 * 현재 페이지의 모든 요소를 ElementSprite로 렌더링합니다.
 * DOM 레이아웃 방식 (display: block, position: relative)을 재현합니다.
 *
 * 🚀 성능 최적화 (2025-12-17):
 * - selectedElementIds 구독 제거 → 선택 변경 시 ElementsLayer 리렌더 방지
 * - 각 ElementSprite가 자신의 선택 상태만 구독 → O(n) → O(2) 리렌더
 * - memo로 부모(BuilderCanvas) 리렌더링 시 불필요한 리렌더링 방지
 *
 * 🚀 Phase 11 (2025-12-20): Viewport Culling
 * - 뷰포트 외부 요소 렌더링 제외 → GPU 부하 20-40% 감소
 * - 대형 캔버스에서 줌아웃 시 특히 효과적
 */
const ElementsLayer = memo(function ElementsLayer({
  layoutResult,
  zoom,
  panOffset,
  onClick,
  onDoubleClick,
}: {
  layoutResult: LayoutResult;
  zoom: number;
  panOffset: { x: number; y: number };
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
}) {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);
  // 🚀 성능 최적화: selectedElementIds 구독 제거
  // 기존: ElementsLayer가 selectedElementIds 구독 → 선택 변경 시 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 상태만 구독 → 변경된 요소만 리렌더 O(2)
  // selectedElementIds, selectedIdSet 제거됨

  const elementById = useMemo(
    () => new Map(elements.map((el) => [el.id, el])),
    [elements]
  );

  // 깊이 맵을 한 번 계산하여 정렬 비용 감소
  const depthMap = useMemo(() => {
    const cache = new Map<string, number>();

    const computeDepth = (id: string | null): number => {
      if (!id) return 0;
      const cached = cache.get(id);
      if (cached !== undefined) return cached;

      const el = elementById.get(id);
      if (!el || el.tag.toLowerCase() === "body") {
        cache.set(id, 0);
        return 0;
      }

      const depth = 1 + computeDepth(el.parent_id as string | null);
      cache.set(id, depth);
      return depth;
    };

    elements.forEach((el) => {
      cache.set(el.id, computeDepth(el.id));
    });

    return cache;
  }, [elements, elementById]);

  // 현재 페이지의 요소만 필터링 (Body 제외, 실제 렌더링 대상만)
  // 선택 변경으로 인한 리렌더에서도 재계산/정렬 비용을 피하기 위해 memoize
  const pageElements = useMemo(() => {
    return elements.filter((el) => {
      if (el.page_id !== currentPageId) return false;
      // Body 태그는 캔버스 전체를 의미하므로 렌더링에서 제외 (대소문자 무시)
      if (el.tag.toLowerCase() === "body") return false;
      // CheckboxGroup의 자식 Checkbox는 투명 hit area로 렌더링 (필터하지 않음)
      return true;
    });
  }, [elements, currentPageId]);

  // 깊이 + order_num 기준으로 정렬 (부모 먼저 → 자식 나중에 렌더링)
  // DOM 방식: 자식이 부모 위에 표시됨
  const sortedElements = useMemo(() => {
    return [...pageElements].sort((a, b) => {
      const depthA = depthMap.get(a.id) ?? 0;
      const depthB = depthMap.get(b.id) ?? 0;

      // 깊이가 다르면 깊이 순서 (낮은 것 먼저 = 부모 먼저)
      if (depthA !== depthB) return depthA - depthB;

      // 같은 깊이면 order_num 순서
      return (a.order_num || 0) - (b.order_num || 0);
    });
  }, [pageElements, depthMap]);

  // 🚀 Phase 11: Viewport Culling - 뷰포트 외부 요소 필터링
  const { visibleElements } = useViewportCulling({
    elements: sortedElements,
    layoutResult,
    zoom,
    panOffset,
    enabled: true, // 필요시 비활성화 가능
  });

  return (
    <pixiContainer
      label="ElementsLayer"
      eventMode="static"
      interactiveChildren={true}
    >
      {/* 🚀 성능 최적화: isSelected prop 제거 - 각 ElementSprite가 자체 구독 */}
      {/* 🚀 Phase 11: visibleElements만 렌더링 (뷰포트 컬링) */}
      {visibleElements.map((element) => (
        <ElementSprite
          key={element.id}
          element={element}
          layoutPosition={layoutResult.positions.get(element.id)}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </pixiContainer>
  );
});

// ============================================
// Main Component
// ============================================

export function BuilderCanvas({
  pageWidth = DEFAULT_WIDTH,
  pageHeight = DEFAULT_HEIGHT,
  backgroundColor = DEFAULT_BACKGROUND,
}: BuilderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 🚀 Phase 19: SelectionBox imperative handle ref (드래그 중 React 리렌더링 없이 위치 업데이트)
  const selectionBoxRef = useRef<SelectionBoxHandle>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [yogaReady, setYogaReady] = useState(false);

  // 🚀 Phase 5 + 6.2: 저사양 기기 감지 (모듈 레벨 캐싱으로 useMemo 불필요)
  const isLowEnd = isLowEndDevice();

  // 🚀 Phase 5 + 6.1: 동적 해상도 (드래그/줌/팬 중에는 낮춤)
  // dragState가 active일 때 해상도 낮춤
  const [isInteracting, setIsInteracting] = useState(false);
  const resolution = useMemo(
    () => getDynamicResolution(isInteracting),
    [isInteracting]
  );

  // P7.8: Yoga 엔진 초기화
  useEffect(() => {
    initYoga().then(() => {
      setYogaReady(true);
    });
  }, []);

  // 컨테이너 ref 콜백: 마운트 시점에 DOM 노드를 안전하게 확보
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerEl(node);
  }, []);

  // Canvas는 컨테이너 크기에 맞춰 자동 동기화 (CSS → 종료 시 renderer.resize)

  // Store state
  const elements = useStore((state) => state.elements);
  // 🚀 selectedElementIds는 ElementsLayer 내부에서 직접 구독 (부모 리렌더링 방지)
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setSelectedElements = useStore((state) => state.setSelectedElements);
  const clearSelection = useStore((state) => state.clearSelection);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const batchUpdateElements = useStore((state) => state.batchUpdateElements);
  const currentPageId = useStore((state) => state.currentPageId);

  // Settings state (SettingsPanel 연동)
  const showGrid = useStore((state) => state.showGrid);
  const gridSize = useStore((state) => state.gridSize);

  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);

  // Canvas sync actions
  const setCanvasReady = useCanvasSyncStore((state) => state.setCanvasReady);
  const setContextLost = useCanvasSyncStore((state) => state.setContextLost);
  const syncPixiVersion = useCanvasSyncStore((state) => state.syncPixiVersion);
  const renderVersion = useCanvasSyncStore((state) => state.renderVersion);

  // 페이지 단위 레이아웃 계산 (재사용)
  // P7.8: yogaReady 후에만 실제 레이아웃 계산 수행
  const layoutResult = useMemo(() => {
    if (!currentPageId || !yogaReady) return { positions: new Map() };
    return calculateLayout(elements, currentPageId, pageWidth, pageHeight);
  }, [elements, currentPageId, pageWidth, pageHeight, yogaReady]);

  const elementById = useMemo(
    () => new Map(elements.map((el) => [el.id, el])),
    [elements]
  );

  const depthMap = useMemo(() => {
    const cache = new Map<string, number>();

    const computeDepth = (id: string | null): number => {
      if (!id) return 0;
      const cached = cache.get(id);
      if (cached !== undefined) return cached;

      const el = elementById.get(id);
      if (!el || el.tag.toLowerCase() === "body") {
        cache.set(id, 0);
        return 0;
      }

      const depth = 1 + computeDepth(el.parent_id as string | null);
      cache.set(id, depth);
      return depth;
    };

    elements.forEach((el) => {
      cache.set(el.id, computeDepth(el.id));
    });

    return cache;
  }, [elements, elementById]);

  // Zoom/Pan은 ViewportControlBridge에서 처리 (Application 내부에서 Container 직접 조작)

  // 현재 페이지 요소 필터링 (라쏘 선택용)
  const pageElements = useMemo(() => {
    return elements.filter(
      (el) => el.page_id === currentPageId && el.tag !== "Body"
    );
  }, [elements, currentPageId]);

  // 라쏘 선택 영역 내 요소 찾기
  // 🚀 Bug fix: layoutResult.positions 사용 (Yoga 레이아웃 적용된 실제 위치)
  const findElementsInLassoArea = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      return findElementsInLasso(
        pageElements.map((el) => {
          // layoutResult에서 실제 렌더링 위치 가져오기
          const layoutPos = layoutResult.positions.get(el.id);
          if (layoutPos) {
            return {
              id: el.id,
              props: {
                style: {
                  left: layoutPos.x,
                  top: layoutPos.y,
                  width: layoutPos.width,
                  height: layoutPos.height,
                },
              },
            };
          }
          // fallback: 원래 스타일 사용
          return {
            id: el.id,
            props: { style: el.props?.style as Record<string, unknown> },
          };
        }),
        start,
        end
      );
    },
    [pageElements, layoutResult]
  );

  const screenToCanvasPoint = useCallback(
    (position: { x: number; y: number }) => {
      return {
        x: (position.x - panOffset.x) / zoom,
        y: (position.y - panOffset.y) / zoom,
      };
    },
    [panOffset.x, panOffset.y, zoom]
  );

  const getElementBounds = useCallback(
    (element: Element): BoundingBox | null => {
      if (element.tag.toLowerCase() === "body") {
        return { x: 0, y: 0, width: pageWidth, height: pageHeight };
      }

      const layoutPos = layoutResult.positions.get(element.id);
      if (layoutPos) {
        return {
          x: layoutPos.x,
          y: layoutPos.y,
          width: layoutPos.width,
          height: layoutPos.height,
        };
      }

      const style = element.props?.style as Record<string, unknown> | undefined;
      const width = Number(style?.width);
      const height = Number(style?.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
      }

      return {
        x: Number(style?.left) || 0,
        y: Number(style?.top) || 0,
        width,
        height,
      };
    },
    [layoutResult.positions, pageWidth, pageHeight]
  );

  const getDescendantIds = useCallback((rootId: string) => {
    const childrenMap = useStore.getState().childrenMap;
    const result = new Set<string>();
    const stack = [rootId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId) continue;
      const children = childrenMap.get(currentId) ?? [];
      for (const child of children) {
        if (result.has(child.id)) continue;
        result.add(child.id);
        stack.push(child.id);
      }
    }

    return result;
  }, []);

  const findDropTarget = useCallback(
    (point: { x: number; y: number }, draggedId: string) => {
      const draggedElement = elementById.get(draggedId);
      if (!draggedElement) return null;

      const excludedIds = getDescendantIds(draggedId);
      excludedIds.add(draggedId);

      const candidates: Array<{
        element: Element;
        bounds: BoundingBox;
        depth: number;
      }> = [];

      for (const element of elements) {
        if (element.deleted) continue;
        if (element.page_id !== draggedElement.page_id) continue;
        if (element.layout_id !== draggedElement.layout_id) continue;
        if (excludedIds.has(element.id)) continue;

        const bounds = getElementBounds(element);
        if (!bounds) continue;

        const isInside =
          point.x >= bounds.x &&
          point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y &&
          point.y <= bounds.y + bounds.height;

        if (!isInside) continue;

        candidates.push({
          element,
          bounds,
          depth: depthMap.get(element.id) ?? 0,
        });
      }

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        if (a.depth !== b.depth) return b.depth - a.depth;
        return (b.element.order_num || 0) - (a.element.order_num || 0);
      });

      const target = candidates[0];
      const parent =
        target.element.parent_id != null
          ? elementById.get(target.element.parent_id)
          : null;
      const parentStyle = parent?.props?.style as Record<string, unknown> | undefined;
      const flexDirection = parentStyle?.flexDirection;
      const isHorizontal =
        flexDirection === "row" || flexDirection === "row-reverse";

      let dropPosition: "before" | "after" | "on" = "on";
      const size = isHorizontal ? target.bounds.width : target.bounds.height;

      if (size > 0 && target.element.parent_id) {
        const offset = isHorizontal
          ? point.x - target.bounds.x
          : point.y - target.bounds.y;
        const ratio = offset / size;
        if (ratio <= 0.25) dropPosition = "before";
        else if (ratio >= 0.75) dropPosition = "after";
      }

      if (target.element.tag.toLowerCase() === "body") {
        dropPosition = "on";
      }

      return {
        targetId: target.element.id,
        dropPosition,
      };
    },
    [elements, elementById, depthMap, getDescendantIds, getElementBounds]
  );

  const buildReorderUpdates = useCallback(
    (
      movedId: string,
      targetId: string,
      dropPosition: "before" | "after" | "on"
    ) => {
      const movedElement = elementById.get(movedId);
      const targetElement = elementById.get(targetId);
      if (!movedElement || !targetElement) return [];

      if (
        movedElement.page_id !== targetElement.page_id ||
        movedElement.layout_id !== targetElement.layout_id
      ) {
        return [];
      }

      const oldParentId = movedElement.parent_id ?? null;
      const newParentId =
        dropPosition === "on"
          ? targetElement.id
          : targetElement.parent_id ?? null;

      if (oldParentId === null && newParentId === null && dropPosition !== "on") {
        return [];
      }

      const getSiblings = (parentId: string | null, includeMoved = false) => {
        return elements
          .filter((el) => {
            if (el.deleted) return false;
            if (el.page_id !== movedElement.page_id) return false;
            if (el.layout_id !== movedElement.layout_id) return false;
            if ((el.parent_id ?? null) !== parentId) return false;
            if (!includeMoved && el.id === movedId) return false;
            return true;
          })
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      };

      const targetSiblings = getSiblings(newParentId);
      const siblingIds = targetSiblings.map((el) => el.id);
      let insertIndex = siblingIds.length;

      if (dropPosition !== "on") {
        const targetIndex = siblingIds.indexOf(targetElement.id);
        if (targetIndex >= 0) {
          insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
        }
      }

      const nextIds = siblingIds.slice();
      nextIds.splice(insertIndex, 0, movedId);

      if (oldParentId === newParentId) {
        const currentIds = getSiblings(oldParentId, true).map((el) => el.id);
        if (currentIds.length === nextIds.length) {
          const isSameOrder = currentIds.every(
            (id, index) => id === nextIds[index]
          );
          if (isSameOrder) return [];
        }
      }

      const updates = nextIds.map((id, index) => ({
        elementId: id,
        updates: {
          order_num: index,
          ...(id === movedId && { parent_id: newParentId }),
        },
      }));

      if (oldParentId !== newParentId) {
        const oldSiblings = getSiblings(oldParentId);
        oldSiblings.forEach((el, index) => {
          updates.push({
            elementId: el.id,
            updates: { order_num: index },
          });
        });
      }

      return updates;
    },
    [elements, elementById]
  );

  // 🚀 Phase 5: 드래그 시작/종료 시 해상도 조정
  const handleDragStart = useCallback(() => {
    setIsInteracting(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  // 드래그 인터랙션 - Lasso 선택 포함
  const {
    dragState,
    startMove,
    startResize,
    startLasso,
    updateDrag,
    endDrag,
  } = useDragInteraction({
    // 🚀 Phase 5: 드래그 시작 시 해상도 낮춤
    onDragStart: handleDragStart,
    onMoveEnd: useCallback(
      (elementId: string, delta: { x: number; y: number }) => {
        // 🚀 Phase 5: 드래그 종료 시 해상도 복원
        handleDragEnd();

        const element = elementById.get(elementId);
        if (!element) return;

        const dragDistance = Math.hypot(delta.x, delta.y);
        if (dragDistance < DRAG_DISTANCE_THRESHOLD) {
          selectionBoxRef.current?.resetPosition();
          dragPointerRef.current = null;
          return;
        }

        if (element.tag.toLowerCase() === "body") {
          selectionBoxRef.current?.resetPosition();
          dragPointerRef.current = null;
          return;
        }

        const style = element.props?.style as
          | Record<string, unknown>
          | undefined;
        const position = style?.position;
        const shouldReorder =
          position !== "absolute" && position !== "fixed";

        if (shouldReorder && dragPointerRef.current) {
          const drop = findDropTarget(dragPointerRef.current, elementId);
          if (drop) {
            const updates = buildReorderUpdates(
              elementId,
              drop.targetId,
              drop.dropPosition
            );
            if (updates.length > 0) {
              batchUpdateElements(updates);
            }
          }
          selectionBoxRef.current?.resetPosition();
          dragPointerRef.current = null;
          return;
        }

        const currentX = Number(style?.left) || 0;
        const currentY = Number(style?.top) || 0;

        updateElementProps(elementId, {
          style: {
            ...style,
            left: currentX + delta.x,
            top: currentY + delta.y,
          },
        });
        dragPointerRef.current = null;
      },
      [
        batchUpdateElements,
        buildReorderUpdates,
        elementById,
        findDropTarget,
        handleDragEnd,
        updateElementProps,
      ]
    ),
    onResizeEnd: useCallback(
      (elementId: string, _handle: HandlePosition, newBounds: BoundingBox) => {
        // 🚀 Phase 5: 드래그 종료 시 해상도 복원
        handleDragEnd();

        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        const style = element.props?.style as
          | Record<string, unknown>
          | undefined;

        updateElementProps(elementId, {
          style: {
            ...style,
            left: newBounds.x,
            top: newBounds.y,
            width: newBounds.width,
            height: newBounds.height,
          },
        });
        dragPointerRef.current = null;
      },
      [elements, updateElementProps, handleDragEnd]
    ),
    onLassoEnd: useCallback(
      (selectedIds: string[]) => {
        // 🚀 Phase 5: 드래그 종료 시 해상도 복원
        handleDragEnd();

        if (selectedIds.length > 0) {
          setSelectedElements(selectedIds);
        }
      },
      [setSelectedElements, handleDragEnd]
    ),
    findElementsInLasso: findElementsInLassoArea,
    // 🚀 Phase 19: 드래그 중 React 리렌더링 없이 PixiJS 직접 조작
    onDragUpdate: useCallback(
      (
        operation: 'move' | 'resize' | 'lasso',
        data: {
          delta?: { x: number; y: number };
          newBounds?: BoundingBox;
        }
      ) => {
        if (!selectionBoxRef.current) return;

        switch (operation) {
          case 'move':
            if (data.delta) {
              selectionBoxRef.current.updatePosition(data.delta);
            }
            break;
          case 'resize':
            if (data.newBounds) {
              selectionBoxRef.current.updateBounds(data.newBounds);
            }
            break;
          // lasso는 기존 방식 유지 (LassoSelection 컴포넌트 사용)
        }
      },
      []
    ),
  });

  // 리사이즈 시작 핸들러
  const handleResizeStart = useCallback(
    (
      elementId: string,
      handle: HandlePosition,
      bounds: BoundingBox,
      position: { x: number; y: number }
    ) => {
      const canvasPosition = screenToCanvasPoint(position);
      dragPointerRef.current = canvasPosition;
      startResize(elementId, handle, bounds, canvasPosition);
    },
    [screenToCanvasPoint, startResize]
  );

  // 이동 시작 핸들러
  const handleMoveStart = useCallback(
    (elementId: string, bounds: BoundingBox, position: { x: number; y: number }) => {
      const canvasPosition = screenToCanvasPoint(position);
      dragPointerRef.current = canvasPosition;
      startMove(elementId, bounds, canvasPosition);
    },
    [screenToCanvasPoint, startMove]
  );

  useEffect(() => {
    if (!containerEl) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.isDragging || dragState.operation === "lasso") return;
      const rect = containerEl.getBoundingClientRect();
      const screenPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const canvasPosition = screenToCanvasPoint(screenPosition);
      dragPointerRef.current = canvasPosition;
      updateDrag(canvasPosition);
    };

    const handlePointerUp = () => {
      if (!dragState.isDragging || dragState.operation === "lasso") return;
      endDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [containerEl, dragState.isDragging, dragState.operation, endDrag, screenToCanvasPoint, updateDrag]);

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

  // Element click handler with multi-select support
  // 🚀 최적화: selectedElementIds를 deps에서 제거하고 getState()로 읽어서
  // 선택 변경 시 handleElementClick 재생성 방지 → 모든 ElementSprite 리렌더링 방지
  // 🚀 Phase 18: startTransition으로 선택 업데이트 → INP 개선 (245ms → ~50ms)
  const handleElementClick = useCallback(
    (elementId: string, modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean }) => {
      return longTaskMonitor.measure("interaction.select:webgl-pointerdown", () => {
        // 텍스트 편집 중이면 클릭 무시
        if (isEditing) return;

        // Cmd+Click (Mac) or Ctrl+Click (Windows) for multi-select
        const isMultiSelectKey = modifiers?.metaKey || modifiers?.ctrlKey;

        // 🚀 Phase 18: startTransition으로 선택 업데이트를 비긴급 처리
        // React가 현재 프레임을 먼저 완료하고, 유휴 시간에 리렌더링 수행
        startTransition(() => {
          if (isMultiSelectKey) {
            // 🚀 getState()로 현재 selectedElementIds 읽기 (stale closure 방지)
            const currentSelectedIds = useStore.getState().selectedElementIds;

            // 🚀 O(n) → O(1) 최적화: Set을 사용하여 빠른 검색
            const selectedSet = new Set(currentSelectedIds);
            const isAlreadySelected = selectedSet.has(elementId);

            if (isAlreadySelected) {
              // 선택 해제 - Set에서 제거 후 배열로 변환
              selectedSet.delete(elementId);
              if (selectedSet.size > 0) {
                setSelectedElements(Array.from(selectedSet));
              } else {
                clearSelection();
              }
            } else {
              // 선택에 추가 - Set에 추가 후 배열로 변환
              selectedSet.add(elementId);
              setSelectedElements(Array.from(selectedSet));
            }
          } else {
            // 단일 선택
            setSelectedElement(elementId);
          }
        });
      });
    },
    [setSelectedElement, setSelectedElements, clearSelection, isEditing]
  );

  // Element double click handler (텍스트 편집 시작)
  // 🚀 Phase 19: layoutPosition 전달 - TextEditOverlay가 올바른 위치에 표시되도록
  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      const layoutPosition = layoutResult.positions.get(elementId);
      startEdit(elementId, layoutPosition);
    },
    [startEdit, layoutResult.positions]
  );

  // WebGL context recovery
  useEffect(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
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
    <div ref={setContainerNode} className="canvas-container">
      {/* Wait for both container and yoga to be ready before rendering PixiJS */}
      {containerEl && yogaReady && (
        <Application
          resizeTo={containerEl}
          background={backgroundColor}
          // 🚀 Phase 5: 저사양 기기에서 antialias 비활성화
          antialias={!isLowEnd}
          // 🚀 Phase 5: 동적 해상도 (인터랙션 중 낮춤)
          resolution={resolution}
          autoDensity={true}
          roundPixels={true}
          // 🚀 Phase 5: GPU 성능 최적화
          powerPreference="high-performance"
        >
          {/* P4: 메모이제이션된 컴포넌트 등록 (첫 번째 자식) */}
          <PixiExtendBridge />

          {/* ViewportControlBridge: Camera Container 직접 조작 (React re-render 최소화) */}
          {/* 🚀 Phase 6.1: 줌/팬 인터랙션 시 동적 해상도 조정 */}
          <ViewportControlBridge
            containerEl={containerEl}
            cameraLabel="Camera"
            minZoom={0.1}
            maxZoom={5}
            onInteractionStart={handleDragStart}
            onInteractionEnd={handleDragEnd}
          />

          {/* 전체 Canvas 영역 클릭 → 선택 해제 + 라쏘 선택 시작 */}
          <ClickableBackground
            onClick={clearSelection}
            onLassoStart={startLasso}
            onLassoDrag={updateDrag}
            onLassoEnd={endDrag}
            zoom={zoom}
            panOffset={panOffset}
          />

          {/* Grid Layer - Camera 밖, 화면 고정 (자체 containerSize 구독) */}
          {showGrid && (
            <GridLayer
              zoom={zoom}
              showGrid={showGrid}
              gridSize={gridSize}
            />
          )}

          {/* Camera/Viewport - x, y, scale은 ViewportController가 직접 조작 */}
          <pixiContainer
            label="Camera"
            eventMode="static"
            interactiveChildren={true}
          >
            {/* Body Layer (Body 요소의 배경색, 테두리 등) - 최하단 */}
            <BodyLayer
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              onClick={handleElementClick}
            />

            {/* Page Bounds (breakpoint 경계선) */}
            <CanvasBounds width={pageWidth} height={pageHeight} zoom={zoom} />

            {/* Elements Layer (ElementSprite 기반) */}
            <ElementsLayer
              layoutResult={layoutResult}
              zoom={zoom}
              panOffset={panOffset}
              onClick={handleElementClick}
              onDoubleClick={handleElementDoubleClick}
            />

            {/* Selection Layer (최상단) */}
            <SelectionLayer
              dragState={dragState}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              layoutResult={layoutResult}
              zoom={zoom}
              onResizeStart={handleResizeStart}
              onMoveStart={handleMoveStart}
              onCursorChange={handleCursorChange}
              selectionBoxRef={selectionBoxRef}
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
  const useWebGL = isWebGLCanvas();

  if (!useWebGL) {
    // 기존 iframe Canvas (Fallback)
    return null; // BuilderCore에서 기존 iframe 렌더링
  }

  return <BuilderCanvas {...props} />;
}

export default BuilderCanvas;
