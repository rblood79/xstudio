/**
 * Builder Canvas
 *
 * Phase 11: DirectContainer 기반 캔버스
 *
 * 기능:
 * - PixiJS Application 초기화
 * - Element 렌더링 (ElementSprite)
 * - Selection Overlay
 * - Zoom/Pan
 *
 * @since 2025-12-11 Phase 10 B1.1
 * @updated 2026-02-18 Phase 11 - @pixi/layout 완전 제거, DirectContainer 전환
 */
import { useCallback, useEffect, useRef, useMemo, useState, memo, startTransition, lazy, Suspense, type RefObject } from "react";
import { Application, useApplication } from "@pixi/react";
import { Graphics as PixiGraphics, Container, Application as PixiApplication, FederatedPointerEvent } from "pixi.js";
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
  type DragState,
} from "./selection";
// GridLayer는 Skia gridRenderer로 대체됨
import { ViewportControlBridge } from "./viewport";
import { BodyLayer } from "./layers";
import { TextEditOverlay, useTextEdit } from "../overlay";
// 사용자 컨텐츠 레이아웃은 Taffy/Dropflow 엔진이 처리
import {
  calculateChildrenLayout,
  parsePadding,
  parseBorder,
  type ComputedLayout,
} from "./layout";
import { getElementBoundsSimple, getElementContainer, registerElement, unregisterElement, updateElementBounds } from "./elementRegistry";
import { notifyLayoutChange } from "./skia/useSkiaNode";
import { LayoutComputedSizeContext } from "./layoutContext";
import { getOutlineVariantColor } from "./utils/cssVariableReader";
import { GPUDebugOverlay } from "./utils/GPUDebugOverlay";
import { useThemeColors } from "./hooks/useThemeColors";
import { useViewportCulling } from "./hooks/useViewportCulling";
import { usePageDrag } from "./hooks/usePageDrag";
import { longTaskMonitor } from "../../../utils/longTaskMonitor";
import type { Element } from "../../../types/core/store.types";
import { getPageElements } from "../../stores/utils/elementIndexer";
import { resolveClickTarget } from "../../utils/hierarchicalSelection";
import { isRustWasmReady } from "./wasm-bindings/rustWasm";

import { useGPUProfiler } from "./utils/gpuProfilerCore";

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
  /** 초기 Pan Offset X (비교 모드 등에서 사용) */
  initialPanOffsetX?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_BACKGROUND = 0xf8fafc; // slate-50
const DRAG_DISTANCE_THRESHOLD = 4;
const PAGE_STACK_GAP = 80;
const PAGE_TITLE_HIT_HEIGHT = 24;

// ============================================
// Sub-Components
// ============================================

// GridLayer는 ./grid/GridLayer.tsx로 이동됨 (B1.4)
// CanvasResizeHandler 삭제됨 - resizeTo 옵션으로 대체 (Phase 12 B3.2)

/**
 * Phase 5: CanvasKit 오버레이 (Lazy Import)
 */
const skiaOverlayImport = () =>
  import('./skia/SkiaOverlay').then((mod) => ({ default: mod.SkiaOverlay }));
const SkiaOverlayComponent = lazy(skiaOverlayImport);
skiaOverlayImport(); // 모듈 프리로드: lazy 해제 없이 초기 번들 크기 유지하면서 청크 로딩 선행

function SkiaOverlayLazy(props: {
  containerEl: HTMLDivElement;
  backgroundColor?: number;
  app: PixiApplication;
  dragStateRef?: RefObject<DragState | null>;
  pageWidth?: number;
  pageHeight?: number;
  pageFrames?: Array<{ id: string; title: string; x: number; y: number; width: number; height: number; elementCount: number }>;
  currentPageId?: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <SkiaOverlayComponent {...props} />
    </Suspense>
  );
}

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
 * 🚀 Multi-page: 메모이제이션된 페이지 컨테이너
 * 부모(BuilderCanvas)가 리렌더되어도 props가 같으면 스킵.
 */
interface PageContainerProps {
  pageId: string;
  posX: number;
  posY: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };
  isVisible: boolean;
  /** PixiJS Application 준비 완료 */
  appReady: boolean;
  /** Rust WASM(Taffy/Grid) 엔진 로드 완료 여부 */
  wasmLayoutReady: boolean;
  bodyElement: Element | null;
  pageElements: Element[];
  elementById: Map<string, Element>;
  depthMap: Map<string, number>;
  onClick: (elementId: string, modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean }) => void;
  onDoubleClick: (elementId: string) => void;
  onTitleDragStart: (pageId: string, clientX: number, clientY: number) => void;
}

const titleHitDraw = (pageWidth: number) => (g: PixiGraphics) => {
  g.clear();
  g.rect(0, -PAGE_TITLE_HIT_HEIGHT, pageWidth, PAGE_TITLE_HIT_HEIGHT);
  g.fill({ color: 0xffffff, alpha: 0.001 });
};

const PageContainer = memo(function PageContainer({
  pageId,
  posX,
  posY,
  pageWidth,
  pageHeight,
  zoom,
  panOffset,
  isVisible,
  appReady,
  wasmLayoutReady,
  bodyElement,
  pageElements,
  elementById,
  depthMap,
  onClick,
  onDoubleClick,
  onTitleDragStart,
}: PageContainerProps) {
  const draw = useMemo(() => titleHitDraw(pageWidth), [pageWidth]);

  const handleTitlePointerDown = useCallback((e: FederatedPointerEvent) => {
    e.stopPropagation();
    onTitleDragStart(pageId, e.clientX, e.clientY);
  }, [pageId, onTitleDragStart]);

  return (
    <pixiContainer
      label={`Page-${pageId}`}
      x={posX}
      y={posY}
      eventMode="static"
      interactiveChildren={true}
    >
      <pixiGraphics
        draw={draw}
        eventMode="static"
        cursor="grab"
        onPointerDown={handleTitlePointerDown}
      />
      <BodyLayer
        pageId={pageId}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        onClick={onClick}
      />
      <CanvasBounds width={pageWidth} height={pageHeight} zoom={zoom} />
      {isVisible && appReady && bodyElement && (
        <ElementsLayer
          pageElements={pageElements}
          bodyElement={bodyElement}
          elementById={elementById}
          depthMap={depthMap}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          zoom={zoom}
          panOffset={panOffset}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          wasmLayoutReady={wasmLayoutReady}
        />
      )}
    </pixiContainer>
  );
});

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

    // Shift 키 상태에 따른 커서 변경 (keyup도 필요하므로 useKeyboardShortcutsRegistry 부적합)
    // eslint-disable-next-line local/prefer-keyboard-shortcuts-registry
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
 * Phase 11: Direct Container
 *
 * 엔진이 계산한 x/y/width/height로 직접 배치하는 Container 래퍼.
 * ElementRegistry 등록과 LayoutComputedSizeContext 설정을 함께 처리합니다.
 */
const DirectContainer = memo(function DirectContainer({
  elementId,
  x,
  y,
  width,
  height,
  children,
}: {
  elementId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  useExtend(PIXI_COMPONENTS);

  const containerRef = useRef<Container | null>(null);
  const handleContainerRef = useCallback((container: Container | null) => {
    containerRef.current = container;
    if (container && elementId) {
      registerElement(elementId, container);
    }
  }, [elementId]);

  // Props 변경 시 elementBounds 업데이트 + Skia 재렌더링 트리거
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

  // 최초 마운트 후 bounds 업데이트 (rAF로 PixiJS 렌더 후 실행)
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

  // Cleanup: unmount 시 registry에서 해제
  useEffect(() => {
    if (!elementId) return;
    return () => {
      unregisterElement(elementId);
    };
  }, [elementId]);

  // LayoutComputedSizeContext (엔진 결과에서 직접 설정)
  const computedSize = useMemo(() =>
    width > 0 && height > 0 ? { width, height } : null,
    [width, height]
  );

  return (
    <LayoutComputedSizeContext.Provider value={computedSize}>
      <pixiContainer ref={handleContainerRef} x={x} y={y} label={elementId ?? 'direct-wrapper'}>
        {children}
      </pixiContainer>
    </LayoutComputedSizeContext.Provider>
  );
});

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
  pageElements,
  bodyElement,
  elementById,
  depthMap,
  pageWidth,
  pageHeight,
  zoom,
  panOffset,
  onClick,
  onDoubleClick,
  pagePositionVersion = 0,
  wasmLayoutReady = false,
}: {
  pageElements: Element[];
  bodyElement: Element | null;
  elementById: Map<string, Element>;
  depthMap: Map<string, number>;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
  pagePositionVersion?: number;
  /** Rust WASM(Taffy/Grid) 엔진 로드 완료 여부 - 로드 시 레이아웃 재계산 트리거 */
  wasmLayoutReady?: boolean;
}) {
  // 🚀 성능 최적화: selectedElementIds 구독 제거
  // 기존: ElementsLayer가 selectedElementIds 구독 → 선택 변경 시 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 상태만 구독 → 변경된 요소만 리렌더 O(2)
  // selectedElementIds, selectedIdSet 제거됨

  const pageChildrenMap = useMemo(() => {
    const map = new Map<string | null, Element[]>();
    const bodyId = bodyElement?.id ?? null;

    // display:contents 요소의 자식을 실제 레이아웃 부모에 직접 포함 (플래튼)
    const isContentsElement = (el: Element): boolean => {
      const style = el.props?.style as Record<string, unknown> | undefined;
      return style?.display === 'contents';
    };

    // contents 체인을 따라 올라가서 실제 레이아웃 부모 찾기
    const getLayoutParentId = (parentId: string | null): string | null => {
      let currentId = parentId;
      while (currentId) {
        const parentEl = elementById.get(currentId);
        if (!parentEl || !isContentsElement(parentEl)) break;
        currentId = parentEl.parent_id ?? bodyId;
      }
      return currentId;
    };

    for (const el of pageElements) {
      // contents 요소 자체는 레이아웃 트리에서 제외
      if (isContentsElement(el)) continue;

      const rawParentId = el.parent_id ?? bodyId;
      const key = getLayoutParentId(rawParentId);
      const list = map.get(key);
      if (list) {
        list.push(el);
      } else {
        map.set(key, [el]);
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }

    return map;
  }, [pageElements, bodyElement?.id, elementById]);

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

  // Viewport Culling - 뷰포트 외부 요소 필터링
  const { visibleElements } = useViewportCulling({
    elements: sortedElements,
    zoom,
    panOffset,
    enabled: true, // 필요시 비활성화 가능
    version: pagePositionVersion,
  });

  const renderIdSet = useMemo(() => {
    const ids = new Set<string>();

    for (const el of visibleElements) {
      let current: Element | undefined = el;
      while (current) {
        if (ids.has(current.id)) break;
        ids.add(current.id);
        if (!current.parent_id) break;
        current = elementById.get(current.parent_id);
      }
    }

    return ids;
  }, [visibleElements, elementById]);

  // 🚀 Phase 10: Container 타입 컴포넌트 - children을 내부에서 렌더링
  // Card, Panel 등은 children을 배경 안에 포함해야 함
  const CONTAINER_TAGS = useMemo(() => new Set([
    'Card', 'Box', 'Panel', 'Form', 'Group', 'Dialog', 'Modal',
    'Disclosure', 'DisclosureGroup', 'Accordion',
    'ToggleButtonGroup',  // 🚀 Phase 7: flex container로 자식 ToggleButton 내부 렌더링
    'TagGroup', 'TagList',  // 🚀 웹 CSS 구조 동일: TagGroup (column) → Label + TagList (row wrap) → Tags
    'CheckboxGroup', 'RadioGroup',  // 🚀 Form 그룹 컨테이너: 자식 Checkbox/Radio를 내부에서 렌더링
    'Popover', 'Tooltip', 'Menu',  // Overlay/Navigation 복합 컴포넌트 — 자식 노드를 내부에서 렌더링
    'DatePicker', 'DateRangePicker', 'Calendar', 'ColorPicker',  // Date & Color 복합 컴포넌트
    'Toast', 'Toolbar',  // Form/Feedback/Action 복합 컴포넌트 — 자식 노드를 내부에서 렌더링
    'NumberField', 'SearchField', 'DateField', 'TimeField', 'ColorField',  // Input 복합 컴포넌트
    'Tabs',  // Tab bar(spec shapes) + active Panel(container) 렌더링
  ]), []);

  // Phase 11: 엔진이 계산한 레이아웃으로 직접 배치 (Yoga 제거)
  const renderedTree = useMemo(() => {
    // Container 태그 판별 (children을 내부에서 렌더링하는 컴포넌트)
    function isContainerTagForLayout(tag: string, style?: Record<string, unknown>): boolean {
      if (tag === 'Section') {
        return style?.display === 'flex' || style?.flexDirection !== undefined;
      }
      return CONTAINER_TAGS.has(tag);
    }

    // Container 자식 렌더러 생성 (재귀적)
    // 컨테이너 내부의 자식들을 엔진으로 레이아웃 계산 후 DirectContainer로 배치
    function createContainerChildRenderer(
      containerEl: Element,
      containerWidth: number,
      containerHeight: number,
    ): (childEl: Element) => React.ReactNode {
      let cachedLayoutMap: Map<string, ComputedLayout> | null = null;
      let cachedPadding = { top: 0, right: 0, bottom: 0, left: 0 };
      const containerChildren = pageChildrenMap.get(containerEl.id) ?? [];

      return (childEl: Element): React.ReactNode => {
        // Lazy initialization: 첫 자식 렌더 시 모든 자식의 레이아웃 일괄 계산
        if (!cachedLayoutMap) {
          let parentStyle = containerEl.props?.style as Record<string, unknown> | undefined;
          let effectiveContainerEl = containerEl;

          // TagGroup/CheckboxGroup/RadioGroup: implicit flex layout 주입
          // CSS에서 이 컴포넌트들은 display:flex, flex-direction:column이 기본값
          const containerTag = (containerEl.tag ?? '').toLowerCase();

          // TagGroup: implicit flex column (CSS 기본값 매칭)
          // React-Aria TagGroup = flex column, Label + TagList 세로 배치
          if (containerTag === 'taggroup') {
            parentStyle = {
              ...(parentStyle || {}),
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            };
            effectiveContainerEl = {
              ...containerEl,
              props: { ...containerEl.props, style: parentStyle },
            };
          }

          // CheckboxGroup/RadioGroup: implicit flex layout + label 오프셋 주입
          // Spec의 container shape가 y = fontSize + 8에 위치하므로
          // 자식들도 동일한 오프셋을 적용하여 label 아래에 배치
          if (containerTag === 'checkboxgroup' || containerTag === 'radiogroup') {
            const containerProps = containerEl.props as Record<string, unknown> | undefined;
            const sizeName = (containerProps?.size as string) ?? 'md';
            const gap = sizeName === 'sm' ? 8 : sizeName === 'lg' ? 16 : 12;
            // typography 토큰 매칭: text-sm=14, text-md=16, text-lg=18
            const labelFontSize = sizeName === 'sm' ? 14 : sizeName === 'lg' ? 18 : 16;
            const labelOffset = containerProps?.label ? labelFontSize + 8 : 0;
            const orientation = containerProps?.orientation as string | undefined;

            parentStyle = {
              ...(parentStyle || {}),
              display: 'flex',
              flexDirection: orientation === 'horizontal' ? 'row' : 'column',
              gap,
              paddingTop: labelOffset,
            };
            effectiveContainerEl = {
              ...containerEl,
              props: { ...containerEl.props, style: parentStyle },
            };
          }

          // Tabs: 탭 바 아래에 활성 Panel만 배치 (Tab 요소는 spec shapes가 렌더링)
          // CSS 기준: Tabs(flex col) → TabList(height) + TabPanel(pad=16px → Panel)
          let filteredContainerChildren = containerChildren;
          if (containerTag === 'tabs') {
            const tabsProps = containerEl.props as Record<string, unknown> | undefined;
            const sizeName = (tabsProps?.size as string) ?? 'md';
            // CSS 기준 탭 바 높이: sm=25, md=30, lg=35
            const tabBarHeight = sizeName === 'sm' ? 25 : sizeName === 'lg' ? 35 : 30;
            const tabPanelPadding = 16; // React-Aria TabPanel 기본 padding

            // 활성 Panel만 필터 (Tab 요소는 spec shapes가 렌더링)
            const panelChildren = containerChildren.filter(c => c.tag === 'Panel');
            const activePanel = panelChildren[0]; // 기본: 첫 번째 Panel
            filteredContainerChildren = activePanel ? [activePanel] : [];

            parentStyle = {
              ...(parentStyle || {}),
              display: 'flex',
              flexDirection: 'column',
              paddingTop: tabBarHeight + tabPanelPadding,
              paddingLeft: tabPanelPadding,
              paddingRight: tabPanelPadding,
              paddingBottom: tabPanelPadding,
            };
            effectiveContainerEl = {
              ...containerEl,
              props: { ...containerEl.props, style: parentStyle },
            };
          }

          cachedPadding = parsePadding(parentStyle, containerWidth);
          const parentDisplay = (parentStyle?.display as string | undefined)
            ?? (containerEl.tag === 'Section' ? 'block' : undefined);
          const avW = Math.max(0, containerWidth - cachedPadding.left - cachedPadding.right);
          // M2: 부모가 height:auto이면 sentinel(-1) 전달하여 자식 % height가 auto로 처리되도록 함
          const parentHasAutoHeight = !parentStyle?.height || parentStyle.height === 'auto';
          const avH = parentHasAutoHeight
            ? -1  // sentinel: height:auto → 엔진이 콘텐츠 기반 계산
            : Math.max(0, containerHeight - cachedPadding.top - cachedPadding.bottom);
          // RC-7: calculateChildrenLayout 사용하여 blockification 적용
          const innerLayouts = calculateChildrenLayout(
            effectiveContainerEl, filteredContainerChildren, avW, avH,
            { bfcId: containerEl.id, parentDisplay, getChildElements: (id: string) => pageChildrenMap.get(id) ?? [] }
          );
          cachedLayoutMap = new Map(innerLayouts.map(l => [l.elementId, l]));
        }

        const layout = cachedLayoutMap.get(childEl.id);
        if (!layout) return null;

        const childStyle = childEl.props?.style as Record<string, unknown> | undefined;
        const isContainerType = isContainerTagForLayout(childEl.tag, childStyle);
        const childElements = isContainerType ? (pageChildrenMap.get(childEl.id) ?? []) : [];

        return (
          <DirectContainer
            key={childEl.id}
            elementId={childEl.id}
            x={layout.x + cachedPadding.left}
            y={layout.y + cachedPadding.top}
            width={layout.width}
            height={layout.height}
          >
            <ElementSprite
              element={childEl}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              childElements={isContainerType ? childElements : undefined}
              renderChildElement={isContainerType && childElements.length > 0
                ? createContainerChildRenderer(childEl, layout.width, layout.height)
                : undefined}
            />
            {!isContainerType && renderTree(childEl.id, { width: layout.width, height: layout.height })}
          </DirectContainer>
        );
      };
    }

    // 커스텀 엔진으로 렌더링 (display: block/grid/flex/inline 모두 처리)
    function renderWithCustomEngine(
      parentElement: Element,
      children: Element[],
      renderTreeFn: (parentId: string | null, parentComputedSize?: { width: number; height: number }) => React.ReactNode,
      parentComputedSize?: { width: number; height: number }
    ): React.ReactNode {
      const parentStyle = parentElement.props?.style as Record<string, unknown> | undefined;
      const rawParentDisplay = parentStyle?.display as string | undefined;
      const parentDisplay = rawParentDisplay ?? (parentElement.tag === 'Section' ? 'block' : undefined);
      // Body 이중 패딩 방지
      const isBodyParent = parentElement === bodyElement;
      const parentContentWidth = parentComputedSize?.width ?? pageWidth;
      const parentPadding = parsePadding(parentStyle, parentContentWidth);
      const parentBorderVal = isBodyParent ? parseBorder(parentStyle) : { top: 0, right: 0, bottom: 0, left: 0 };
      // RC-2: height:auto 부모는 definite height를 전달하지 않음
      // → 레이아웃 엔진이 max-content 기반으로 자식 높이를 계산
      const parentHasAutoHeight = !parentStyle?.height || parentStyle.height === 'auto';
      const parentContentHeight = parentComputedSize?.height
        ?? (parentHasAutoHeight ? undefined : pageHeight);
      const availableWidth = isBodyParent
        ? pageWidth - parentBorderVal.left - parentBorderVal.right - parentPadding.left - parentPadding.right
        : parentContentWidth - parentPadding.left - parentPadding.right;
      const availableHeight = isBodyParent
        ? pageHeight - parentBorderVal.top - parentBorderVal.bottom - parentPadding.top - parentPadding.bottom
        : parentContentHeight !== undefined
          ? parentContentHeight - parentPadding.top - parentPadding.bottom
          : -1;  // RC-1 sentinel: height:auto → WASM이 MaxContent로 처리

      // Body 자식 위치: root container가 이미 offset 적용 → 0
      const paddingOffsetX = isBodyParent ? 0 : parentPadding.left;
      const paddingOffsetY = isBodyParent ? 0 : parentPadding.top;

      // RC-7: calculateChildrenLayout 사용하여 blockification + overflow scroll 처리
      const layouts = calculateChildrenLayout(
        parentElement, children, availableWidth, availableHeight,
        { bfcId: parentElement.id, parentDisplay, getChildElements: (id: string) => pageChildrenMap.get(id) ?? [] }
      );

      if (import.meta.env.DEV && layouts.length === 0 && children.length > 0) {
        console.warn('[renderWithCustomEngine] Empty layout result!',
          { parentTag: parentElement.tag, parentDisplay, childCount: children.length });
      }

      const layoutMap = new Map<string, ComputedLayout>(
        layouts.map((l) => [l.elementId, l])
      );

      // 엔진 결과의 x/y로 직접 배치 (Yoga 불필요)
      return (
        <pixiContainer key={`engine-wrapper-${parentElement.id}`} x={paddingOffsetX} y={paddingOffsetY}>
          {children.map((child) => {
            if (!renderIdSet.has(child.id)) return null;
            const layout = layoutMap.get(child.id);
            if (!layout) return null;

            const childStyle = child.props?.style as Record<string, unknown> | undefined;
            const isContainerType = isContainerTagForLayout(child.tag, childStyle);
            const childElements = isContainerType ? (pageChildrenMap.get(child.id) ?? []) : [];

            return (
              <DirectContainer
                key={child.id}
                elementId={child.id}
                x={layout.x}
                y={layout.y}
                width={layout.width}
                height={layout.height}
              >
                <ElementSprite
                  element={child}
                  onClick={onClick}
                  onDoubleClick={onDoubleClick}
                  childElements={isContainerType ? childElements : undefined}
                  renderChildElement={isContainerType && childElements.length > 0
                    ? createContainerChildRenderer(child, layout.width, layout.height)
                    : undefined}
                />
                {!isContainerType && renderTreeFn(child.id, { width: layout.width, height: layout.height })}
              </DirectContainer>
            );
          })}
        </pixiContainer>
      );
    }

    // 재귀 렌더 트리
    function renderTree(parentId: string | null, parentComputedSize?: { width: number; height: number }): React.ReactNode {
      const children = pageChildrenMap.get(parentId) ?? [];
      if (children.length === 0) return null;

      const parentElement = parentId ? elementById.get(parentId) : bodyElement;
      if (!parentElement) return null;

      return renderWithCustomEngine(parentElement, children, renderTree, parentComputedSize);
    }

    return renderTree(bodyElement?.id ?? null);
    // wasmLayoutReady: WASM 로드 완료 시 calculateChildrenLayout()이 Taffy를 사용하므로 재계산 필요
  }, [pageChildrenMap, renderIdSet, onClick, onDoubleClick, bodyElement, elementById, pageWidth, pageHeight, CONTAINER_TAGS, wasmLayoutReady]);

  // body의 border+padding 오프셋 계산 (자식 시작 위치)
  const bodyStyle = bodyElement?.props?.style as Record<string, unknown> | undefined;
  const bodyBorder = useMemo(() => parseBorder(bodyStyle), [bodyStyle]);
  const bodyPadding = useMemo(() => parsePadding(bodyStyle, pageWidth), [bodyStyle, pageWidth]);

  // 자식 시작 위치 오프셋 (border + padding 안쪽)
  const contentOffsetX = bodyBorder.left + bodyPadding.left;
  const contentOffsetY = bodyBorder.top + bodyPadding.top;

  return (
    <pixiContainer
      label="ElementsLayer"
      x={contentOffsetX}
      y={contentOffsetY}
      eventMode="static"
      interactiveChildren={true}
    >
      {renderedTree}
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
  initialPanOffsetX,
}: BuilderCanvasProps) {
  // Dev-only: rAF 기반 FPS/프레임타임 측정(렌더 idle 여부와는 별개)
  useGPUProfiler(import.meta.env.DEV);

  const containerRef = useRef<HTMLDivElement>(null);
  // 🚀 Phase 19: SelectionBox imperative handle ref (드래그 중 React 리렌더링 없이 위치 업데이트)
  const selectionBoxRef = useRef<SelectionBoxHandle>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  // PixiJS Application 초기화 완료 상태
  const [appReady, setAppReady] = useState(false);
  // 🚀 Phase 9: Rust WASM 로드 완료 상태 (Taffy/Grid 엔진 활성화 시점에 레이아웃 재계산 트리거)
  const [wasmLayoutReady, setWasmLayoutReady] = useState(() => isRustWasmReady());
  // Phase 5: PixiJS app 인스턴스 (SkiaOverlay에 전달)
  const [pixiApp, setPixiApp] = useState<PixiApplication | null>(null);

  // 🚀 Phase 5 + 6.2: 저사양 기기 감지 (모듈 레벨 캐싱으로 useMemo 불필요)
  const isLowEnd = isLowEndDevice();

  const containerSize = useCanvasSyncStore((state) => state.containerSize);

  // 🚀 Phase 5 + 6.1: 동적 해상도 (드래그/줌/팬 중에는 낮춤)
  // dragState가 active일 때 해상도 낮춤
  const [isInteracting, setIsInteracting] = useState(false);
  const resolution = useMemo(
    () => getDynamicResolution(isInteracting, containerSize),
    [isInteracting, containerSize]
  );

  // Application onInit 콜백에서 appReady 설정 (아래 onInit prop 참고)

  // WASM 로드 완료 시 레이아웃 재계산 트리거
  // Rust WASM(Taffy)이 비동기로 로드되므로, 로드 완료 시점에 renderedTree 재계산 필요
  useEffect(() => {
    if (wasmLayoutReady) return;
    const id = setInterval(() => {
      if (isRustWasmReady()) {
        setWasmLayoutReady(true);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [wasmLayoutReady]);

  // 컨테이너 ref 콜백: 마운트 시점에 DOM 노드를 안전하게 확보
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerEl(node);
  }, []);

  // Canvas는 컨테이너 크기에 맞춰 자동 동기화 (CSS → 종료 시 renderer.resize)

  // Store state
  const elements = useStore((state) => state.elements);
  const pages = useStore((state) => state.pages);
  // 🚀 selectedElementIds는 ElementsLayer 내부에서 직접 구독 (부모 리렌더링 방지)
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setSelectedElements = useStore((state) => state.setSelectedElements);
  const clearSelection = useStore((state) => state.clearSelection);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const batchUpdateElements = useStore((state) => state.batchUpdateElements);
  const currentPageId = useStore((state) => state.currentPageId);
  const setCurrentPageId = useStore((state) => state.setCurrentPageId);

  // Settings state (SettingsPanel 연동)
  const showGrid = useStore((state) => state.showGrid);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);

  const zoom = useCanvasSyncStore((state) => state.zoom);
  const panOffset = useCanvasSyncStore((state) => state.panOffset);

  // 🆕 Multi-page: 페이지 타이틀 드래그
  const { startDrag: startPageDrag } = usePageDrag(zoom);

  // Canvas sync actions
  const setCanvasReady = useCanvasSyncStore((state) => state.setCanvasReady);
  const setContextLost = useCanvasSyncStore((state) => state.setContextLost);
  const syncPixiVersion = useCanvasSyncStore((state) => state.syncPixiVersion);
  const renderVersion = useCanvasSyncStore((state) => state.renderVersion);

  // elementsMap을 직접 사용 (elements로부터 중복 Map 생성 제거)
  const elementsMap = useStore((state) => state.elementsMap);
  const elementById = elementsMap;

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

      // display:contents 요소는 레이아웃 트리에서 투명 — 깊이 증가 없이 부모를 따라감
      const parentStyle = el.props?.style as Record<string, unknown> | undefined;
      if (parentStyle?.display === 'contents') {
        const depth = computeDepth(el.parent_id as string | null);
        cache.set(id, depth);
        return depth;
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

  // 현재 페이지 요소 필터링 (Body 제외)
  const pageElements = useMemo(() => {
    return elements.filter(
      (el) => el.page_id === currentPageId && el.tag.toLowerCase() !== "body"
    );
  }, [elements, currentPageId]);

  // 🆕 Multi-page: 모든 페이지의 데이터 (body + elements) 사전 계산
  const pagePositions = useStore((state) => state.pagePositions);
  const pagePositionsVersion = useStore((state) => state.pagePositionsVersion);
  const initializePagePositions = useStore((state) => state.initializePagePositions);
  const pageLayoutDirection = useStore((state) => state.pageLayoutDirection);

  // 🆕 Multi-page: pageWidth/pageHeight/pageLayoutDirection 변경 시 페이지 위치 재계산
  const prevLayoutKeyRef = useRef(`${pageWidth}:${pageHeight}:${pageLayoutDirection}`);
  useEffect(() => {
    const layoutKey = `${pageWidth}:${pageHeight}:${pageLayoutDirection}`;
    if (prevLayoutKeyRef.current !== layoutKey && pages.length > 0) {
      prevLayoutKeyRef.current = layoutKey;
      initializePagePositions(pages, pageWidth, pageHeight, PAGE_STACK_GAP, pageLayoutDirection);
    }
  }, [pageWidth, pageHeight, pageLayoutDirection, pages, initializePagePositions]);

  // 🚀 O(1) pageIndex 기반 조회 (elements.find/filter O(N*M) 제거)
  const pageIndex = useStore((state) => state.pageIndex);

  const allPageData = useMemo(() => {
    const map = new Map<string, { bodyElement: Element | null; pageElements: Element[] }>();
    for (const page of pages) {
      const pageEls = getPageElements(pageIndex, page.id, elementsMap);
      let body: Element | null = null;
      const nonBody: Element[] = [];
      for (const el of pageEls) {
        if (el.tag.toLowerCase() === 'body') {
          body = el;
        } else {
          nonBody.push(el);
        }
      }
      map.set(page.id, { bodyElement: body, pageElements: nonBody });
    }
    return map;
  }, [pages, pageIndex, elementsMap]);

  // 🆕 Multi-page: Skia 페이지 프레임 (타이틀 렌더링용)
  const pageFrames = useMemo(() => {
    return pages.map(page => {
      const count = elements.filter(el => el.page_id === page.id && !el.deleted).length;
      return {
        id: page.id,
        title: page.title,
        x: pagePositions[page.id]?.x ?? 0,
        y: pagePositions[page.id]?.y ?? 0,
        width: pageWidth,
        height: pageHeight,
        elementCount: count,
      };
    });
     
  }, [pages, pagePositions, pageWidth, pageHeight, elements]);

  // 🆕 Multi-page: 뷰포트 밖 페이지 컬링 (성능 최적화)
  const visiblePageIds = useMemo(() => {
    const margin = 200; // 여유 마진 (패닝 시 깜빡임 방지)
    const screenWidth = containerSize?.width ?? window.innerWidth;
    const screenHeight = containerSize?.height ?? window.innerHeight;
    const visible = new Set<string>();
    for (const page of pages) {
      const pos = pagePositions[page.id];
      if (!pos) continue;
      const screenX = pos.x * zoom + panOffset.x;
      const screenY = pos.y * zoom + panOffset.y;
      const screenW = pageWidth * zoom;
      const screenH = pageHeight * zoom;
      const isInViewport = !(
        screenX + screenW < -margin ||
        screenX > screenWidth + margin ||
        screenY + screenH < -margin ||
        screenY > screenHeight + margin
      );
      if (isInViewport) visible.add(page.id);
    }
    return visible;
     
  }, [pages, pagePositions, pageWidth, pageHeight, zoom, panOffset.x, panOffset.y, containerSize]);

  // 라쏘 선택 영역 내 요소 찾기
  // 🚀 Phase 6: ElementRegistry의 getBounds() 사용
  const findElementsInLassoArea = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const startGlobal = {
        x: start.x * zoom + panOffset.x,
        y: start.y * zoom + panOffset.y,
      };
      const endGlobal = {
        x: end.x * zoom + panOffset.x,
        y: end.y * zoom + panOffset.y,
      };

      return findElementsInLasso(
        pageElements.map((el) => {
          // 현재 프레임의 정확한 스크린 좌표를 우선 사용
          const container = getElementContainer(el.id);
          let bounds: { x: number; y: number; width: number; height: number } | null = null;
          if (container) {
            try {
              const b = container.getBounds();
              bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
            } catch {
              bounds = null;
            }
          }
          if (!bounds) {
            // fallback: registry에 저장된 bounds
            bounds = getElementBoundsSimple(el.id);
          }
          if (bounds) {
            return {
              id: el.id,
              props: {
                style: {
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                },
              },
            };
          }
          // fallback: 원래 스타일 사용
          const style = el.props?.style as Record<string, unknown> | undefined;
          const localLeft = Number(style?.left ?? 0);
          const localTop = Number(style?.top ?? 0);
          const localWidth = Number(style?.width ?? 0);
          const localHeight = Number(style?.height ?? 0);

          const fallbackStyle = {
            left: Number.isFinite(localLeft) ? localLeft * zoom + panOffset.x : 0,
            top: Number.isFinite(localTop) ? localTop * zoom + panOffset.y : 0,
            width: Number.isFinite(localWidth) ? localWidth * zoom : 0,
            height: Number.isFinite(localHeight) ? localHeight * zoom : 0,
          };

          return {
            id: el.id,
            props: { style: fallbackStyle },
          };
        }),
        startGlobal,
        endGlobal
      );
    },
    [pageElements, panOffset.x, panOffset.y, zoom]
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

  // 🚀 Phase 6: ElementRegistry의 getBounds() 사용
  const getElementBounds = useCallback(
    (element: Element): BoundingBox | null => {
      if (element.tag.toLowerCase() === "body") {
        return { x: 0, y: 0, width: pageWidth, height: pageHeight };
      }

      // ElementRegistry에서 실제 렌더링 bounds 가져오기
      const bounds = getElementBoundsSimple(element.id);
      if (bounds) {
        return bounds;
      }

      // fallback: 원래 스타일 사용
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
    [pageWidth, pageHeight]
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

        let newX = currentX + delta.x;
        let newY = currentY + delta.y;
        if (snapToGrid) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        updateElementProps(elementId, {
          style: {
            ...style,
            left: newX,
            top: newY,
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
        snapToGrid,
        gridSize,
      ]
    ),
    onResizeEnd: useCallback(
      (elementId: string, _handle: HandlePosition, newBounds: BoundingBox) => {
        // 🚀 Phase 5: 드래그 종료 시 해상도 복원
        handleDragEnd();

        // O(1) elementsMap 기반 조회 (elements.find O(N) 제거)
        const element = elementById.get(elementId);
        if (!element) return;

        const style = element.props?.style as
          | Record<string, unknown>
          | undefined;

        let { x, y, width, height } = newBounds;
        if (snapToGrid) {
          // 엣지를 그리드에 정렬하여 위치와 크기 모두 그리드에 맞춤
          const right = Math.round((x + width) / gridSize) * gridSize;
          const bottom = Math.round((y + height) / gridSize) * gridSize;
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
          width = Math.max(gridSize, right - x);
          height = Math.max(gridSize, bottom - y);
        }

        updateElementProps(elementId, {
          style: {
            ...style,
            left: x,
            top: y,
            width,
            height,
          },
        });
        dragPointerRef.current = null;
      },
      [elementById, updateElementProps, handleDragEnd, snapToGrid, gridSize]
    ),
    onLassoEnd: useCallback(
      (selectedIds: string[]) => {
        // 🚀 Phase 5: 드래그 종료 시 해상도 복원
        handleDragEnd();

        // setSelectedElements([])는 selectedElementId, selectedElementProps까지
        // 모두 초기화 (clearSelection은 selection slice만 초기화하여 불충분)
        setSelectedElements(selectedIds);
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
              const d = snapToGrid
                ? { x: Math.round(data.delta.x / gridSize) * gridSize, y: Math.round(data.delta.y / gridSize) * gridSize }
                : data.delta;
              selectionBoxRef.current.updatePosition(d);
            }
            break;
          case 'resize':
            if (data.newBounds) {
              if (snapToGrid) {
                const { x, y, width, height } = data.newBounds;
                const r = Math.round((x + width) / gridSize) * gridSize;
                const b = Math.round((y + height) / gridSize) * gridSize;
                const sx = Math.round(x / gridSize) * gridSize;
                const sy = Math.round(y / gridSize) * gridSize;
                selectionBoxRef.current.updateBounds({
                  x: sx, y: sy,
                  width: Math.max(gridSize, r - sx),
                  height: Math.max(gridSize, b - sy),
                });
              } else {
                selectionBoxRef.current.updateBounds(data.newBounds);
              }
            }
            break;
          // lasso는 기존 방식 유지 (LassoSelection 컴포넌트 사용)
        }
      },
      [snapToGrid, gridSize]
    ),
  });

  // dragState를 ref로 노출 (Skia Selection 렌더링에서 라쏘 상태 접근용)
  const dragStateRef = useRef<DragState>(dragState);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);

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

        // 🆕 Multi-page: 다른 페이지 요소 클릭 시 페이지 전환
        const state = useStore.getState();
        const clickedElement = state.elementsMap.get(elementId);
        if (clickedElement?.page_id && clickedElement.page_id !== state.currentPageId) {
          clearSelection();
          setCurrentPageId(clickedElement.page_id);
        }

        // 계층 해석: 클릭된 요소에서 현재 editingContext의 직계 자식을 찾음
        const resolvedTarget = resolveClickTarget(
          elementId,
          state.editingContextId,
          state.elementsMap,
        );
        if (!resolvedTarget) {
          if (state.editingContextId === null) {
            // 루트 레벨: Body 요소 클릭 시 body 선택
            const clickedEl = state.elementsMap.get(elementId);
            if (clickedEl && clickedEl.tag.toLowerCase() === 'body') {
              if (clickedEl.page_id && clickedEl.page_id !== state.currentPageId) {
                setCurrentPageId(clickedEl.page_id);
              }
              startTransition(() => {
                setSelectedElement(elementId);
              });
            }
          } else {
            // editingContext 내부에서 context 외부 요소 클릭 → 한 단계 위로 복귀
            state.exitEditingContext();
          }
          return;
        }

        // Cmd+Click (Mac) or Ctrl+Click (Windows) for multi-select
        const isMultiSelectKey = modifiers?.metaKey || modifiers?.ctrlKey;

        // 🚀 Phase 18: startTransition으로 선택 업데이트를 비긴급 처리
        // React가 현재 프레임을 먼저 완료하고, 유휴 시간에 리렌더링 수행
        startTransition(() => {
          if (isMultiSelectKey) {
            // 🆕 Multi-page: 크로스 페이지 다중 선택 방지
            // 다른 페이지 요소면 페이지 전환 + 단일 선택
            const curPageId = useStore.getState().currentPageId;
            const targetEl = useStore.getState().elementsMap.get(resolvedTarget);
            if (targetEl?.page_id && targetEl.page_id !== curPageId) {
              setSelectedElement(resolvedTarget);
              return;
            }

            // 🚀 getState()로 현재 selectedElementIds 읽기 (stale closure 방지)
            const currentSelectedIds = useStore.getState().selectedElementIds;

            // 🚀 O(n) → O(1) 최적화: Set을 사용하여 빠른 검색
            const selectedSet = new Set(currentSelectedIds);
            const isAlreadySelected = selectedSet.has(resolvedTarget);

            if (isAlreadySelected) {
              // 선택 해제 - Set에서 제거 후 배열로 변환
              selectedSet.delete(resolvedTarget);
              if (selectedSet.size > 0) {
                setSelectedElements(Array.from(selectedSet));
              } else {
                clearSelection();
              }
            } else {
              // 선택에 추가 - Set에 추가 후 배열로 변환
              selectedSet.add(resolvedTarget);
              setSelectedElements(Array.from(selectedSet));
            }
          } else {
            // 단일 선택
            setSelectedElement(resolvedTarget);
          }
        });
      });
    },
    [setSelectedElement, setSelectedElements, clearSelection, isEditing, setCurrentPageId]
  );

  // Element double click handler (텍스트 편집 또는 컨테이너 진입)
  // 🚀 Phase 6: ElementRegistry의 getBounds() 사용
  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      const state = useStore.getState();

      // 계층 해석: 더블클릭 대상을 현재 context 기준으로 해석
      const resolvedTarget = resolveClickTarget(
        elementId,
        state.editingContextId,
        state.elementsMap,
      );
      if (!resolvedTarget) return;

      const resolvedElement = state.elementsMap.get(resolvedTarget);
      if (!resolvedElement) return;

      // 텍스트 요소: 텍스트 편집 시작 (기존 동작)
      const textTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'label', 'button']);
      if (textTags.has(resolvedElement.tag)) {
        const layoutPosition = getElementBoundsSimple(resolvedTarget);
        startEdit(resolvedTarget, layoutPosition ?? undefined);
        return;
      }

      // 자식이 있는 컨테이너: 한 단계 진입
      const children = state.childrenMap.get(resolvedTarget);
      if (children && children.length > 0) {
        state.enterEditingContext(resolvedTarget);
        return;
      }

      // 리프 요소: 텍스트 편집 시도 (기존 동작)
      const layoutPosition = getElementBoundsSimple(resolvedTarget);
      startEdit(resolvedTarget, layoutPosition ?? undefined);
    },
    [startEdit]
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
    <div
      ref={setContainerNode}
      className="canvas-container"
      tabIndex={-1}
      onPointerDown={(e) => {
        // 캔버스 영역 클릭 시 컨테이너에 포커스 → activeScope가 'canvas-focused'로 전환
        // Backspace/Delete 등 캔버스 스코프 단축키 활성화
        const target = e.target as HTMLElement;
        if (!target.closest('input, textarea, [contenteditable="true"]')) {
          containerRef.current?.focus();
        }
      }}
    >
      {/* 🚀 Phase 7: Application 즉시 렌더링, Yoga는 LayoutSystem.init()에서 로드 */}
      {containerEl && (
        <Application
          resizeTo={containerEl}
          background={backgroundColor}
          backgroundAlpha={0}
          // 🚀 Phase 5: 저사양 기기에서 antialias 비활성화
          antialias={!isLowEnd}
          // 🚀 Phase 5: 동적 해상도 (인터랙션 중 낮춤)
          resolution={resolution}
          autoDensity={true}
          roundPixels={false}
          // 🚀 Phase 5: GPU 성능 최적화
          powerPreference="high-performance"
          // 🚀 Phase 8: Application + LayoutSystem 초기화 완료 콜백
          // LayoutSystem.init()이 Yoga WASM을 내부적으로 로드 (Phase 9에서 제거 예정)
          onInit={(app) => {
            setPixiApp(app);
            setAppReady(true);
          }}
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
            initialPanOffsetX={initialPanOffsetX}
          />

          {/* 전체 Canvas 영역 클릭 → editingContext 복귀 또는 body 선택 */}
          <ClickableBackground
            onClick={() => {
              const { editingContextId, exitEditingContext, currentPageId, elementsMap: storeElementsMap, pageIndex: storePageIndex } = useStore.getState();
              // editingContext 진입 상태 → 한 단계 위로 복귀 (Pencil 방식)
              if (editingContextId !== null) {
                exitEditingContext();
                return;
              }
              // 루트 레벨 빈 영역 클릭 → body 요소 선택
              // O(페이지요소수) 조회 (전체 elements O(N) 대신 pageIndex 활용)
              if (currentPageId) {
                const pageElementIds = storePageIndex.elementsByPage.get(currentPageId);
                if (pageElementIds) {
                  for (const eid of pageElementIds) {
                    const el = storeElementsMap.get(eid);
                    if (el && el.tag === 'body') {
                      setSelectedElement(el.id);
                      return;
                    }
                  }
                }
              }
              clearSelection();
            }}
            onLassoStart={startLasso}
            onLassoDrag={updateDrag}
            onLassoEnd={endDrag}
            zoom={zoom}
            panOffset={panOffset}
          />

          {/* Camera/Viewport - x, y, scale은 ViewportController가 직접 조작 */}
          <pixiContainer
            label="Camera"
            eventMode="static"
            interactiveChildren={true}
          >
            {/* 🆕 Multi-page: 메모이제이션된 페이지 컨테이너 (뷰포트 컬링 적용) */}
            {pages.map((page) => {
              const pos = pagePositions[page.id];
              const data = allPageData.get(page.id);
              if (!pos || !data) return null;
              return (
                <PageContainer
                  key={page.id}
                  pageId={page.id}
                  posX={pos.x}
                  posY={pos.y}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  zoom={zoom}
                  panOffset={panOffset}
                  isVisible={visiblePageIds.has(page.id)}
                  appReady={appReady}
                  wasmLayoutReady={wasmLayoutReady}
                  bodyElement={data.bodyElement}
                  pageElements={data.pageElements}
                  elementById={elementById}
                  depthMap={depthMap}
                  onClick={handleElementClick}
                  onDoubleClick={handleElementDoubleClick}
                  onTitleDragStart={startPageDrag}
                />
              );
            })}

            {/* Selection Layer (최상단 - 모든 페이지 위) */}
            <SelectionLayer
              dragState={dragState}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              zoom={zoom}
              panOffset={panOffset}
              onResizeStart={handleResizeStart}
              onMoveStart={handleMoveStart}
              onCursorChange={handleCursorChange}
              selectionBoxRef={selectionBoxRef}
              pagePositions={pagePositions}
              pagePositionsVersion={pagePositionsVersion}
            />
          </pixiContainer>

        </Application>
      )}

      {/* Phase 5: CanvasKit 오버레이 */}
      {containerEl && pixiApp && (
        <SkiaOverlayLazy
          containerEl={containerEl}
          backgroundColor={backgroundColor}
          app={pixiApp}
          dragStateRef={dragStateRef}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          pageFrames={pageFrames}
          currentPageId={currentPageId}
        />
      )}

      <GPUDebugOverlay />

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
