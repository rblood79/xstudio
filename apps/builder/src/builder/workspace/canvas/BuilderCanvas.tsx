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

import "@pixi/layout";
import type { LayoutOptions } from "@pixi/layout";
import { useCallback, useEffect, useRef, useMemo, useState, memo, startTransition, lazy, Suspense, type RefObject } from "react";
import { Application, useApplication } from "@pixi/react";
import { Graphics as PixiGraphics, Container, Application as PixiApplication } from "pixi.js";
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
import { GridLayer } from "./grid";
import { ViewportControlBridge } from "./viewport";
import { BodyLayer } from "./layers";
import { TextEditOverlay, useTextEdit } from "../overlay";
// 🚀 Phase 6: calculateLayout 제거 - @pixi/layout이 자동으로 레이아웃 처리
// 🚀 Phase 7: Yoga 초기화는 LayoutSystem.init()에 위임 (Application onInit 콜백으로 감지)
// 🚀 Phase 4 (2026-01-28): 하이브리드 레이아웃 엔진 통합
import {
  styleToLayout,
  selectEngine,
  shouldDelegateToPixiLayout,
  parsePadding,
  parseBorder,
  type LayoutStyle,
  type ComputedLayout,
} from "./layout";
import { getElementBoundsSimple, getElementContainer, registerElement, unregisterElement, updateElementBounds } from "./elementRegistry";
import { notifyLayoutChange, useSkiaNode } from "./skia/useSkiaNode";
import { LayoutComputedSizeContext } from "./layoutContext";
import { getOutlineVariantColor } from "./utils/cssVariableReader";
import { GPUDebugOverlay } from "./utils/GPUDebugOverlay";
import { useThemeColors } from "./hooks/useThemeColors";
import { useViewportCulling } from "./hooks/useViewportCulling";
import { usePageDrag } from "./hooks/usePageDrag";
import { longTaskMonitor } from "../../../utils/longTaskMonitor";
import type { Element } from "../../../types/core/store.types";
import { getPageElements } from "../../stores/utils/elementIndexer";
import type { PageElementIndex } from "../../stores/utils/elementIndexer";
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
const SkiaOverlayComponent = lazy(() =>
  import('./skia/SkiaOverlay').then((mod) => ({ default: mod.SkiaOverlay }))
);

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
  yogaReady: boolean;
  bodyElement: Element | null;
  pageElements: Element[];
  elementById: (id: string) => Element | undefined;
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
  yogaReady,
  bodyElement,
  pageElements,
  elementById,
  depthMap,
  onClick,
  onDoubleClick,
  onTitleDragStart,
}: PageContainerProps) {
  const draw = useMemo(() => titleHitDraw(pageWidth), [pageWidth]);

  const handleTitlePointerDown = useCallback((e: { nativeEvent: PointerEvent; stopPropagation: () => void }) => {
    e.stopPropagation();
    onTitleDragStart(pageId, e.nativeEvent.clientX, e.nativeEvent.clientY);
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
      {isVisible && yogaReady && bodyElement && (
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
 * 🚀 Phase 7: Layout Container
 *
 * @pixi/layout의 layout prop과 ElementRegistry 등록을 함께 처리합니다.
 * SelectionBox가 올바른 위치에 표시되도록 layout이 적용된 Container를 등록합니다.
 */
const LayoutContainer = memo(function LayoutContainer({
  elementId,
  layout,
  children,
}: {
  elementId: string;
  layout: LayoutStyle;
  children: React.ReactNode;
}) {
  useExtend(PIXI_COMPONENTS);

  // Layout이 적용된 Container를 registry에 등록
  const containerRef = useRef<Container | null>(null);
  const handleContainerRef = useCallback((container: Container | null) => {
    containerRef.current = container;
    if (container) {
      registerElement(elementId, container);
    }
  }, [elementId]);

  // Yoga 계산된 pixel 크기를 하위 컴포넌트에 전달
  const [computedSize, setComputedSize] = useState<{ width: number; height: number } | null>(null);

  // @pixi/layout의 'layout' 이벤트를 구독하여 Yoga 계산 완료 시점에 정확히 읽기
  // 기존 requestAnimationFrame 방식은 @pixi/layout의 prerender보다 먼저 실행될 수 있어
  // 스타일 변경 시 즉시 반영되지 않는 문제가 있었음
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncLayoutData = () => {
      if (container.destroyed) return;
      try {
        // 1) SelectionLayer용 global bounds 업데이트
        const bounds = container.getBounds();
        if (bounds.width > 0 || bounds.height > 0) {
          updateElementBounds(elementId, {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          });
        }

        // 2) Yoga 계산된 layout dimensions를 하위 컴포넌트에 전달
        const yogaLayout = (container as unknown as Record<string, unknown>)._layout as
          { computedLayout?: { width: number; height: number } } | undefined;
        const yogaWidth = yogaLayout?.computedLayout?.width;
        const yogaHeight = yogaLayout?.computedLayout?.height;

        if (yogaWidth !== undefined && yogaHeight !== undefined && (yogaWidth > 0 || yogaHeight > 0)) {
          setComputedSize((prev) => {
            if (prev && prev.width === yogaWidth && prev.height === yogaHeight) return prev;
            return { width: yogaWidth, height: yogaHeight };
          });
        }
      } catch {
        // Container destroyed 또는 아직 미렌더링
      }
    };

    // @pixi/layout의 'layout' 이벤트 핸들러
    // updateLayout() 내부에서 emit('layout')이 _onUpdate()보다 먼저 호출되어
    // getBounds()가 stale worldTransform을 읽음 → updateElementBounds의 epsilon check 통과
    // → notifyLayoutChange 미호출 → Skia 캐시 미갱신.
    // 해결: 'layout' 이벤트에서 무조건 notifyLayoutChange() 호출.
    // 'layout'은 hasNewLayout()이 true인 경우에만 발생하므로 안전하며,
    // Skia renderFrame은 PixiJS render 이후(priority -50)에 실행되어
    // 이 시점에서 worldTransform은 이미 갱신되어 있다.
    const onLayoutEvent = () => {
      syncLayoutData();
      notifyLayoutChange();
    };

    container.on('layout', onLayoutEvent);
    // 최초 마운트 시 첫 prerender가 아직 미실행일 수 있으므로 rAF fallback
    const rafId = requestAnimationFrame(syncLayoutData);

    return () => {
      container.off('layout', onLayoutEvent);
      cancelAnimationFrame(rafId);
    };
  }, [elementId]);

  // Cleanup: unmount 시 registry에서 해제
  useEffect(() => {
    return () => {
      unregisterElement(elementId);
    };
  }, [elementId]);

  return (
    <LayoutComputedSizeContext.Provider value={computedSize}>
      <pixiContainer ref={handleContainerRef} layout={layout as unknown as LayoutOptions} label={elementId}>
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
// 🚀 Phase 6: layoutResult prop 제거 - @pixi/layout 자동 레이아웃
// 🚀 Phase 7: pageWidth/pageHeight 추가 - 루트 layout 설정에 필요
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
}) {
  // 🚀 성능 최적화: selectedElementIds 구독 제거
  // 기존: ElementsLayer가 selectedElementIds 구독 → 선택 변경 시 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 상태만 구독 → 변경된 요소만 리렌더 O(2)
  // selectedElementIds, selectedIdSet 제거됨

  const pageChildrenMap = useMemo(() => {
    const map = new Map<string | null, Element[]>();
    const bodyId = bodyElement?.id ?? null;

    for (const el of pageElements) {
      const parentId = el.parent_id ?? bodyId;
      const key = parentId ?? null;
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
  }, [pageElements, bodyElement?.id]);

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
  // 🚀 Phase 3: layoutResult 제거 - ElementRegistry 사용
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
  ]), []);

  // 🚀 Phase 8: CSS display: block 요소 목록
  // body가 flexDirection: 'row'일 때, block 요소들이 한 줄 전체를 차지하도록
  // flexBasis: '100%'를 적용해야 함 (CSS width: auto의 block 동작 재현)
  const BLOCK_TAGS = useMemo(() => new Set([
    'Card', 'Panel', 'Form', 'Disclosure', 'DisclosureGroup', 'Accordion',
    'Dialog', 'Modal', 'Box', 'Tabs', 'CheckboxGroup', 'RadioGroup',
    'Section',
  ]), []);

  // 🚀 자체 padding/border 렌더링 컴포넌트 (leaf UI)
  // 이 태그들은 자체적으로 padding/border를 그래픽 크기에 반영하므로
  // 외부 LayoutContainer(Yoga)에 padding/border를 전달하면 이중 적용됨
  // → Yoga가 내부 콘텐츠를 오프셋 + 컴포넌트가 자체 크기에 반영 = 이중
  const SELF_PADDING_TAGS = useMemo(() => new Set([
    'Button', 'SubmitButton',
    'FancyButton',
    'ToggleButton',
    'ToggleButtonGroup',
    'Card',  // PixiCard가 sizePreset.padding으로 내부 처리
    // 향후 자체 padding/border 렌더링하는 컴포넌트 추가 시 여기에 등록
  ]), []);

  // 🚀 Phase 6: @pixi/layout 완전 전환 - layoutResult 제거
  // @pixi/layout이 자동으로 flexbox 레이아웃 처리
  // 🚀 Phase 7: LayoutContainer 사용 - layout + registry 등록 통합
  // 🚀 Phase 9: children이 있는 요소에 기본 flex 레이아웃 적용
  // 🚀 Phase 10: Container 타입은 children을 내부에서 렌더링
  // 🚀 Phase 4 (2026-01-28): 하이브리드 레이아웃 엔진 (Grid/Block은 커스텀 엔진)
  const renderedTree = useMemo(() => {
    // viewport 정보 (vh/vw 단위 변환용)
    const viewport = { width: pageWidth, height: pageHeight };

    // 🚀 자체 padding/border 렌더링 컴포넌트용 layout 정리
    // Yoga가 padding/border를 inset으로 처리하면 이중 적용됨
    // → 컴포넌트 자체가 처리하는 속성은 외부 LayoutContainer에서 제거
    // Note: 버튼 겹침은 Skia stroke inset(nodeRenderers.ts)으로 해결
    function stripSelfRenderedProps(layout: LayoutStyle): LayoutStyle {
      const {
        padding: _p, paddingTop: _pt, paddingRight: _pr, paddingBottom: _pb, paddingLeft: _pl,
        borderWidth: _bw, borderTopWidth: _btw, borderRightWidth: _brw, borderBottomWidth: _bbw, borderLeftWidth: _blw,
        borderRadius: _br, borderColor: _bc, backgroundColor: _bg,
        ...rest
      } = layout;
      return rest;
    }

    function isImplicitFlexColumnLayout(layout: LayoutStyle): boolean {
      return !layout.display && !layout.flexDirection;
    }

    function shouldUseImplicitFlexColumn(tag: string, layout: LayoutStyle): boolean {
      if (!isImplicitFlexColumnLayout(layout)) {
        return false;
      }
      // Section은 CSS 기본값(display: block)을 유지한다.
      return tag !== 'Section';
    }

    function getImplicitSectionBlockPatch(tag: string, layout: LayoutStyle): Partial<LayoutStyle> {
      if (tag !== 'Section' || !isImplicitFlexColumnLayout(layout)) {
        return {};
      }
      return { display: 'block' as const };
    }

    function isContainerTagForLayout(tag: string, layout: LayoutStyle): boolean {
      if (tag === 'Section') {
        // Section은 명시적으로 flex 컨테이너일 때만 내부 children 렌더링 경로 사용
        return layout.display === 'flex' || layout.flexDirection !== undefined;
      }
      return CONTAINER_TAGS.has(tag);
    }

    // 🚀 Phase 4: 커스텀 엔진으로 렌더링 (display: grid/block)
    // Grid/Block은 @pixi/layout 대신 커스텀 엔진으로 레이아웃 계산 후 absolute 배치
    function renderWithCustomEngine(
      parentElement: Element,
      children: Element[],
      renderTreeFn: (parentId: string | null) => React.ReactNode
    ): React.ReactNode {
      const parentStyle = parentElement.props?.style as Record<string, unknown> | undefined;
      const rawParentDisplay = parentStyle?.display as string | undefined;
      const parentDisplay = rawParentDisplay ?? (parentElement.tag === 'Section' ? 'block' : undefined);
      const engine = selectEngine(parentDisplay);

      // 🚀 Body 이중 패딩 방지
      // Body가 부모일 때: root pixiContainer가 이미 border+padding 오프셋을 적용하고
      // width=contentWidth로 설정되었으므로, 여기서 다시 padding을 적용하면 이중 적용된다.
      // 비-Body 부모: border는 시각 렌더링 전용, padding만 inset으로 사용
      const isBodyParent = parentElement === bodyElement;
      const parentPadding = parsePadding(parentStyle);
      const parentBorderVal = isBodyParent ? parseBorder(parentStyle) : { top: 0, right: 0, bottom: 0, left: 0 };

      // Body: content-box 크기 (pageWidth - border - padding). 비-Body: pageWidth - padding
      const availableWidth = isBodyParent
        ? pageWidth - parentBorderVal.left - parentBorderVal.right - parentPadding.left - parentPadding.right
        : pageWidth - parentPadding.left - parentPadding.right;
      const availableHeight = isBodyParent
        ? pageHeight - parentBorderVal.top - parentBorderVal.bottom - parentPadding.top - parentPadding.bottom
        : pageHeight - parentPadding.top - parentPadding.bottom;

      // Body 자식 위치: root container가 이미 offset 적용 → 0
      const paddingOffsetX = isBodyParent ? 0 : parentPadding.left;
      const paddingOffsetY = isBodyParent ? 0 : parentPadding.top;

      // 레이아웃 계산 (padding이 적용된 content-box 크기 사용)
      // 🚀 Phase 7: parentDisplay 전달로 CSS blockification 지원
      const layouts = engine.calculate(
        parentElement,
        children,
        availableWidth,
        availableHeight,
        { bfcId: parentElement.id, parentDisplay }
      );
      const layoutMap = new Map<string, ComputedLayout>(
        layouts.map((l) => [l.elementId, l])
      );

      // 🚀 Phase 5: 라인 기반 렌더링 - inline 요소들을 가로로 배치
      // BlockEngine은 같은 줄의 inline 요소들을 LineBox로 그룹화하지만,
      // vertical-align으로 인해 각 요소의 y 값이 다를 수 있음 (baseline, top, bottom, middle)
      // 따라서 수직 범위가 겹치는 요소들을 같은 라인으로 그룹화
      interface LineGroup {
        y: number;
        height: number;
        elements: Array<{ child: Element; layout: ComputedLayout }>;
      }

      const lines: LineGroup[] = [];

      children.forEach((child) => {
        if (!renderIdSet.has(child.id)) return;
        const layout = layoutMap.get(child.id);
        if (!layout) return;

        const elementTop = layout.y;
        const elementBottom = layout.y + layout.height;

        // 기존 라인과 수직 범위가 겹치는지 확인 (vertical-align으로 인한 y 차이 허용)
        const existingLine = lines.find((line) => {
          const lineTop = line.y;
          const lineBottom = line.y + line.height;
          // 수직 범위가 겹치면 같은 라인
          return elementTop < lineBottom && elementBottom > lineTop;
        });

        if (existingLine) {
          existingLine.elements.push({ child, layout });
          // 라인 범위 확장 (가장 위쪽 y와 가장 아래쪽 bottom 기준)
          const newTop = Math.min(existingLine.y, elementTop);
          const newBottom = Math.max(existingLine.y + existingLine.height, elementBottom);
          existingLine.y = newTop;
          existingLine.height = newBottom - newTop;
        } else {
          // 새 라인 생성
          lines.push({
            y: layout.y,
            height: layout.height,
            elements: [{ child, layout }],
          });
        }
      });

      // y 값 기준으로 라인 정렬
      lines.sort((a, b) => a.y - b.y);

      // 라인별로 렌더링
      let previousLineBottom = 0;

      const lineElements = lines.map((line, lineIndex) => {
        // 라인의 marginTop 계산
        const lineMarginTop = lineIndex === 0 ? line.y : Math.max(0, line.y - previousLineBottom);
        previousLineBottom = line.y + line.height;

        // x 기준으로 요소 정렬
        line.elements.sort((a, b) => a.layout.x - b.layout.x);

        // 라인 내 요소들 렌더링
        let previousRight = 0;

        const rowElements = line.elements.map(({ child, layout }, elemIndex) => {
          // 요소 간 gap 계산 (x 위치 차이)
          const marginLeft = elemIndex === 0 ? layout.x : Math.max(0, layout.x - previousRight);
          previousRight = layout.x + layout.width;

          // 🚀 vertical-align 반영: BlockEngine이 계산한 y 위치를 marginTop으로 변환
          // 라인 상단(line.y) 기준으로 각 요소의 y 오프셋 계산
          const marginTop = layout.y - line.y;

          // 🚀 CONTAINER_TAGS 처리
          const childLayoutStyle = styleToLayout(child, viewport);
          const isContainerType = isContainerTagForLayout(child.tag, childLayoutStyle);
          const childElements = isContainerType ? (pageChildrenMap.get(child.id) ?? []) : [];
          const hasChildElements = (pageChildrenMap.get(child.id)?.length ?? 0) > 0;

          const effectiveChildLayoutStyle = isContainerType && SELF_PADDING_TAGS.has(child.tag)
            ? stripSelfRenderedProps(childLayoutStyle)
            : childLayoutStyle;

          // 🚀 ToggleButtonGroup: minHeight 미적용 (자식 ToggleButton 높이에 맞게 자동 계산)
          const isToggleButtonGroup = child.tag === 'ToggleButtonGroup';
          const isAutoHeightSection = child.tag === 'Section' &&
            hasChildElements &&
            (childLayoutStyle.height === undefined || childLayoutStyle.height === 'auto');
          // effectiveChildLayoutStyle에서 width/height 분리
          // BlockEngine이 계산한 크기가 styleToLayout의 'auto' 기본값에 덮어씌워지지 않도록
          const { width: _csw, height: _csh, ...childLayoutRest } = effectiveChildLayoutStyle;
          const childNeedsImplicitFlexLayout = isContainerType && shouldUseImplicitFlexColumn(child.tag, childLayoutRest);
          const childImplicitSectionBlockPatch = isContainerType
            ? getImplicitSectionBlockPatch(child.tag, childLayoutRest)
            : {};
          const containerLayout = isContainerType
            ? childNeedsImplicitFlexLayout
              ? {
                position: 'relative' as const,
                marginTop,
                marginLeft,
                width: layout.width,
                height: 'auto' as unknown as number,
                ...(isToggleButtonGroup ? {} : { minHeight: layout.height }),
                display: 'flex' as const,
                flexDirection: 'column' as const,
                ...childLayoutRest,
              }
              : {
                position: 'relative' as const,
                marginTop,
                marginLeft,
                width: layout.width,
                height: 'auto' as unknown as number,
                ...(isToggleButtonGroup ? {} : { minHeight: layout.height }),
                ...childLayoutRest,
                ...childImplicitSectionBlockPatch,
              }
            : {
                position: 'relative' as const,
                marginTop,
                marginLeft,
                width: layout.width,
                ...(isAutoHeightSection
                  ? { height: 'auto' as unknown as number, minHeight: layout.height }
                  : { height: layout.height }),
              };

          return (
            <LayoutContainer
              key={`custom-${child.id}`}
              elementId={child.id}
              layout={containerLayout}
            >
              <ElementSprite
                element={child}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                childElements={isContainerType ? childElements : undefined}
                renderChildElement={isContainerType ? (childEl: Element) => {
                  const childLayout = styleToLayout(childEl, viewport);
                  const effectiveChildLayout = SELF_PADDING_TAGS.has(childEl.tag)
                    ? stripSelfRenderedProps(childLayout)
                    : childLayout;
                  const childHasChildren = (pageChildrenMap.get(childEl.id)?.length ?? 0) > 0;

                  const isChildContainerType = isContainerTagForLayout(childEl.tag, effectiveChildLayout);
                  const isChildBlockElement = BLOCK_TAGS.has(childEl.tag);
                  const hasExplicitChildWidth = effectiveChildLayout.width !== undefined && effectiveChildLayout.width !== 'auto';
                  const childBlockLayout = isChildBlockElement && !hasExplicitChildWidth
                    ? { flexBasis: '100%' as const }
                    : {};

                  const childFlexShrinkDefault = effectiveChildLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
                  const childBlockLayoutDefaults = { flexBasis: 'auto' as const, flexGrow: 0 };
                  const childNeedsImplicitFlexLayout = childHasChildren && shouldUseImplicitFlexColumn(childEl.tag, effectiveChildLayout);
                  const childSectionBlockPatch = !childNeedsImplicitFlexLayout
                    ? getImplicitSectionBlockPatch(childEl.tag, effectiveChildLayout)
                    : {};
                  const childContainerLayout = childNeedsImplicitFlexLayout
                    ? { position: 'relative' as const, ...childBlockLayoutDefaults, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...childBlockLayout, ...effectiveChildLayout }
                    : { position: 'relative' as const, ...childBlockLayoutDefaults, ...childFlexShrinkDefault, ...childBlockLayout, ...effectiveChildLayout, ...childSectionBlockPatch };

                  const nestedChildElements = isChildContainerType ? (pageChildrenMap.get(childEl.id) ?? []) : [];

                  return (
                    <LayoutContainer key={childEl.id} elementId={childEl.id} layout={childContainerLayout}>
                      <ElementSprite
                        element={childEl}
                        onClick={onClick}
                        onDoubleClick={onDoubleClick}
                        childElements={isChildContainerType ? nestedChildElements : undefined}
                        renderChildElement={isChildContainerType ? (nestedEl: Element) => {
                          const nestedLayout = styleToLayout(nestedEl, viewport);
                          const effectiveNestedLayout = SELF_PADDING_TAGS.has(nestedEl.tag)
                            ? stripSelfRenderedProps(nestedLayout)
                            : nestedLayout;
                          const nestedHasChildren = (pageChildrenMap.get(nestedEl.id)?.length ?? 0) > 0;
                          const nestedFlexShrinkDefault = effectiveNestedLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
                          const nestedBlockLayoutDefaults = { flexBasis: 'auto' as const, flexGrow: 0 };
                          const nestedNeedsImplicitFlexLayout = nestedHasChildren && shouldUseImplicitFlexColumn(nestedEl.tag, effectiveNestedLayout);
                          const nestedSectionBlockPatch = !nestedNeedsImplicitFlexLayout
                            ? getImplicitSectionBlockPatch(nestedEl.tag, effectiveNestedLayout)
                            : {};
                          const nestedContainerLayout = nestedNeedsImplicitFlexLayout
                            ? { position: 'relative' as const, ...nestedBlockLayoutDefaults, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...effectiveNestedLayout }
                            : { position: 'relative' as const, ...nestedBlockLayoutDefaults, ...nestedFlexShrinkDefault, ...effectiveNestedLayout, ...nestedSectionBlockPatch };
                          return (
                            <LayoutContainer key={nestedEl.id} elementId={nestedEl.id} layout={nestedContainerLayout}>
                              <ElementSprite
                                element={nestedEl}
                                onClick={onClick}
                                onDoubleClick={onDoubleClick}
                              />
                              {renderTreeFn(nestedEl.id)}
                            </LayoutContainer>
                          );
                        } : undefined}
                      />
                      {!isChildContainerType && renderTreeFn(childEl.id)}
                    </LayoutContainer>
                  );
                } : undefined}
              />
              {!isContainerType && renderTreeFn(child.id)}
            </LayoutContainer>
          );
        });

        // 라인이 하나의 요소만 가지면 flex row 래퍼 불필요
        if (rowElements.length === 1) {
          return (
            <LayoutContainer
              key={`line-${lineIndex}`}
              layout={{
                position: 'relative' as const,
                marginTop: lineMarginTop,
                display: 'flex' as const,
                flexDirection: 'row' as const,
                alignItems: 'flex-start' as const,  // 각 요소의 marginTop으로 vertical-align 반영
              }}
            >
              {rowElements}
            </LayoutContainer>
          );
        }

        // 여러 요소가 있는 라인은 flex row로 감싸기
        return (
          <LayoutContainer
            key={`line-${lineIndex}`}
            layout={{
              position: 'relative' as const,
              marginTop: lineMarginTop,
              display: 'flex' as const,
              flexDirection: 'row' as const,
              alignItems: 'flex-start' as const,  // 각 요소의 marginTop으로 vertical-align 반영
              flexWrap: 'nowrap' as const,
            }}
          >
            {rowElements}
          </LayoutContainer>
        );
      });

      const isSectionBlockParent = parentElement.tag === 'Section' && parentDisplay !== 'flex' && parentDisplay !== 'inline-flex';
      // 🚀 flex column 래퍼로 라인들을 감싸기
      return (
        <LayoutContainer
          key={`custom-wrapper-${parentElement.id}`}
          layout={{
            position: isSectionBlockParent ? ('relative' as const) : ('absolute' as const),
            ...(isSectionBlockParent
              ? { marginLeft: paddingOffsetX, marginTop: paddingOffsetY, marginBottom: parentPadding.bottom }
              : { left: paddingOffsetX, top: paddingOffsetY }),
            width: availableWidth,
            display: 'flex' as const,
            flexDirection: 'column' as const,
            alignItems: 'flex-start' as const,
          }}
        >
          {lineElements}
        </LayoutContainer>
      );
    }

    function renderTree(parentId: string | null): React.ReactNode {
      const children = pageChildrenMap.get(parentId) ?? [];
      if (children.length === 0) return null;

      // 🚀 Phase 4: 부모의 display 확인하여 엔진 선택
      const parentElement = parentId ? elementById.get(parentId) : bodyElement;
      const parentStyle = parentElement?.props?.style as Record<string, unknown> | undefined;
      const rawParentDisplay = parentStyle?.display as string | undefined;
      const parentDisplay = rawParentDisplay ?? (parentElement?.tag === 'Section' ? 'block' : undefined);

      // 엔진 선택
      const engine = selectEngine(parentDisplay);

      // Grid/Block은 커스텀 엔진 사용 (명시적 display만)
      // Flex 및 암시적 flex(undefined)는 @pixi/layout에 위임
      // 🚀 Phase 6 Fix: display가 명시적으로 설정된 경우만 커스텀 엔진 사용
      const useCustomEngine = parentDisplay !== undefined &&
        !shouldDelegateToPixiLayout(engine) &&
        parentElement !== null;

      if (useCustomEngine && parentElement) {
        return renderWithCustomEngine(parentElement, children, renderTree);
      }

      // Flex 및 기본(암시적 flex)은 기존 @pixi/layout 방식
      // 🚀 부모의 flex 속성을 가져와서 자식 배치에 활용
      const parentLayout = parentElement ? styleToLayout(parentElement, viewport) : {};

      return children.map((child) => {
        if (!renderIdSet.has(child.id)) return null;

        // Element의 style에서 layout 속성 추출
        // @pixi/layout이 flexbox 기반으로 자동 배치
        const baseLayout = styleToLayout(child, viewport);

        // 🚀 자체 padding/border 렌더링 컴포넌트: 외부 LayoutContainer에서 padding/border 제거
        // PixiButton 등은 자체적으로 padding/border를 그래픽 크기에 반영하므로
        // Yoga에도 전달하면 이중 적용 (위치 이동 + 크기 변경)
        const effectiveLayout = SELF_PADDING_TAGS.has(child.tag)
          ? stripSelfRenderedProps(baseLayout)
          : baseLayout;

        // 🚀 Phase 9: children이 있지만 flexDirection이 없으면 기본 flex 레이아웃 적용
        // 이렇게 하면 children이 0,0에 쌓이는 문제 해결
        const hasChildren = (pageChildrenMap.get(child.id)?.length ?? 0) > 0;

        // 🚀 Phase 8: CSS display: block 요소에 flexBasis: '100%' 적용
        // 부모가 암시적 flex-row일 때 block 요소가 한 줄 전체를 차지하도록
        // 단, 부모가 명시적으로 display:flex를 설정한 경우 CSS flex 명세에 따라
        // block 요소도 flex item으로 취급 → flexBasis: '100%' 미적용
        const isBlockElement = BLOCK_TAGS.has(child.tag);
        const parentHasExplicitFlex = parentDisplay === 'flex' || parentDisplay === 'inline-flex';
        // Body 기본값: rootLayout은 항상 flexDirection: 'row' (bodyLayout에서 override 가능)
        const isParentFlexRow = parentElement === bodyElement
          ? (parentLayout.flexDirection ?? 'row') === 'row'
          : parentLayout.flexDirection === 'row' || (!parentLayout.flexDirection && parentLayout.display === 'flex');
        // styleToLayout은 기본 width: 'auto'를 반환하므로, 사용자가 명시적으로
        // 설정한 width만 체크 (auto는 "미지정"으로 취급)
        const hasExplicitWidth = effectiveLayout.width !== undefined && effectiveLayout.width !== 'auto';
        const blockLayout = isBlockElement && !hasExplicitWidth && isParentFlexRow
          ? parentHasExplicitFlex
            ? { flexGrow: 1, flexShrink: 1 }              // 명시적 flex row: 나머지 공간 채움
            : { flexBasis: '100%' as const }               // 암시적 flex row: 한 줄 전체 차지 (block 동작)
          : {};
        // 🚀 Block 요소 width 강제: flex column에서 align-items: flex-start여도 전체 너비 차지
        // alignSelf: 'stretch'는 Yoga에서 height에도 영향 → width: '100%'로 명시적 처리
        // effectiveLayout 뒤에 spread하여 styleToLayout의 width: 'auto'를 덮어씀
        const blockWidthOverride = isBlockElement && !hasExplicitWidth && !isParentFlexRow
          ? { width: '100%' as const }
          : {};

        // 🚀 자식 요소에 display: flex가 있으면 해당 속성 적용
        // 🚀 Phase 12: position: 'relative' 명시적 설정
        // custom engine(block/grid) → @pixi/layout(flex) 전환 시
        // Yoga가 이전 position: 'absolute'를 유지하는 문제 방지
        // baseLayout에 position: 'absolute'가 있으면 그것으로 override됨
        //
        // 🚀 Phase 12 Fix: flexShrink 조건부 기본값 (CSS 동작 에뮬레이션)
        //
        // CSS 동작:
        //   - flex-shrink 기본값 = 1 (축소 허용)
        //   - min-width 기본값 = auto (콘텐츠 크기 이하로 축소 방지)
        //   → 퍼센트 width: 부모 기준으로 비례 축소됨
        //   → 고정/미지정 width: 콘텐츠 크기까지만 축소
        //
        // Yoga 동작:
        //   - flex-shrink 기본값 = 0
        //   - min-width 기본값 = 0 (콘텐츠 크기 이하로도 축소 → 겹침)
        //
        // 조건부 분기:
        //   - 퍼센트 width/flexBasis → flexShrink: 1 (CSS처럼 비례 축소 허용)
        //   - 고정/미지정 width → flexShrink: 0 (min-width: auto 에뮬레이션)
        // 사용자가 명시적으로 flexShrink를 설정하면 그 값이 우선
        const hasPercentSize =
          (typeof effectiveLayout.width === 'string' && effectiveLayout.width.endsWith('%')) ||
          (typeof effectiveLayout.flexBasis === 'string' && String(effectiveLayout.flexBasis).endsWith('%'));
        const flexShrinkDefault = effectiveLayout.flexShrink !== undefined
          ? {}
          : { flexShrink: hasPercentSize ? 1 : 0 };
        // 🚀 Container 타입(Card, Panel 등)은 child element 없이도 내부 Yoga 레이아웃이
        // 올바르게 계산되도록 display: flex + flexDirection: column 보장
        // (PixiCard 등이 내부에서 flex column 레이아웃을 사용하므로 외부도 동기화)
        const isContainerTag = isContainerTagForLayout(child.tag, effectiveLayout);
        const needsFlexLayout = (hasChildren || isContainerTag) && shouldUseImplicitFlexColumn(child.tag, effectiveLayout);
        const implicitSectionBlockPatch = !needsFlexLayout
          ? getImplicitSectionBlockPatch(child.tag, effectiveLayout)
          : {};
        // 🚀 @pixi/layout의 formatStyles는 이전 스타일과 merge하므로,
        // 부모 flexDirection 변경 시 이전 blockLayout의 flexBasis/flexGrow가 잔류.
        // 명시적 기본값으로 stale 속성을 항상 리셋.
        const blockLayoutDefaults = { flexBasis: 'auto' as const, flexGrow: 0 };
        const containerLayout = needsFlexLayout
          ? { position: 'relative' as const, ...blockLayoutDefaults, ...flexShrinkDefault, display: 'flex' as const, flexDirection: 'column' as const, ...blockLayout, ...effectiveLayout, ...blockWidthOverride }
          : { position: 'relative' as const, ...blockLayoutDefaults, ...flexShrinkDefault, ...blockLayout, ...effectiveLayout, ...blockWidthOverride, ...implicitSectionBlockPatch };

        // 🚀 Phase 10: Container 타입은 children을 ElementSprite에 전달
        // Container 컴포넌트가 children을 배경 안에 렌더링
        const isContainerType = isContainerTagForLayout(child.tag, effectiveLayout);
        const childElements = isContainerType ? (pageChildrenMap.get(child.id) ?? []) : [];

        // LayoutContainer: layout + registry 등록을 함께 처리
        // SelectionBox가 올바른 위치에 표시되도록 함
        return (
          <LayoutContainer key={child.id} elementId={child.id} layout={containerLayout}>
            <ElementSprite
              element={child}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              childElements={isContainerType ? childElements : undefined}
              renderChildElement={isContainerType ? (childEl: Element) => {
                const childLayout = styleToLayout(childEl, viewport);
                const effectiveChildLayout = SELF_PADDING_TAGS.has(childEl.tag)
                  ? stripSelfRenderedProps(childLayout)
                  : childLayout;
                const childHasChildren = (pageChildrenMap.get(childEl.id)?.length ?? 0) > 0;

                // 🚀 Phase 11: nested Container 타입 처리
                // Panel 안의 Card, Card 안의 Panel 등 중첩된 Container도 children 렌더링 지원
                const isChildContainerType = isContainerTagForLayout(childEl.tag, effectiveChildLayout);
                const isChildBlockElement = BLOCK_TAGS.has(childEl.tag);
                const hasExplicitChildWidth = effectiveChildLayout.width !== undefined && effectiveChildLayout.width !== 'auto';
                const childBlockLayout = isChildBlockElement && !hasExplicitChildWidth
                  ? { flexBasis: '100%' as const }
                  : {};

                const childFlexShrinkDefault = effectiveChildLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
                const childBlockLayoutDefaults = { flexBasis: 'auto' as const, flexGrow: 0 };
                const childNeedsImplicitFlexLayout = childHasChildren && shouldUseImplicitFlexColumn(childEl.tag, effectiveChildLayout);
                const childSectionBlockPatch = !childNeedsImplicitFlexLayout
                  ? getImplicitSectionBlockPatch(childEl.tag, effectiveChildLayout)
                  : {};
                const childContainerLayout = childNeedsImplicitFlexLayout
                  ? { position: 'relative' as const, ...childBlockLayoutDefaults, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...childBlockLayout, ...effectiveChildLayout }
                  : { position: 'relative' as const, ...childBlockLayoutDefaults, ...childFlexShrinkDefault, ...childBlockLayout, ...effectiveChildLayout, ...childSectionBlockPatch };

                // nested Container의 children
                const nestedChildElements = isChildContainerType ? (pageChildrenMap.get(childEl.id) ?? []) : [];

                return (
                  <LayoutContainer key={childEl.id} elementId={childEl.id} layout={childContainerLayout}>
                    <ElementSprite
                      element={childEl}
                      onClick={onClick}
                      onDoubleClick={onDoubleClick}
                      childElements={isChildContainerType ? nestedChildElements : undefined}
                      renderChildElement={isChildContainerType ? (nestedEl: Element) => {
                        // 재귀적으로 nested children 렌더링
                        const nestedLayout = styleToLayout(nestedEl, viewport);
                        const effectiveNestedLayout = SELF_PADDING_TAGS.has(nestedEl.tag)
                          ? stripSelfRenderedProps(nestedLayout)
                          : nestedLayout;
                        const nestedHasChildren = (pageChildrenMap.get(nestedEl.id)?.length ?? 0) > 0;
                        const nestedFlexShrinkDefault = effectiveNestedLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
                        const nestedBlockLayoutDefaults = { flexBasis: 'auto' as const, flexGrow: 0 };
                        const nestedNeedsImplicitFlexLayout = nestedHasChildren && shouldUseImplicitFlexColumn(nestedEl.tag, effectiveNestedLayout);
                        const nestedSectionBlockPatch = !nestedNeedsImplicitFlexLayout
                          ? getImplicitSectionBlockPatch(nestedEl.tag, effectiveNestedLayout)
                          : {};
                        const nestedContainerLayout = nestedNeedsImplicitFlexLayout
                          ? { position: 'relative' as const, ...nestedBlockLayoutDefaults, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...effectiveNestedLayout }
                          : { position: 'relative' as const, ...nestedBlockLayoutDefaults, ...nestedFlexShrinkDefault, ...effectiveNestedLayout, ...nestedSectionBlockPatch };
                        return (
                          <LayoutContainer key={nestedEl.id} elementId={nestedEl.id} layout={nestedContainerLayout}>
                            <ElementSprite
                              element={nestedEl}
                              onClick={onClick}
                              onDoubleClick={onDoubleClick}
                            />
                            {renderTree(nestedEl.id)}
                          </LayoutContainer>
                        );
                      } : undefined}
                    />
                    {!isChildContainerType && renderTree(childEl.id)}
                  </LayoutContainer>
                );
              } : undefined}
            />
            {/* Container 타입이 아닌 경우에만 children을 형제로 렌더링 */}
            {!isContainerType && renderTree(child.id)}
          </LayoutContainer>
        );
      });
    }

    return renderTree(bodyElement?.id ?? null);
  }, [pageChildrenMap, renderIdSet, onClick, onDoubleClick, bodyElement?.id, elementById, pageWidth, pageHeight, CONTAINER_TAGS, BLOCK_TAGS]);

  // 🚀 Phase 7: @pixi/layout 루트 컨테이너 layout 설정
  // Body 요소의 flex 스타일을 적용하여 자식 요소들이 올바르게 배치되도록 함
  //
  // 🚀 Phase 13: CSS border-box 모델 에뮬레이션
  // CSS는 기본적으로 border-box (width가 border+padding+content 포함)
  // Yoga는 기본적으로 content-box (width가 content만, padding/border는 외부에 추가)
  //
  // 해결책:
  // - width/height = content-box (pageWidth - border - padding)
  // - padding/border = undefined (Yoga에 전달하지 않음)
  // - offset Container로 border+padding 안쪽에서 자식 배치
  const bodyStyle = bodyElement?.props?.style as Record<string, unknown> | undefined;
  const bodyBorder = useMemo(() => parseBorder(bodyStyle), [bodyStyle]);
  const bodyPadding = useMemo(() => parsePadding(bodyStyle), [bodyStyle]);

  // content-box 크기 (CSS에서 자식의 100% 기준)
  const contentWidth = pageWidth - bodyBorder.left - bodyBorder.right - bodyPadding.left - bodyPadding.right;
  const contentHeight = pageHeight - bodyBorder.top - bodyBorder.bottom - bodyPadding.top - bodyPadding.bottom;

  // 자식 시작 위치 오프셋 (border + padding 안쪽)
  const contentOffsetX = bodyBorder.left + bodyPadding.left;
  const contentOffsetY = bodyBorder.top + bodyPadding.top;

  const rootLayout = useMemo(() => {
    // Body 요소의 layout 스타일 가져오기
    const bodyLayout = bodyElement ? styleToLayout(bodyElement, { width: pageWidth, height: pageHeight }) : {};

    // Body의 flexbox 속성 적용 (width/height는 page 크기로 고정)
    // 🚀 Phase 8: CSS body 기본값 동기화
    // - CSS body(block) + inline-block 자식들 → 가로 배치 + 줄바꿈
    // - @pixi/layout에서 이를 재현: flexDirection: 'row' + flexWrap: 'wrap'
    // - justifyContent: 'flex-start' → 좌측부터 순서대로 배치 (CSS inline-block 동작)
    // 🚀 Phase 9: display: 'flex' 명시적 추가 - @pixi/layout이 flex 컨테이너로 인식하도록
    // 🚀 Phase 12: body가 display: flex를 명시한 경우 CSS flex 기본값 사용
    // - CSS flex 기본값: flexWrap: 'nowrap', alignItems: 'stretch', alignContent: 'stretch'
    // - 암시적(block) 기본값: flexWrap: 'wrap', alignItems: 'flex-start', alignContent: 'flex-start'
    // - Yoga에서 flexWrap: 'wrap' + alignContent: 'flex-start'는 alignItems를 무시하므로
    //   body가 flex일 때 CSS 기본값을 적용해야 justify-content/align-items가 정상 동작
    const isBodyFlex = bodyLayout.display === 'flex';
    // 🚀 bodyLayout에서 display를 분리하여 항상 'flex'로 강제
    // body가 display: 'block'일 때 bodyLayout.display = 'block'이 spread되면
    // @pixi/layout(Yoga)의 레이아웃 계산이 비정상 동작 → 중첩 flex 컨테이너 깨짐
    // 커스텀 엔진(BlockEngine)이 block 레이아웃을 외부에서 처리하므로
    // Yoga 트리의 루트 노드는 항상 flex 컨텍스트로 유지해야 함
    const { display: _bodyDisplay, ...bodyLayoutWithoutDisplay } = bodyLayout;
    const result = {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      flexWrap: isBodyFlex ? ('nowrap' as const) : ('wrap' as const),
      justifyContent: 'flex-start' as const,
      alignItems: isBodyFlex ? ('stretch' as const) : ('flex-start' as const),
      alignContent: isBodyFlex ? ('stretch' as const) : ('flex-start' as const),
      ...bodyLayoutWithoutDisplay,
      // 🚀 Phase 13: content-box 크기로 설정 (자식의 100% 기준)
      width: Math.max(0, contentWidth),
      height: Math.max(0, contentHeight),
      // padding/border는 Yoga에 전달하지 않음 (offset Container에서 처리)
      padding: undefined,
      paddingTop: undefined,
      paddingRight: undefined,
      paddingBottom: undefined,
      paddingLeft: undefined,
      borderWidth: undefined,
      borderTopWidth: undefined,
      borderRightWidth: undefined,
      borderBottomWidth: undefined,
      borderLeftWidth: undefined,
      position: 'relative' as const,
    };

    return result;
  }, [pageWidth, pageHeight, bodyElement, contentWidth, contentHeight]);

  return (
    // 🚀 Phase 13: offset Container로 body의 border+padding 안쪽에서 자식 배치
    // PixiJS Container의 x/y는 @pixi/layout의 layout prop과 별도로 적용됨
    <pixiContainer
      label="ElementsLayer"
      x={contentOffsetX}
      y={contentOffsetY}
      layout={rootLayout as unknown as LayoutOptions}
      eventMode="static"
      interactiveChildren={true}
    >
      {/* 🚀 성능 최적화: isSelected prop 제거 - 각 ElementSprite가 자체 구독 */}
      {/* 🚀 Phase 11: visibleElements 기준으로 ancestor까지 포함한 계층 렌더링 */}
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
  // 🚀 Phase 7: @pixi/layout용 Yoga 초기화 상태
  const [yogaReady, setYogaReady] = useState(false);
  // Phase 5: PixiJS app 인스턴스 (SkiaOverlay에 전달)
  const pixiAppRef = useRef<PixiApplication | null>(null);

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

  // 🚀 Phase 7: Yoga 초기화는 LayoutSystem.init()에 위임
  // Application의 onInit 콜백에서 yogaReady 설정 (아래 onInit prop 참고)
  // 수동 initYoga() 호출 제거: LayoutSystem.init()와 이중 loadYoga() 호출로
  // "Expected null or instance of Node" BindingError 발생 방지

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

  // 🚀 Phase 6: calculateLayout 제거 - @pixi/layout이 자동으로 레이아웃 처리

  // 🚀 elementsMap을 직접 사용 (elements로부터 중복 Map 생성 제거)
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

  // 현재 페이지의 Body 요소
  const bodyElement = useMemo(() => {
    if (!currentPageId) return null;
    return elements.find(
      (el) => el.page_id === currentPageId && el.tag.toLowerCase() === "body"
    ) ?? null;
  }, [elements, currentPageId]);

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

  // 🆕 Multi-page: pageWidth 변경 시 페이지 위치 재계산 (breakpoint 변경 대응)
  const prevPageWidthRef = useRef(pageWidth);
  useEffect(() => {
    if (prevPageWidthRef.current !== pageWidth && pages.length > 0) {
      prevPageWidthRef.current = pageWidth;
      initializePagePositions(pages, pageWidth, PAGE_STACK_GAP);
    }
  }, [pageWidth, pages, initializePagePositions]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, pagePositionsVersion, pageWidth, pageHeight, elements]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, pagePositionsVersion, pageWidth, pageHeight, zoom, panOffset.x, panOffset.y, containerSize]);

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

        // Cmd+Click (Mac) or Ctrl+Click (Windows) for multi-select
        const isMultiSelectKey = modifiers?.metaKey || modifiers?.ctrlKey;

        // 🚀 Phase 18: startTransition으로 선택 업데이트를 비긴급 처리
        // React가 현재 프레임을 먼저 완료하고, 유휴 시간에 리렌더링 수행
        startTransition(() => {
          if (isMultiSelectKey) {
            // 🆕 Multi-page: 크로스 페이지 다중 선택 방지
            // 다른 페이지 요소면 페이지 전환 + 단일 선택
            const curPageId = useStore.getState().currentPageId;
            const targetEl = useStore.getState().elementsMap.get(elementId);
            if (targetEl?.page_id && targetEl.page_id !== curPageId) {
              setSelectedElement(elementId);
              return;
            }

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
    [setSelectedElement, setSelectedElements, clearSelection, isEditing, setCurrentPageId]
  );

  // Element double click handler (텍스트 편집 시작)
  // 🚀 Phase 6: ElementRegistry의 getBounds() 사용
  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      const layoutPosition = getElementBoundsSimple(elementId);
      startEdit(elementId, layoutPosition ?? undefined);
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
          // 🚀 Phase 5: 저사양 기기에서 antialias 비활성화
          antialias={!isLowEnd}
          // 🚀 Phase 5: 동적 해상도 (인터랙션 중 낮춤)
          resolution={resolution}
          autoDensity={true}
          roundPixels={false}
          // 🚀 Phase 5: GPU 성능 최적화
          powerPreference="high-performance"
          // 🚀 Phase 7 Fix: LayoutSystem.init() 완료 후 Yoga 준비 완료 콜백
          // LayoutSystem.init()이 유일한 loadYoga() 호출 경로 → 인스턴스 중복 방지
          onInit={(app) => { pixiAppRef.current = app; setYogaReady(true); }}
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
                  yogaReady={yogaReady}
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
      {containerEl && pixiAppRef.current && (
        <SkiaOverlayLazy
          containerEl={containerEl}
          backgroundColor={backgroundColor}
          app={pixiAppRef.current}
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
