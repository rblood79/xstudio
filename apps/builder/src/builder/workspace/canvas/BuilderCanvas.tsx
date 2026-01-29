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
import { useCallback, useEffect, useRef, useMemo, useState, memo, startTransition } from "react";
import { Application, useApplication } from "@pixi/react";
import { Graphics as PixiGraphics, Container } from "pixi.js";
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
// 🚀 Phase 6: calculateLayout 제거 - @pixi/layout이 자동으로 레이아웃 처리
// 🚀 Phase 7: Yoga 초기화는 LayoutSystem.init()에 위임 (Application onInit 콜백으로 감지)
// 🚀 Phase 4 (2026-01-28): 하이브리드 레이아웃 엔진 통합
import {
  styleToLayout,
  selectEngine,
  shouldDelegateToPixiLayout,
  parsePadding,
  type LayoutStyle,
  type ComputedLayout,
} from "./layout";
import { getElementBoundsSimple, registerElement, unregisterElement, updateElementBounds } from "./elementRegistry";
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

  // layout prop 변경 시 Container의 global bounds를 직접 계산하여 저장
  // getBounds()는 @pixi/layout 타이밍 문제로 0,0을 반환할 수 있으므로,
  // parent의 worldTransform을 사용해 global 좌표를 직접 계산
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // @pixi/layout이 position을 업데이트할 때까지 대기 후 global bounds 저장
    const rafId = requestAnimationFrame(() => {
      if (!container.destroyed) {
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
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [elementId, layout]);

  // Cleanup: unmount 시 registry에서 해제
  useEffect(() => {
    return () => {
      unregisterElement(elementId);
    };
  }, [elementId]);

  return (
    <pixiContainer ref={handleContainerRef} layout={layout}>
      {children}
    </pixiContainer>
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
  pageWidth,
  pageHeight,
  zoom,
  panOffset,
  onClick,
  onDoubleClick,
}: {
  pageWidth: number;
  pageHeight: number;
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

  const bodyElement = useMemo(() => {
    if (!currentPageId) return null;
    return elements.find(
      (el) => el.page_id === currentPageId && el.tag.toLowerCase() === "body"
    ) ?? null;
  }, [elements, currentPageId]);

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
  ]), []);

  // 🚀 Phase 8: CSS display: block 요소 목록
  // body가 flexDirection: 'row'일 때, block 요소들이 한 줄 전체를 차지하도록
  // flexBasis: '100%'를 적용해야 함 (CSS width: auto의 block 동작 재현)
  const BLOCK_TAGS = useMemo(() => new Set([
    'Card', 'Panel', 'Form', 'Disclosure', 'DisclosureGroup', 'Accordion',
    'Dialog', 'Modal', 'Box', 'Tabs', 'CheckboxGroup', 'RadioGroup',
  ]), []);

  // 🚀 Phase 6: @pixi/layout 완전 전환 - layoutResult 제거
  // @pixi/layout이 자동으로 flexbox 레이아웃 처리
  // 🚀 Phase 7: LayoutContainer 사용 - layout + registry 등록 통합
  // 🚀 Phase 9: children이 있는 요소에 기본 flex 레이아웃 적용
  // 🚀 Phase 10: Container 타입은 children을 내부에서 렌더링
  // 🚀 Phase 4 (2026-01-28): 하이브리드 레이아웃 엔진 (Grid/Block은 커스텀 엔진)
  const renderedTree = useMemo(() => {
    // 🚀 Phase 4: 커스텀 엔진으로 렌더링 (display: grid/block)
    // Grid/Block은 @pixi/layout 대신 커스텀 엔진으로 레이아웃 계산 후 absolute 배치
    function renderWithCustomEngine(
      parentElement: Element,
      children: Element[],
      renderTreeFn: (parentId: string | null) => React.ReactNode
    ): React.ReactNode {
      const parentStyle = parentElement.props?.style as Record<string, unknown> | undefined;
      const parentDisplay = parentStyle?.display as string | undefined;
      const engine = selectEngine(parentDisplay);

      // 🚀 부모의 padding 파싱 (자식 요소들의 사용 가능 공간 계산)
      const parentPadding = parsePadding(parentStyle);
      const availableWidth = pageWidth - parentPadding.left - parentPadding.right;
      const availableHeight = pageHeight - parentPadding.top - parentPadding.bottom;

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

      return children.map((child) => {
        if (!renderIdSet.has(child.id)) return null;

        const layout = layoutMap.get(child.id);
        if (!layout) return null;

        return (
          <LayoutContainer
            key={`custom-${child.id}`}
            elementId={child.id}
            layout={{
              position: 'absolute',
              // padding offset 적용
              left: layout.x + parentPadding.left,
              top: layout.y + parentPadding.top,
              width: layout.width,
              height: layout.height,
            }}
          >
            <ElementSprite
              element={child}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
            />
            {renderTreeFn(child.id)}
          </LayoutContainer>
        );
      });
    }

    function renderTree(parentId: string | null): React.ReactNode {
      const children = pageChildrenMap.get(parentId) ?? [];
      if (children.length === 0) return null;

      // 🚀 Phase 4: 부모의 display 확인하여 엔진 선택
      const parentElement = parentId ? elementById.get(parentId) : bodyElement;
      const parentStyle = parentElement?.props?.style as Record<string, unknown> | undefined;
      const parentDisplay = parentStyle?.display as string | undefined;

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
      const parentLayout = parentElement ? styleToLayout(parentElement) : {};

      return children.map((child) => {
        if (!renderIdSet.has(child.id)) return null;

        // Element의 style에서 layout 속성 추출
        // @pixi/layout이 flexbox 기반으로 자동 배치
        const baseLayout = styleToLayout(child);

        // 🚀 Phase 9: children이 있지만 flexDirection이 없으면 기본 flex 레이아웃 적용
        // 이렇게 하면 children이 0,0에 쌓이는 문제 해결
        const hasChildren = (pageChildrenMap.get(child.id)?.length ?? 0) > 0;

        // 🚀 Phase 8: CSS display: block 요소에 flexBasis: '100%' 적용
        // 부모가 flexDirection: 'row'일 때, block 요소가 한 줄 전체를 차지하도록
        const isBlockElement = BLOCK_TAGS.has(child.tag);
        const isParentFlexRow = parentLayout.flexDirection === 'row' || (!parentLayout.flexDirection && parentLayout.display === 'flex');
        const blockLayout = isBlockElement && !baseLayout.width && isParentFlexRow
          ? { flexBasis: '100%' as const }
          : {};

        // 🚀 자식 요소에 display: flex가 있으면 해당 속성 적용
        // 🚀 Phase 12: position: 'relative' 명시적 설정
        // custom engine(block/grid) → @pixi/layout(flex) 전환 시
        // Yoga가 이전 position: 'absolute'를 유지하는 문제 방지
        // baseLayout에 position: 'absolute'가 있으면 그것으로 override됨
        //
        // 🚀 Phase 12 Fix: flexShrink: 0 기본값 (CSS min-width: auto 에뮬레이션)
        // CSS: flex 아이템의 min-width 기본값 = auto (min-content 크기 이하로 축소 안 됨)
        // Yoga: min-width 기본값 = 0 (아이템이 0까지 축소 가능 → 겹침 발생)
        // flexShrink: 0으로 축소를 방지하여 CSS 오버플로 동작 재현
        // 사용자가 명시적으로 flexShrink를 설정하면 그 값이 우선
        const flexShrinkDefault = baseLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
        const containerLayout = hasChildren && !baseLayout.display && !baseLayout.flexDirection
          ? { position: 'relative' as const, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...blockLayout, ...baseLayout }
          : { position: 'relative' as const, ...flexShrinkDefault, ...blockLayout, ...baseLayout };

        // 🚀 Phase 10: Container 타입은 children을 ElementSprite에 전달
        // Container 컴포넌트가 children을 배경 안에 렌더링
        const isContainerType = CONTAINER_TAGS.has(child.tag);
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
                const childLayout = styleToLayout(childEl);
                const childHasChildren = (pageChildrenMap.get(childEl.id)?.length ?? 0) > 0;

                // 🚀 Phase 11: nested Container 타입 처리
                // Panel 안의 Card, Card 안의 Panel 등 중첩된 Container도 children 렌더링 지원
                const isChildContainerType = CONTAINER_TAGS.has(childEl.tag);
                const isChildBlockElement = BLOCK_TAGS.has(childEl.tag);
                const childBlockLayout = isChildBlockElement && !childLayout.width
                  ? { flexBasis: '100%' as const }
                  : {};

                const childFlexShrinkDefault = childLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
                const childContainerLayout = childHasChildren && !childLayout.flexDirection
                  ? { position: 'relative' as const, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...childBlockLayout, ...childLayout }
                  : { position: 'relative' as const, ...childFlexShrinkDefault, ...childBlockLayout, ...childLayout };

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
                        const nestedLayout = styleToLayout(nestedEl);
                        const nestedHasChildren = (pageChildrenMap.get(nestedEl.id)?.length ?? 0) > 0;
                        const nestedFlexShrinkDefault = nestedLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
                        const nestedContainerLayout = nestedHasChildren && !nestedLayout.flexDirection
                          ? { position: 'relative' as const, flexShrink: 0, display: 'flex' as const, flexDirection: 'column' as const, ...nestedLayout }
                          : { position: 'relative' as const, ...nestedFlexShrinkDefault, ...nestedLayout };
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
  const rootLayout = useMemo(() => {
    // Body 요소의 layout 스타일 가져오기
    const bodyLayout = bodyElement ? styleToLayout(bodyElement) : {};


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
    const result = {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      flexWrap: isBodyFlex ? ('nowrap' as const) : ('wrap' as const),
      justifyContent: 'flex-start' as const,
      alignItems: isBodyFlex ? ('stretch' as const) : ('flex-start' as const),
      alignContent: isBodyFlex ? ('stretch' as const) : ('flex-start' as const),
      ...bodyLayout,
      width: pageWidth,
      height: pageHeight,
      position: 'relative' as const,
    };

    return result;
  }, [pageWidth, pageHeight, bodyElement]);

  return (
    <pixiContainer
      label="ElementsLayer"
      layout={rootLayout}
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
}: BuilderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 🚀 Phase 19: SelectionBox imperative handle ref (드래그 중 React 리렌더링 없이 위치 업데이트)
  const selectionBoxRef = useRef<SelectionBoxHandle>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  // 🚀 Phase 7: @pixi/layout용 Yoga 초기화 상태
  const [yogaReady, setYogaReady] = useState(false);

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

  // 🚀 Phase 6: calculateLayout 제거 - @pixi/layout이 자동으로 레이아웃 처리

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
  // 🚀 Phase 6: ElementRegistry의 getBounds() 사용
  const findElementsInLassoArea = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      return findElementsInLasso(
        pageElements.map((el) => {
          // ElementRegistry에서 실제 렌더링 위치 가져오기
          const bounds = getElementBoundsSimple(el.id);
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
          return {
            id: el.id,
            props: { style: el.props?.style as Record<string, unknown> },
          };
        }),
        start,
        end
      );
    },
    [pageElements]
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
  // 🚀 Phase 6: ElementRegistry의 getBounds() 사용
  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      const layoutPosition = getElementBoundsSimple(elementId);
      startEdit(elementId, layoutPosition);
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
    <div ref={setContainerNode} className="canvas-container">
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
          onInit={() => setYogaReady(true)}
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
            {/* 🚀 Phase 7: Yoga 준비 후에만 렌더링 (layout prop에 Yoga 필요) */}
            {yogaReady && (
              <ElementsLayer
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                zoom={zoom}
                panOffset={panOffset}
                onClick={handleElementClick}
                onDoubleClick={handleElementDoubleClick}
              />
            )}

            {/* Selection Layer (최상단) */}
            {/* 🚀 Phase 2: layoutResult prop 제거 - ElementRegistry 사용 */}
            {/* 🚀 Phase 7: panOffset 추가 - 글로벌→로컬 좌표 변환용 */}
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
