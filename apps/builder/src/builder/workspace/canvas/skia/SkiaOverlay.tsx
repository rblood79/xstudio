/**
 * CanvasKit 캔버스 오버레이 컴포넌트
 *
 * PixiJS Application과 함께 CanvasKit `<canvas>`를 배치한다.
 * 전역 레지스트리에서 Skia 렌더 데이터를 읽어 CanvasKit으로 디자인 콘텐츠를 렌더링하고,
 * PixiJS 캔버스는 이벤트 처리(히트 테스팅, 드래그)만 담당한다.
 *
 * Pencil 방식 단일 캔버스: 디자인 콘텐츠 + AI 이펙트 + Selection 오버레이를
 * 모두 CanvasKit으로 렌더링한다.
 *
 * 매 프레임 PixiJS 씬 그래프를 순회하여 Skia 렌더 트리를 재구성하고
 * CanvasKit으로 렌더링한다.
 *
 * @see docs/RENDERING_ARCHITECTURE.md §5.7, §6.1, §6.2
 */

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Application, Container } from "pixi.js";
import { SkiaRenderer } from "./SkiaRenderer";
import {
  getSkiaNode,
  getRegistryVersion,
  notifyLayoutChange,
} from "./useSkiaNode";
import { renderNode } from "./nodeRenderers";
import type { SkiaNodeData } from "./nodeRenderers";
import { isCanvasKitInitialized, getCanvasKit } from "./initCanvasKit";
import { initAllWasm } from "../wasm-bindings/init";
import { skiaFontManager } from "./fontManager";
import {
  loadAllCustomFontsToSkia,
  loadGoogleFontsToSkia,
  syncCustomFontsWithSkia,
} from "../../../fonts/loadCustomFontsToSkia";
import { registerImageLoadCallback } from "./imageCache";
import { useAIVisualFeedbackStore } from "../../../stores/aiVisualFeedback";
import { renderGrid } from "./gridRenderer";
import {
  buildNodeBoundsMap,
  renderGeneratingEffects,
  renderFlashes,
} from "./aiEffects";
import type { AIEffectNodeBounds } from "./types";
import {
  renderSelectionBox,
  renderTransformHandles,
  renderDimensionLabels,
  renderLasso,
  renderPageTitle,
} from "./selectionRenderer";
import {
  computeWorkflowEdges,
  computeDataSourceEdges,
  computeLayoutGroups,
  type WorkflowEdge,
  type DataSourceEdge,
  type LayoutGroup,
} from "./workflowEdges";
import {
  renderWorkflowEdges,
  renderDataSourceEdges,
  renderLayoutGroups,
  renderPageFrameHighlight,
  type PageFrame,
  type ElementBounds,
} from "./workflowRenderer";
import {
  buildEdgeGeometryCache,
  type CachedEdgeGeometry,
} from "./workflowHitTest";
import {
  useWorkflowInteraction,
  type WorkflowHoverState,
} from "../hooks/useWorkflowInteraction";
import {
  useElementHoverInteraction,
  type ElementHoverState,
} from "../hooks/useElementHoverInteraction";
import { useScrollWheelInteraction } from "../hooks/useScrollWheelInteraction";
import {
  renderHoverHighlight,
  renderEditingContextBorder,
} from "./hoverRenderer";
import {
  renderWorkflowMinimap,
  DEFAULT_MINIMAP_CONFIG,
  type MinimapConfig,
} from "./workflowMinimap";
import { useStore } from "../../../stores";
import { useLayoutsStore } from "../../../stores/layouts";
import type { BoundingBox, DragState } from "../selection/types";
import { watchContextLoss } from "./createSurface";
import { flushWasmMetrics, recordWasmMetric } from "../utils/gpuProfilerCore";
import {
  getSharedLayoutMap,
  getSharedLayoutVersion,
  getSharedFilteredChildrenMap,
} from "../layout/engines/fullTreeLayout";
import {
  getCachedCommandStream,
  invalidateCommandStreamCache,
  executeRenderCommands,
  buildAIBoundsFromStream,
} from "./renderCommands";
import {
  buildElementBoundsMapFromTreeBounds,
  buildPageFrameMap,
  buildTreeBoundsMap,
} from "./skiaFrameHelpers";
import {
  buildHoverHighlightTargets,
  buildMinimapConfig,
  buildMinimapRenderData,
  buildMinimapViewportBounds,
  buildGridRenderInput,
  buildPageTitleRenderItems,
  shouldRenderWorkflowMinimap,
} from "./skiaOverlayHelpers";
import {
  buildSelectionRenderData,
  buildWorkflowHighlightState,
  collectHighlightedWorkflowPageIds,
  filterRenderableWorkflowEdges,
} from "./skiaWorkflowSelection";

interface SkiaOverlayProps {
  /** 부모 컨테이너 DOM 요소 */
  containerEl: HTMLDivElement;
  /** 배경색 (hex) */
  backgroundColor?: number;
  /** PixiJS Application 인스턴스 */
  app: Application;
  /** 드래그 상태 Ref (라쏘 렌더링용) */
  dragStateRef?: RefObject<DragState | null>;
  /** 페이지 너비 (타이틀 렌더링용) */
  pageWidth?: number;
  /** 페이지 높이 (타이틀 렌더링용) */
  pageHeight?: number;
  /** 캔버스에 표시할 페이지 프레임들 */
  pageFrames?: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    elementCount: number;
  }>;
  /** 현재 활성 페이지 ID */
  currentPageId?: string | null;
}

/**
 * DOM 요소에서 CSS --bg 변수를 resolved sRGB hex로 읽는다.
 * Canvas 2D fillStyle로 oklch/lab 등 모든 CSS 색공간을 sRGB 변환.
 */
function readCssBgColor(el: HTMLElement): number | null {
  const tmp = document.createElement("div");
  tmp.style.backgroundColor = "var(--bg)";
  tmp.style.display = "none";
  el.appendChild(tmp);
  const resolved = getComputedStyle(tmp).backgroundColor;
  el.removeChild(tmp);
  if (
    !resolved ||
    resolved === "transparent" ||
    resolved === "rgba(0, 0, 0, 0)"
  )
    return null;
  const cvs = document.createElement("canvas");
  cvs.width = 1;
  cvs.height = 1;
  const ctx = cvs.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (r << 16) | (g << 8) | b;
}

/**
 * Camera 컨테이너를 찾아 줌/팬 상태를 추출한다.
 */
function findCameraContainer(stage: Container): Container | null {
  for (const child of stage.children) {
    if ((child as Container).label === "Camera") return child as Container;
  }
  return null;
}

/**
 * text children의 크기/정렬을 실제 컨테이너 크기에 맞춰 갱신한다.
 * (ElementSprite의 useMemo 시점에는 style 기본값만 사용 가능하므로)
 */
function updateTextChildren(
  children: SkiaNodeData[] | undefined,
  parentWidth: number,
  parentHeight: number,
): SkiaNodeData[] | undefined {
  return children?.map((child: SkiaNodeData) => {
    if (child.type === "text" && child.text) {
      // autoCenter: false → 수동 배치 텍스트 (spec shapes 기반)
      // specShapesToSkia가 paddingLeft/maxWidth를 이미 정확하게 계산했으므로
      // 여기서 재계산하지 않는다. (Tabs 등 다중 텍스트에서 위치별 maxWidth가 훼손됨)
      if (child.text.autoCenter === false) {
        return child;
      }
      const fontSize = child.text.fontSize || 14;
      const lineHeight = child.text.lineHeight || fontSize * 1.2; // I-L22: 실제값 우선
      return {
        ...child,
        width: parentWidth,
        height: parentHeight,
        text: {
          ...child.text,
          maxWidth: parentWidth,
          paddingTop: Math.max(0, (parentHeight - lineHeight) / 2),
        },
      };
    }
    // box 자식 (spec 컨테이너): width/height 갱신 + 내부 text 자식 재귀
    if (child.type === "box" && child.children && child.children.length > 0) {
      const updatedChildren = updateTextChildren(
        child.children,
        parentWidth,
        parentHeight,
      );
      return {
        ...child,
        width: parentWidth,
        height: parentHeight,
        children: updatedChildren,
      };
    }
    return child;
  });
}

/**
 * PixiJS 씬 그래프를 계층적으로 순회하여 Skia 렌더 트리를 구성한다.
 *
 * worldTransform에서 부모-자식 간 상대 좌표를 계산하여 계층 구조를 보존한다.
 *
 * 핵심 공식:
 *   relativeX = (child.wt.tx - parent.wt.tx) / cameraZoom
 *
 * parent.wt.tx와 child.wt.tx 모두 동일한 (stale) cameraX를 포함하므로
 * 뺄셈 시 카메라 오프셋이 상쇄된다. 따라서 팬 중에도 부모-자식 상대 위치는
 * worldTransform 갱신 타이밍과 무관하게 항상 정확하다.
 *
 * 이전 flat 트리 방식은 모든 노드의 절대 좌표를
 * (wt.tx - cameraX) / zoom 으로 독립 계산했기 때문에
 * wt.tx 갱신 타이밍 차이가 노드 간 상대 위치 오차로 직결되었다.
 *
 * @param cameraContainer - Camera 컨테이너 (탐색 시작점)
 * @param cameraX - Camera X (현재 panOffset.x)
 * @param cameraY - Camera Y (현재 panOffset.y)
 * @param cameraZoom - Camera 스케일 (줌 레벨)
 */

// 트리 rebuild 캐시 — registryVersion + pagePositionsVersion 미변경 시 재사용하여 GC 압력 저감.
// 카메라(팬/줌)는 비교하지 않음: 트리 좌표는 부모-자식 뺄셈으로 카메라가 상쇄되어
// 동일한 버전이면 카메라 값과 무관하게 동일한 트리가 생성된다.
let _cachedTree: SkiaNodeData | null = null;
let _cachedVersion = -1;
let _cachedPagePosVersion = -1;
// pagePositionsVersion 변경 후 PixiJS worldTransform이 실제 갱신될 때까지
// 캐시를 우회하여 stale 좌표가 캐시에 고정되는 것을 방지한다.
// React 리렌더 → PixiJS 컨테이너 props 갱신 → Application.render() worldTransform 갱신
// 까지 1~2프레임이 필요하므로 3프레임간 캐시를 스킵한다.
let _pagePosStaleFrames = 0;

function buildSkiaTreeHierarchical(
  cameraContainer: Container,
  registryVersion: number,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  pagePositionsVersion = 0,
): SkiaNodeData | null {
  if (
    _cachedTree &&
    registryVersion === _cachedVersion &&
    pagePositionsVersion === _cachedPagePosVersion
  ) {
    return _cachedTree;
  }

  /**
   * PixiJS 컨테이너 트리를 재귀 순회하며 계층적 Skia 노드를 수집한다.
   *
   * @param container - 현재 탐색 중인 PixiJS 컨테이너
   * @param parentAbsX - 부모 labeled 노드의 씬-로컬 절대 X 좌표
   * @param parentAbsY - 부모 labeled 노드의 씬-로컬 절대 Y 좌표
   */
  function traverse(
    container: Container,
    parentAbsX: number,
    parentAbsY: number,
  ): SkiaNodeData[] {
    const results: SkiaNodeData[] = [];

    for (const child of container.children) {
      if (!("children" in child)) continue;
      const c = child as Container;

      if (c.label) {
        const nodeData = getSkiaNode(c.label);
        if (nodeData) {
          // worldTransform에서 씬-로컬 절대 좌표 계산
          const wt = c.worldTransform;
          const absX = (wt.tx - cameraX) / cameraZoom;
          const absY = (wt.ty - cameraY) / cameraZoom;

          // 부모 기준 상대 좌표
          // (parent.wt와 child.wt 모두 동일한 stale cameraX를 포함하므로
          //  뺄셈 시 카메라 오프셋이 상쇄되어 상대 위치는 항상 정확)
          const relX = absX - parentAbsX;
          const relY = absY - parentAbsY;

          // Phase 11: @pixi/layout(Yoga) 제거 — nodeData(엔진 결과 기반)를 우선 사용.
          // c.width/c.height(PixiJS Container bounds)는 자식 bounding box 기반이므로
          // 엔진 결과와 다를 수 있어 폴백으로만 사용.
          const actualWidth =
            nodeData.width > 0 ? nodeData.width : c.width > 0 ? c.width : 0;
          // Card 등 auto-height UI 컴포넌트: contentMinHeight를 최소값으로 적용
          const baseHeight =
            nodeData.height > 0 ? nodeData.height : c.height > 0 ? c.height : 0;
          const actualHeight = nodeData.contentMinHeight
            ? Math.max(baseHeight, nodeData.contentMinHeight)
            : baseHeight;

          // 내부 자식 (text 등) 크기 갱신
          const updatedInternalChildren = updateTextChildren(
            nodeData.children,
            actualWidth,
            actualHeight,
          );

          // 하위 element 자식 재귀 (이 노드의 절대 좌표를 부모로 전달)
          const elementChildren = traverse(c, absX, absY);

          results.push({
            ...nodeData,
            elementId: c.label, // G.3: AI 이펙트 타겟팅용
            x: relX, // 부모 labeled 노드 기준 상대 좌표
            y: relY,
            width: actualWidth,
            height: actualHeight,
            children: [...(updatedInternalChildren || []), ...elementChildren],
          });
          continue; // 이미 자식 순회 완료
        }
      }

      // label 없거나 레지스트리 미등록 → 부모 절대 좌표 유지하며 하위 탐색
      const childResults = traverse(c, parentAbsX, parentAbsY);
      results.push(...childResults);
    }

    return results;
  }

  const children = traverse(cameraContainer, 0, 0);
  if (children.length === 0) {
    _cachedTree = null;
    _cachedVersion = registryVersion;
    _cachedPagePosVersion = pagePositionsVersion;
    return null;
  }

  const result: SkiaNodeData = {
    type: "container",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: true,
    children,
  };

  _cachedTree = result;
  _cachedVersion = registryVersion;
  _cachedPagePosVersion = pagePositionsVersion;

  return result;
}

// Selection 바운드맵 캐시 — 트리와 동일하게 registryVersion + pagePosVersion 기반 재사용
let _cachedTreeBoundsMap: Map<string, BoundingBox> | null = null;
let _cachedTreeBoundsVersion = -1;
let _cachedTreeBoundsPosVersion = -1;

function getCachedTreeBoundsMap(
  tree: SkiaNodeData,
  registryVersion: number,
  pagePosVersion = 0,
): Map<string, BoundingBox> {
  if (
    _cachedTreeBoundsMap &&
    registryVersion === _cachedTreeBoundsVersion &&
    pagePosVersion === _cachedTreeBoundsPosVersion
  ) {
    return _cachedTreeBoundsMap;
  }
  const map = buildTreeBoundsMap(tree);
  _cachedTreeBoundsMap = map;
  _cachedTreeBoundsVersion = registryVersion;
  _cachedTreeBoundsPosVersion = pagePosVersion;
  return map;
}

/**
 * CanvasKit 오버레이 (Pencil 방식 단일 캔버스).
 *
 * 캔버스 레이어 순서 (skia 모드):
 * - z-index: 2 — CanvasKit 캔버스 (디자인 + AI 이펙트 + Selection 오버레이)
 * - z-index: 3 — PixiJS 캔버스 (이벤트 처리 전용, 시각적 렌더링 없음)
 *
 * 모든 Camera 하위 레이어는 renderable=false로 숨기고,
 * PixiJS는 히트 테스팅과 드래그 이벤트만 처리한다.
 */
export function SkiaOverlay({
  containerEl,
  backgroundColor = 0xf3f4f6,
  app,
  dragStateRef,
  pageFrames,
  currentPageId,
}: SkiaOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const contextLostRef = useRef(false);
  const originalCameraAlphaRef = useRef<number | null>(null);

  // Phase 6: Selection/AI 상태 변경 감지용 ref (idle 프레임 스킵 방지)
  const overlayVersionRef = useRef(0);
  const lastSelectedIdsRef = useRef<string[]>([]);
  const lastSelectedIdRef = useRef<string | null>(null);
  const lastAIActiveRef = useRef(0);
  const lastPageFramesSignatureRef = useRef("");
  const pageFramesRef = useRef<SkiaOverlayProps["pageFrames"]>(undefined);
  // 🚀 페이지 위치 변경 감지용 ref (매 프레임 store 읽기 대신 React lifecycle에서 갱신)
  const pagePosVersionRef = useRef(0);
  const lastPagePosVersionRef = useRef(0);

  // Workflow 오버레이 캐시
  const workflowEdgesRef = useRef<WorkflowEdge[]>([]);
  const workflowEdgesVersionRef = useRef(-1);
  const lastShowWorkflowRef = useRef(false);
  const lastWorkflowElementsRef = useRef<unknown>(null);

  // Phase 2: 데이터 소스 엣지 & 레이아웃 그룹 캐시
  const dataSourceEdgesRef = useRef<DataSourceEdge[]>([]);
  const layoutGroupsRef = useRef<LayoutGroup[]>([]);
  // Phase 2: 서브 토글 변경 감지용
  const lastWfSubTogglesRef = useRef("");

  // Phase 4: 요소 호버 상태 ref (React 리렌더 없이 Skia에서 직접 사용)
  const elementHoverStateRef = useRef<ElementHoverState>({
    hoveredElementId: null,
    hoveredLeafIds: [],
    isGroupHover: false,
  });
  const lastEditingContextRef = useRef<string | null>(null);
  const treeBoundsMapRef = useRef<Map<string, BoundingBox>>(new Map());

  // Phase 3: 인터랙션 refs
  const workflowHoverStateRef = useRef<WorkflowHoverState>({
    hoveredEdgeId: null,
  });
  const edgeGeometryCacheRef = useRef<CachedEdgeGeometry[]>([]);
  const edgeGeometryCacheKeyRef = useRef("");
  const pageFrameMapRef = useRef<Map<string, PageFrame>>(new Map());
  const lastHoveredEdgeRef = useRef<string | null>(null);
  const lastFocusedPageRef = useRef<string | null>(null);

  // Grid 상태 변경 감지용 ref
  const lastShowGridRef = useRef(false);
  const lastGridSizeRef = useRef(0);

  // Phase 4: 미니맵 config ref (inspector 패널 너비 반영)
  const minimapConfigRef = useRef<MinimapConfig>(DEFAULT_MINIMAP_CONFIG);
  // Phase 4: 미니맵 가시성 — 캔버스 이동 시에만 표시
  const minimapVisibleRef = useRef(false);
  const minimapFadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastMinimapCameraRef = useRef({ x: 0, y: 0, zoom: 1 });

  // 페이지 프레임/현재 페이지 ref 갱신
  useEffect(() => {
    pageFramesRef.current = pageFrames;
  }, [pageFrames]);

  // Phase 3: 워크플로우 인터랙션 훅
  useWorkflowInteraction({
    containerEl,
    edgeGeometryCacheRef,
    pageFrameMapRef,
    hoverStateRef: workflowHoverStateRef,
    overlayVersionRef,
    minimapConfigRef,
  });

  // Phase 4: 요소 호버 인터랙션
  useElementHoverInteraction({
    containerEl,
    hoverStateRef: elementHoverStateRef,
    overlayVersionRef,
    treeBoundsMapRef,
  });

  // W3-5: overflow:scroll/auto 요소 wheel 이벤트 처리
  useScrollWheelInteraction({
    containerEl,
    treeBoundsMapRef,
  });

  // 🚀 페이지 위치 버전 React lifecycle에서 ref로 전파 (매 프레임 store.getState() 호출 제거)
  useEffect(() => {
    const version = useStore.getState().pagePositionsVersion;
    pagePosVersionRef.current = version;
  });

  // Dev-only: registryVersion 변화율(Content rerender 원인 추적)
  const devRegistryWindowStartMs = useRef(0);
  const devRegistryWindowStartVersion = useRef(0);

  const isActive = true;

  // ============================================
  // Phase 0: Pixi 시각적 숨김 (WASM 로드와 독립적으로 즉시 실행)
  // ============================================
  // SkiaOverlay 마운트 시점에서 app은 이미 유효하다
  // (BuilderCanvas에서 pixiApp && 조건으로 렌더링하므로).
  // ready 상태(WASM + 폰트 로딩)와 무관하게 Pixi의 시각적 렌더링을 즉시 비활성화한다.
  useEffect(() => {
    if (!isActive) return;

    // 1. Pixi 배경 투명화 (backgroundAlpha=0이 있으면 이미 0이지만, 방어적 설정)
    app.renderer.background.alpha = 0;

    // 2. Pixi 캔버스 z-index 설정 (이벤트 처리 레이어)
    const pixiCanvas = app.canvas as HTMLCanvasElement;
    const prevPosition = pixiCanvas.style.position;
    const prevTop = pixiCanvas.style.top;
    const prevLeft = pixiCanvas.style.left;
    const prevWidth = pixiCanvas.style.width;
    const prevHeight = pixiCanvas.style.height;
    const prevZIndex = pixiCanvas.style.zIndex;
    const prevOpacity = pixiCanvas.style.opacity;

    pixiCanvas.style.position = "absolute";
    pixiCanvas.style.top = "0";
    pixiCanvas.style.left = "0";
    pixiCanvas.style.width = "100%";
    pixiCanvas.style.height = "100%";
    pixiCanvas.style.zIndex = "4";

    // 3. Camera 하위 레이어 즉시 숨김 (ticker로 매 프레임 보장)
    //    alpha=0으로 숨기되, PixiJS 8의 EventBoundary._interactivePrune()는
    //    alpha를 prune 조건으로 사용하지 않으므로 히트 테스팅은 유지된다.
    const hitAreaDebug = import.meta.env.VITE_ENABLE_HITAREA_MODE === "true";

    // 히트 영역 디버그: PixiJS 캔버스를 반투명 오버레이로 표시
    // Camera alpha=1로 히트 영역 렌더링 + CSS opacity로 Skia가 비쳐 보이게
    if (hitAreaDebug) {
      pixiCanvas.style.opacity = "0.35";
    }

    const syncPixiVisibility = () => {
      const cameraContainer = findCameraContainer(app.stage);
      if (cameraContainer) {
        if (originalCameraAlphaRef.current == null) {
          originalCameraAlphaRef.current = cameraContainer.alpha;
        }
        if (hitAreaDebug) {
          if (cameraContainer.alpha !== 1) {
            cameraContainer.alpha = 1;
          }
        } else {
          // O(1): Camera 루트만 투명 처리
          if (cameraContainer.alpha !== 0) {
            cameraContainer.alpha = 0;
          }
        }
      }
    };

    // HIGH priority (25): Application.render() (LOW=-25) 전에 실행
    app.ticker.add(syncPixiVisibility, undefined, 25);

    return () => {
      app.ticker.remove(syncPixiVisibility);
      // PixiJS 상태 복원 (SkiaOverlay unmount 시)
      app.renderer.background.alpha = 1;
      pixiCanvas.style.position = prevPosition;
      pixiCanvas.style.top = prevTop;
      pixiCanvas.style.left = prevLeft;
      pixiCanvas.style.width = prevWidth;
      pixiCanvas.style.height = prevHeight;
      pixiCanvas.style.zIndex = prevZIndex;
      pixiCanvas.style.opacity = prevOpacity;
      const camera = findCameraContainer(app.stage);
      if (camera) {
        camera.alpha = originalCameraAlphaRef.current ?? 1;
        originalCameraAlphaRef.current = null;
      }
    };
  }, [app, isActive]);

  // 페이지 프레임 변경 감지 → 오버레이 리렌더 트리거
  useEffect(() => {
    const frames = pageFrames ?? [];
    const signature = frames
      .map((frame) => {
        const isActiveFrame = frame.id === (currentPageId ?? "");
        return `${frame.id}:${frame.title}:${frame.x}:${frame.y}:${frame.width}:${frame.height}:${isActiveFrame ? 1 : 0}`;
      })
      .join("|");

    if (signature !== lastPageFramesSignatureRef.current) {
      overlayVersionRef.current++;
      lastPageFramesSignatureRef.current = signature;
    }
  }, [pageFrames, currentPageId]);

  // CanvasKit + 폰트 초기화
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    initAllWasm()
      .then(async () => {
        if (cancelled) return;

        // 기본 폰트 로드 (텍스트 렌더링에 필수)
        // Pretendard 다중 weight 로드 — Spec fontWeight와 CanvasKit 폰트 매칭
        {
          // 정적 import — Vite가 각 woff2 파일을 asset URL로 변환
          const fontWeights = [
            {
              url: (
                await import("pretendard/dist/web/static/woff2/Pretendard-Regular.woff2?url")
              ).default,
              weight: "400",
            },
            {
              url: (
                await import("pretendard/dist/web/static/woff2/Pretendard-Medium.woff2?url")
              ).default,
              weight: "500",
            },
            {
              url: (
                await import("pretendard/dist/web/static/woff2/Pretendard-SemiBold.woff2?url")
              ).default,
              weight: "600",
            },
            {
              url: (
                await import("pretendard/dist/web/static/woff2/Pretendard-Bold.woff2?url")
              ).default,
              weight: "700",
            },
          ];

          for (const { url, weight } of fontWeights) {
            if (skiaFontManager.hasFont("Pretendard", weight)) continue;
            try {
              await skiaFontManager.loadFont("Pretendard", url, weight);
            } catch (e) {
              console.warn(`[SkiaOverlay] Pretendard ${weight} 로드 실패:`, e);
            }
          }
        }

        if (cancelled) return;

        // Phase C: 레지스트리 커스텀 폰트 Skia 로드
        try {
          const customCount = await loadAllCustomFontsToSkia();
          if (customCount > 0) {
            console.info(
              `[SkiaOverlay] 커스텀 폰트 ${customCount}개 Skia 로드 완료`,
            );
          }
        } catch (e) {
          console.warn("[SkiaOverlay] 커스텀 폰트 Skia 로드 중 오류:", e);
        }

        if (cancelled) return;

        // Google Fonts CDN에서 폰트 바이너리 로드
        try {
          const googleCount = await loadGoogleFontsToSkia();
          if (googleCount > 0) {
            console.info(
              `[SkiaOverlay] Google Fonts ${googleCount}개 Skia 로드 완료`,
            );
          }
        } catch (e) {
          console.warn("[SkiaOverlay] Google Fonts Skia 로드 중 오류:", e);
        }

        if (cancelled) return;

        // Google Fonts 로드 완료 → registryVersion 증가로 Skia 트리 캐시 무효화
        notifyLayoutChange();

        // CanvasKit + 폰트 준비 완료 → TextMeasurer 초기화
        if (skiaFontManager.getFamilies().length > 0) {
          try {
            const { CanvasKitTextMeasurer } =
              await import("../utils/canvaskitTextMeasurer");
            const { setTextMeasurer } = await import("../utils/textMeasure");
            setTextMeasurer(new CanvasKitTextMeasurer());
            // CanvasKit 측정기로 교체 후 레이아웃 재계산 트리거
            // Canvas2D → CanvasKit 폰트 메트릭 차이 보정
            useStore.getState().invalidateLayout();
          } catch (e) {
            console.warn(
              "[SkiaOverlay] CanvasKit TextMeasurer 초기화 실패:",
              e,
            );
          }
        }

        if (cancelled) return;
        setReady(true);
      })
      .catch((err) => {
        console.error("[SkiaOverlay] WASM 초기화 실패:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  // Phase C: 커스텀 폰트 동적 업데이트 핸들러
  useEffect(() => {
    if (!ready || !isActive) return;

    const handleCustomFontsUpdated = async () => {
      try {
        await syncCustomFontsWithSkia();
        // registryVersion 증가 → Skia 트리 캐시 무효화 + 콘텐츠 재렌더
        notifyLayoutChange();
        useStore.getState().invalidateLayout();
        window.dispatchEvent(new CustomEvent("xstudio:fonts-ready"));
      } catch (e) {
        console.warn("[SkiaOverlay] 동적 커스텀 폰트 동기화 실패:", e);
      }
    };

    window.addEventListener(
      "xstudio:custom-fonts-updated",
      handleCustomFontsUpdated,
    );
    return () => {
      window.removeEventListener(
        "xstudio:custom-fonts-updated",
        handleCustomFontsUpdated,
      );
    };
  }, [ready, isActive]);

  // CanvasKit Surface 생성 + 이벤트 브리징
  useEffect(() => {
    if (!ready || !isActive || !canvasRef.current) return;
    if (!isCanvasKitInitialized()) return;

    const ck = getCanvasKit();
    const skiaCanvas = canvasRef.current;

    // DPR 적용
    const dpr = window.devicePixelRatio || 1;
    const rect = containerEl.getBoundingClientRect();
    skiaCanvas.width = Math.floor(rect.width * dpr);
    skiaCanvas.height = Math.floor(rect.height * dpr);
    skiaCanvas.style.width = `${rect.width}px`;
    skiaCanvas.style.height = `${rect.height}px`;

    // 배경색: CSS --bg 변수 우선 (oklch 등 모든 색공간 호환), fallback으로 props
    const resolvedBg = readCssBgColor(containerEl) ?? backgroundColor;
    const r = ((resolvedBg >> 16) & 0xff) / 255;
    const g = ((resolvedBg >> 8) & 0xff) / 255;
    const b = (resolvedBg & 0xff) / 255;
    const bgColor = ck.Color4f(r, g, b, 1);

    // SkiaRenderer 생성 (opaque 배경 — alpha compositing 비용 제거)
    const renderer = new SkiaRenderer(ck, skiaCanvas, bgColor, dpr);
    rendererRef.current = renderer;

    // 빌더 테마 변경 시 배경색 동기화
    const syncBgColor = () => {
      requestAnimationFrame(() => {
        const hex = readCssBgColor(containerEl);
        if (hex == null) return;
        const rv = ((hex >> 16) & 0xff) / 255;
        const gv = ((hex >> 8) & 0xff) / 255;
        const bv = (hex & 0xff) / 255;
        renderer.setBackgroundColor(ck.Color4f(rv, gv, bv, 1));
        renderer.invalidateContent();
      });
    };
    // data-builder-theme 속성 변경 감지
    const themeObserver = new MutationObserver(syncBgColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-builder-theme"],
    });
    // OS 다크모드 전환 감지 (빌더 테마 "system" 모드)
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkModeQuery.addEventListener("change", syncBgColor);

    // Skia 렌더 루프: PixiJS ticker에 통합
    // UTILITY priority (-50): Application.render() (LOW=-25) 이후에 실행.
    // Application.render() 내부의 prerender 단계에서 @pixi/layout이
    // Yoga calculateLayout()을 실행하여 worldTransform을 갱신하므로,
    // Skia 렌더링이 항상 최신 레이아웃 좌표를 읽도록 보장한다.
    // (이전: NORMAL(0)에서 실행 → Yoga 미실행 상태의 stale worldTransform 읽음
    //  → display 전환 시 자식이 (0,0)으로 순간이동하는 1-프레임 플리커 발생)
    const renderFrame = () => {
      if (!rendererRef.current) return;
      if (contextLostRef.current) return; // WebGL 컨텍스트 손실 시 렌더링 스킵

      const stage = app.stage;

      // 카메라 상태 추출 (줌/팬)
      const cameraContainer = findCameraContainer(stage);
      const cameraX = cameraContainer?.x ?? 0;
      const cameraY = cameraContainer?.y ?? 0;
      const cameraZoom = Math.max(cameraContainer?.scale?.x ?? 1, 0.001);

      const registryVersion = getRegistryVersion();
      const pagePosVersion = pagePosVersionRef.current;

      // Phase 4: 미니맵 가시성 — 캔버스 이동(pan/zoom) 시에만 표시 (스크롤바 패턴)
      const lastMmCam = lastMinimapCameraRef.current;
      const cameraChanged =
        cameraX !== lastMmCam.x ||
        cameraY !== lastMmCam.y ||
        cameraZoom !== lastMmCam.zoom;
      if (cameraChanged) {
        lastMinimapCameraRef.current = {
          x: cameraX,
          y: cameraY,
          zoom: cameraZoom,
        };
        if (!minimapVisibleRef.current) {
          minimapVisibleRef.current = true;
          overlayVersionRef.current++;
        }
        // 이동 중에는 타이머 리셋
        if (minimapFadeTimerRef.current)
          clearTimeout(minimapFadeTimerRef.current);
        minimapFadeTimerRef.current = setTimeout(() => {
          minimapVisibleRef.current = false;
          overlayVersionRef.current++;
        }, 1500);
      }

      if (process.env.NODE_ENV === "development") {
        const now = performance.now();
        if (devRegistryWindowStartMs.current <= 0) {
          devRegistryWindowStartMs.current = now;
          devRegistryWindowStartVersion.current = registryVersion;
        } else {
          const elapsed = now - devRegistryWindowStartMs.current;
          if (elapsed >= 1000) {
            const delta =
              registryVersion - devRegistryWindowStartVersion.current;
            const perSec = delta / (elapsed / 1000);
            recordWasmMetric("registryChangesPerSec", perSec);
            // content render가 없더라도 오버레이에서 수치를 볼 수 있도록 플러시한다.
            flushWasmMetrics();
            devRegistryWindowStartMs.current = now;
            devRegistryWindowStartVersion.current = registryVersion;
          }
        }
      }

      // Selection 상태 변경 감지 — selectedElementIds 참조 변경 시 version 증가
      const currentSelectedIds = useStore.getState().selectedElementIds;
      const currentSelectedId = useStore.getState().selectedElementId;
      if (
        currentSelectedIds !== lastSelectedIdsRef.current ||
        currentSelectedId !== lastSelectedIdRef.current
      ) {
        overlayVersionRef.current++;
        lastSelectedIdsRef.current = currentSelectedIds;
        lastSelectedIdRef.current = currentSelectedId;
      }

      // editingContext 변경 감지
      const currentEditingContext = useStore.getState().editingContextId;
      if (currentEditingContext !== lastEditingContextRef.current) {
        overlayVersionRef.current++;
        lastEditingContextRef.current = currentEditingContext;
      }

      // AI 상태 변경 감지
      // AI 이펙트가 활성 상태(generating/flash)면 매 프레임 version 증가하여
      // 애니메이션이 idle 분류로 멈추는 것을 방지한다.
      //
      // Phase 2 최적화: flash만 활성이고 모든 flash progress >= 0.9이면
      // version 증가를 스킵하여 불필요한 리렌더를 방지한다.
      const aiState = useAIVisualFeedbackStore.getState();
      const currentAIActive =
        aiState.generatingNodes.size + aiState.flashAnimations.size;
      if (currentAIActive > 0) {
        const hasGenerating = aiState.generatingNodes.size > 0;
        if (hasGenerating) {
          // generating 활성 → 매 프레임 강제 리렌더
          overlayVersionRef.current++;
        } else {
          // flash만 활성 → progress 90% 이상이면 스킵
          const now = performance.now();
          let allNearEnd = true;
          for (const flash of aiState.flashAnimations.values()) {
            const elapsed = now - flash.startTime;
            const progress = Math.min(elapsed / flash.duration, 1);
            if (progress < 0.9) {
              allNearEnd = false;
              break;
            }
          }
          if (!allNearEnd) {
            overlayVersionRef.current++;
          }
        }
      } else if (currentAIActive !== lastAIActiveRef.current) {
        // 비활성 전환 시에도 1회 리렌더 (클린업)
        overlayVersionRef.current++;
      }
      lastAIActiveRef.current = currentAIActive;

      // Grid 상태 변경 감지
      const { showGrid: currentShowGrid, gridSize: currentGridSize } =
        useStore.getState();
      if (
        currentShowGrid !== lastShowGridRef.current ||
        currentGridSize !== lastGridSizeRef.current
      ) {
        overlayVersionRef.current++;
        lastShowGridRef.current = currentShowGrid;
        lastGridSizeRef.current = currentGridSize;
      }

      // 드래그 중(라쏘/리사이즈/이동)에는 매 프레임 오버레이 갱신
      const dragState = dragStateRef?.current;
      if (dragState?.isDragging) {
        overlayVersionRef.current++;
      }

      // Workflow 오버레이 상태 감지 및 엣지 계산
      const showWorkflowOverlay = useStore.getState().showWorkflowOverlay;
      if (showWorkflowOverlay !== lastShowWorkflowRef.current) {
        lastShowWorkflowRef.current = showWorkflowOverlay;
        overlayVersionRef.current++;
      }
      // Phase 2: 서브 토글 변경 감지
      if (showWorkflowOverlay) {
        const {
          showWorkflowNavigation: sn,
          showWorkflowEvents: se,
          showWorkflowDataSources: sd,
          showWorkflowLayoutGroups: sl,
          workflowStraightEdges: wse,
        } = useStore.getState();
        const subKey = `${sn}-${se}-${sd}-${sl}-${wse}`;
        if (subKey !== lastWfSubTogglesRef.current) {
          lastWfSubTogglesRef.current = subKey;
          overlayVersionRef.current++;
        }
      }
      if (showWorkflowOverlay) {
        const storeState = useStore.getState();
        // elements 참조 변경 감지 (이벤트/href 변경은 registryVersion에 반영되지 않으므로)
        const elementsChanged =
          storeState.elements !== lastWorkflowElementsRef.current;
        if (
          registryVersion !== workflowEdgesVersionRef.current ||
          elementsChanged
        ) {
          workflowEdgesRef.current = computeWorkflowEdges(
            storeState.pages,
            storeState.elements as Parameters<typeof computeWorkflowEdges>[1],
          );
          // Phase 2: 데이터 소스 엣지 계산
          dataSourceEdgesRef.current = computeDataSourceEdges(
            storeState.elements as Parameters<typeof computeDataSourceEdges>[0],
          );
          // Phase 2: 레이아웃 그룹 계산
          const layouts = useLayoutsStore.getState().layouts;
          layoutGroupsRef.current = computeLayoutGroups(
            storeState.pages,
            layouts,
          );
          workflowEdgesVersionRef.current = registryVersion;
          lastWorkflowElementsRef.current = storeState.elements;
          overlayVersionRef.current++;
        }

        // Phase 3: hover/focus 변경 감지 → overlayVersion++
        const hoveredEdgeId = workflowHoverStateRef.current.hoveredEdgeId;
        if (hoveredEdgeId !== lastHoveredEdgeRef.current) {
          lastHoveredEdgeRef.current = hoveredEdgeId;
          overlayVersionRef.current++;
        }
        const focusedPageId = storeState.workflowFocusedPageId;
        if (focusedPageId !== lastFocusedPageRef.current) {
          lastFocusedPageRef.current = focusedPageId;
          overlayVersionRef.current++;
        }
      }

      const camera = { zoom: cameraZoom, panX: cameraX, panY: cameraY };

      // 🚀 페이지 위치 변경 감지 — content 무효화 (registryVersion 합산 해킹 제거)
      if (pagePosVersion !== lastPagePosVersionRef.current) {
        lastPagePosVersionRef.current = pagePosVersion;
        renderer.invalidateContent();
        // pagePositionsVersion 변경 직후에는 React 리렌더가 아직 PixiJS 컨테이너의
        // x/y props를 갱신하지 않아 worldTransform이 stale하다.
        // 3프레임간 캐시를 강제 무효화하여 올바른 좌표로 트리가 재빌드되도록 한다.
        _pagePosStaleFrames = 3;
      }

      // pagePositionsVersion 변경 후 과도기 프레임: 캐시 무효화하여 stale 트리 방지
      if (_pagePosStaleFrames > 0) {
        _cachedTree = null;
        invalidateCommandStreamCache();
        _pagePosStaleFrames--;
        renderer.invalidateContent();
      }

      const fontMgr =
        skiaFontManager.getFamilies().length > 0
          ? skiaFontManager.getFontMgr()
          : undefined;

      // ── Phase 3: Command Stream vs Tree 분기 ──────────────────────────
      const sharedLayoutMap = getSharedLayoutMap();
      const useCommandStream = sharedLayoutMap !== null;

      let treeBoundsMap: Map<string, BoundingBox>;
      let nodeBoundsMap: Map<string, AIEffectNodeBounds> | null = null;
      let workflowElementBoundsMap: Map<string, ElementBounds> | null = null;
      const currentAiState = useAIVisualFeedbackStore.getState();
      const hasAIEffects =
        currentAiState.generatingNodes.size > 0 ||
        currentAiState.flashAnimations.size > 0;

      if (useCommandStream) {
        // Phase 3 경로: elementsMap + childrenMap + layoutMap → RenderCommand[]
        const treeBuildStart =
          process.env.NODE_ENV === "development" ? performance.now() : 0;

        const storeState = useStore.getState();
        const pagePositions = storeState.pagePositions;
        const layoutVersion = getSharedLayoutVersion();

        // rootElementIds: 각 페이지의 body element ID
        // bodyPagePositions: bodyId → pagePosition (pagePositions는 pageId 키)
        const rootElementIds: string[] = [];
        const bodyPagePositions: Record<string, { x: number; y: number }> = {};
        for (const page of storeState.pages) {
          const pageElements = storeState.getPageElements(page.id);
          for (const el of pageElements) {
            if (el.tag.toLowerCase() === "body") {
              rootElementIds.push(el.id);
              const pos = pagePositions[page.id];
              if (pos) bodyPagePositions[el.id] = pos;
              break;
            }
          }
        }

        // Fix 1: filteredChildrenMap 사용 (layoutMap과 동일 트리 소스)
        const filteredChildIds = getSharedFilteredChildrenMap();
        let commandChildrenMap: Map<string, Element[]>;
        if (filteredChildIds) {
          commandChildrenMap = new Map();
          for (const [parentId, childIds] of filteredChildIds) {
            const children: Element[] = [];
            for (const cid of childIds) {
              const el = storeState.elementsMap.get(cid);
              if (el) children.push(el);
            }
            commandChildrenMap.set(parentId, children);
          }
        } else {
          commandChildrenMap = storeState.childrenMap;
        }

        const stream = getCachedCommandStream(
          rootElementIds,
          commandChildrenMap,
          sharedLayoutMap,
          bodyPagePositions,
          registryVersion,
          pagePosVersion,
          layoutVersion,
        );

        if (process.env.NODE_ENV === "development") {
          recordWasmMetric(
            "skiaTreeBuildTime",
            performance.now() - treeBuildStart,
          );
        }

        treeBoundsMap = stream.boundsMap;
        treeBoundsMapRef.current = treeBoundsMap;

        if (treeBoundsMap.size === 0) {
          renderer.clearFrame();
          renderer.invalidateContent();
          return;
        }

        // Selection 빌드 (boundsMap에서 0ms)
        const selectionBuildStart =
          process.env.NODE_ENV === "development" ? performance.now() : 0;
        // treeBoundsMap은 이미 절대좌표이므로 selection 빌드에 직접 사용
        if (process.env.NODE_ENV === "development") {
          recordWasmMetric(
            "selectionBuildTime",
            performance.now() - selectionBuildStart,
          );
        }

        // AI 이펙트 바운드 (stream.boundsMap에서 필터링)
        if (hasAIEffects) {
          const aiBuildStart =
            process.env.NODE_ENV === "development" ? performance.now() : 0;
          const targetIds = new Set<string>();
          for (const id of currentAiState.generatingNodes.keys())
            targetIds.add(id);
          for (const id of currentAiState.flashAnimations.keys())
            targetIds.add(id);
          nodeBoundsMap = buildAIBoundsFromStream(stream.boundsMap, targetIds);
          if (process.env.NODE_ENV === "development") {
            recordWasmMetric(
              "aiBoundsBuildTime",
              performance.now() - aiBuildStart,
            );
          }
        }

        renderer.setContentNode({
          renderSkia(canvas, bounds) {
            executeRenderCommands(ck, canvas, stream.commands, bounds, fontMgr);
          },
        });
      } else {
        // 기존 경로: PixiJS 씬 그래프 DFS → 계층적 Skia 트리
        const treeBuildStart =
          process.env.NODE_ENV === "development" ? performance.now() : 0;
        const tree = cameraContainer
          ? buildSkiaTreeHierarchical(
              cameraContainer,
              registryVersion,
              cameraX,
              cameraY,
              cameraZoom,
              pagePosVersion,
            )
          : null;
        if (process.env.NODE_ENV === "development") {
          recordWasmMetric(
            "skiaTreeBuildTime",
            performance.now() - treeBuildStart,
          );
        }
        if (!tree) {
          renderer.clearFrame();
          renderer.invalidateContent();
          return;
        }

        const selectionBuildStart =
          process.env.NODE_ENV === "development" ? performance.now() : 0;
        treeBoundsMap = getCachedTreeBoundsMap(
          tree,
          registryVersion,
          pagePosVersion,
        );
        treeBoundsMapRef.current = treeBoundsMap;
        if (process.env.NODE_ENV === "development") {
          recordWasmMetric(
            "selectionBuildTime",
            performance.now() - selectionBuildStart,
          );
        }

        if (hasAIEffects) {
          const aiBuildStart =
            process.env.NODE_ENV === "development" ? performance.now() : 0;
          nodeBoundsMap = buildNodeBoundsMap(tree, currentAiState);
          if (process.env.NODE_ENV === "development") {
            recordWasmMetric(
              "aiBoundsBuildTime",
              performance.now() - aiBuildStart,
            );
          }
        }

        renderer.setContentNode({
          renderSkia(canvas, bounds) {
            renderNode(ck, canvas, tree, bounds, fontMgr);
          },
        });
      }

      const selectionData = buildSelectionRenderData(
        cameraX,
        cameraY,
        cameraZoom,
        treeBoundsMap,
        dragStateRef,
        pageFramesRef.current,
      );

      // Phase 3: 히트테스트 캐시를 renderFrame 상위 레벨에서 빌드 (overlay renderSkia 콜백 이전)
      if (showWorkflowOverlay) {
        const frames = pageFramesRef.current ?? [];
        const pfMap = buildPageFrameMap(frames);
        pageFrameMapRef.current = pfMap;
        workflowElementBoundsMap =
          buildElementBoundsMapFromTreeBounds(treeBoundsMap);

        if (workflowEdgesRef.current.length > 0) {
          const { workflowStraightEdges } = useStore.getState();
          // 버전 기반 캐싱: edges/pagePos/straightEdges 변경 시에만 재계산
          const cacheKey = `${workflowEdgesVersionRef.current}:${pagePosVersion}:${workflowStraightEdges}`;
          if (cacheKey !== edgeGeometryCacheKeyRef.current) {
            edgeGeometryCacheRef.current = buildEdgeGeometryCache(
              workflowEdgesRef.current,
              pfMap,
              workflowElementBoundsMap,
              workflowStraightEdges,
            );
            edgeGeometryCacheKeyRef.current = cacheKey;
          }
        } else {
          edgeGeometryCacheRef.current = [];
          edgeGeometryCacheKeyRef.current = "";
        }
      }

      renderer.setOverlayNode({
        renderSkia(canvas) {
          if (hasAIEffects && nodeBoundsMap) {
            const now = performance.now();
            renderGeneratingEffects(
              ck,
              canvas,
              now,
              currentAiState.generatingNodes,
              nodeBoundsMap,
            );
            renderFlashes(
              ck,
              canvas,
              now,
              currentAiState.flashAnimations,
              nodeBoundsMap,
            );
            if (currentAiState.flashAnimations.size > 0) {
              currentAiState.cleanupExpiredFlashes(now);
            }
          }

          const frames = pageFramesRef.current ?? [];
          if (frames.length > 0) {
            const state = useStore.getState();
            const pageTitleItems = buildPageTitleRenderItems(
              frames,
              state.currentPageId,
              state.selectedElementIds.length > 0,
            );
            for (const item of pageTitleItems) {
              canvas.save();
              canvas.translate(item.x, item.y);
              renderPageTitle(
                ck,
                canvas,
                item.title,
                cameraZoom,
                fontMgr,
                item.highlighted,
                item.elementCount,
              );
              canvas.restore();
            }
          }

          // Workflow 오버레이 렌더링 (서브 토글 기반)
          if (showWorkflowOverlay) {
            // pageFrameMap/edgeGeometryCache는 renderFrame 상위 레벨에서 이미 빌드됨
            const pageFrameMap = pageFrameMapRef.current;
            const elBoundsMap = workflowElementBoundsMap ?? new Map();

            // 서브 토글 상태 읽기
            const wfState = useStore.getState();
            const showNav = wfState.showWorkflowNavigation;
            const showEvents = wfState.showWorkflowEvents;
            const showDS = wfState.showWorkflowDataSources;
            const showLG = wfState.showWorkflowLayoutGroups;

            // Phase 3: highlightState 구성
            const hoveredEdgeId = workflowHoverStateRef.current.hoveredEdgeId;
            const focusedPageId = wfState.workflowFocusedPageId;
            const highlightState = buildWorkflowHighlightState(
              hoveredEdgeId,
              focusedPageId,
              workflowEdgesRef.current,
            );

            // Phase 3: 포커스/호버 연결 페이지 프레임 하이라이트 (엣지 아래에 렌더)
            if (highlightState && focusedPageId) {
              const connectedPageIds = collectHighlightedWorkflowPageIds(
                focusedPageId,
                highlightState,
                workflowEdgesRef.current,
              );
              renderPageFrameHighlight(
                ck,
                canvas,
                connectedPageIds,
                pageFrameMap,
                cameraZoom,
                [0x3b / 255, 0x82 / 255, 0xf6 / 255], // blue-500
                0.8,
              );
            }

            // Layout 그룹 (엣지/선 아래에 그려지도록 먼저 렌더)
            if (showLG && layoutGroupsRef.current.length > 0) {
              renderLayoutGroups(
                ck,
                canvas,
                layoutGroupsRef.current,
                pageFrameMap,
                cameraZoom,
                fontMgr,
              );
            }

            // Navigation/Event 엣지 (서브 토글로 필터)
            if (
              workflowEdgesRef.current.length > 0 &&
              (showNav || showEvents)
            ) {
              const filteredEdges = filterRenderableWorkflowEdges(
                workflowEdgesRef.current,
                showNav,
                showEvents,
              );
              if (filteredEdges.length > 0) {
                const straightEdges = useStore.getState().workflowStraightEdges;
                renderWorkflowEdges(
                  ck,
                  canvas,
                  filteredEdges,
                  pageFrameMap,
                  cameraZoom,
                  fontMgr,
                  elBoundsMap,
                  highlightState,
                  straightEdges,
                );
              }
            }

            // 데이터 소스 엣지
            if (showDS && dataSourceEdgesRef.current.length > 0) {
              renderDataSourceEdges(
                ck,
                canvas,
                dataSourceEdgesRef.current,
                pageFrameMap,
                elBoundsMap,
                cameraZoom,
                fontMgr,
              );
            }
          }

          // Phase 4: editingContext 경계 표시
          const editingContextId = useStore.getState().editingContextId;
          if (editingContextId && treeBoundsMap.has(editingContextId)) {
            const contextBounds = treeBoundsMap.get(editingContextId)!;
            renderEditingContextBorder(ck, canvas, contextBounds, cameraZoom);
          }

          // Phase 4: 호버 하이라이트 — Selection Box 아래, Handles 아래에 렌더링
          const {
            hoveredElementId: hoveredCtxId,
            hoveredLeafIds,
            isGroupHover,
          } = elementHoverStateRef.current;
          const hoverTargets = buildHoverHighlightTargets(
            treeBoundsMap,
            hoveredCtxId,
            hoveredLeafIds,
            isGroupHover,
          );
          for (const target of hoverTargets) {
            renderHoverHighlight(
              ck,
              canvas,
              target.bounds,
              cameraZoom,
              target.dashed,
            );
          }

          if (selectionData.bounds) {
            renderSelectionBox(ck, canvas, selectionData.bounds, cameraZoom);
            if (selectionData.showHandles) {
              renderTransformHandles(
                ck,
                canvas,
                selectionData.bounds,
                cameraZoom,
              );
            }
            renderDimensionLabels(
              ck,
              canvas,
              selectionData.bounds,
              cameraZoom,
              fontMgr,
            );
          }
          if (selectionData.lasso) {
            renderLasso(ck, canvas, selectionData.lasso, cameraZoom);
          }

          // Phase 4: 미니맵 (최상위 레이어, 스크린 고정) — 캔버스 이동 시에만 표시
          if (
            shouldRenderWorkflowMinimap(
              showWorkflowOverlay,
              minimapVisibleRef.current,
              pageFrameMapRef.current.size,
            )
          ) {
            const mmScreenW = skiaCanvas.width / dpr;
            const mmScreenH = skiaCanvas.height / dpr;
            minimapConfigRef.current = buildMinimapConfig(mmScreenW, mmScreenH);

            renderWorkflowMinimap(
              ck,
              canvas,
              buildMinimapRenderData(
                pageFrameMapRef.current,
                workflowEdgesRef.current,
                useStore.getState().workflowFocusedPageId,
                buildMinimapViewportBounds(
                  cameraX,
                  cameraY,
                  cameraZoom,
                  mmScreenW,
                  mmScreenH,
                ),
              ),
              minimapConfigRef.current,
              { zoom: cameraZoom, panX: cameraX, panY: cameraY },
              { width: mmScreenW, height: mmScreenH },
              cameraZoom,
            );
          }
        },
      });

      // Grid 렌더링 (씬 좌표계, 카메라 변환은 SkiaRenderer에서 적용)
      const { showGrid: gridVisible, gridSize: currentGridSz } =
        useStore.getState();
      renderer.setScreenOverlayNode(
        gridVisible
          ? {
              renderSkia(canvas, cullingBounds) {
                renderGrid(
                  ck,
                  canvas,
                  buildGridRenderInput(
                    cullingBounds,
                    currentGridSz,
                    cameraZoom,
                  ),
                );
              },
            }
          : null,
      );

      // 씬-로컬 좌표계에서의 가시 영역 (컬링용)
      const screenW = skiaCanvas.width / dpr;
      const screenH = skiaCanvas.height / dpr;
      const cullingBounds = new DOMRect(
        -cameraX / cameraZoom,
        -cameraY / cameraZoom,
        screenW / cameraZoom,
        screenH / cameraZoom,
      );

      // Phase 6: 이중 Surface 캐싱 — SkiaRenderer가 classifyFrame()으로 최적 경로 결정
      // idle: 변경 없음 → 렌더링 스킵
      // content/full: renderContent() + blitToMain()
      // pagePosVersion을 합산하여 페이지 위치 변경 시 content layer 재렌더 트리거
      renderer.render(
        cullingBounds,
        registryVersion,
        camera,
        overlayVersionRef.current,
      );
    };

    app.ticker.add(renderFrame, undefined, -50); // UTILITY: after Application.render()

    // WebGL 컨텍스트 손실 감시
    const unwatchContext = watchContextLoss(
      skiaCanvas,
      () => {
        // 손실 시: 렌더링 중단 (Surface가 무효화됨)
        contextLostRef.current = true;
      },
      () => {
        // 복원 시: Surface 재생성
        contextLostRef.current = false;
        if (rendererRef.current && canvasRef.current) {
          rendererRef.current.resize(canvasRef.current);
          // 복원 직후 1-frame stale/잔상 방지: 즉시 클리어 + 컨텐츠 무효화
          rendererRef.current.invalidateContent();
          rendererRef.current.clearFrame();
        }
      },
    );

    return () => {
      themeObserver.disconnect();
      darkModeQuery.removeEventListener("change", syncBgColor);
      unwatchContext();
      if (minimapFadeTimerRef.current)
        clearTimeout(minimapFadeTimerRef.current);
      app.ticker.remove(renderFrame);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [ready, isActive, app, containerEl, backgroundColor, dragStateRef]);

  // 🆕 Multi-page: 모든 페이지가 동시 마운트되므로 페이지 전환 시
  // 레지스트리/캐시 초기화 불필요. 선택 하이라이트 갱신만 수행.
  const prevPageIdRef = useRef(currentPageId);

  useEffect(() => {
    if (prevPageIdRef.current !== currentPageId) {
      prevPageIdRef.current = currentPageId;
      rendererRef.current?.invalidateContent();
    }
  }, [currentPageId]);

  // 이미지 로딩 완료 시 Canvas 재렌더 트리거
  // specShapeConverter에서 loadSkImage()를 호출하면 이미지가 비동기로 로딩되고,
  // 로딩 완료 시 이 콜백이 실행되어 SkiaRenderer에 재렌더를 요청한다.
  useEffect(() => {
    if (!ready || !isActive) return;

    const unregister = registerImageLoadCallback(() => {
      rendererRef.current?.invalidateContent();
      // 이미지 로드 완료 시 레이아웃도 재계산 (fit-content/auto 사이징용)
      useStore.getState().invalidateLayout();
    });

    return unregister;
  }, [ready, isActive]);

  // 리사이즈 대응 (디바운싱 150ms — surface 재생성은 비용이 크므로)
  useEffect(() => {
    if (!ready || !isActive || !canvasRef.current) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !canvasRef.current) return;

      if (resizeTimer) clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        if (!canvasRef.current) return;

        const dpr = window.devicePixelRatio || 1;
        const { width, height } = entry.contentRect;
        canvasRef.current.width = Math.floor(width * dpr);
        canvasRef.current.height = Math.floor(height * dpr);
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        if (rendererRef.current) {
          rendererRef.current.resize(canvasRef.current);
          // resize 직후 stale snapshot/present 방지
          rendererRef.current.invalidateContent();
          rendererRef.current.clearFrame();
        }
      }, 150);
    });

    observer.observe(containerEl);

    // DPR 변경 감지 (외부 모니터 이동 시)
    let dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handleDprChange = () => {
      if (!canvasRef.current || !rendererRef.current) return;

      const newDpr = window.devicePixelRatio || 1;
      const rect = containerEl.getBoundingClientRect();
      canvasRef.current.width = Math.floor(rect.width * newDpr);
      canvasRef.current.height = Math.floor(rect.height * newDpr);

      rendererRef.current.resize(canvasRef.current);
      rendererRef.current.invalidateContent();
      rendererRef.current.clearFrame();

      // 다음 DPR 변화도 감지할 수 있도록 query를 갱신한다.
      dprQuery.removeEventListener("change", handleDprChange);
      dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", handleDprChange);
    };
    dprQuery.addEventListener("change", handleDprChange);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
      dprQuery.removeEventListener("change", handleDprChange);
    };
  }, [ready, isActive, containerEl]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
        pointerEvents: "none", // PixiJS 캔버스(z-index:3)가 이벤트 처리
      }}
    />
  );
}
