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
import { getRegistryVersion, notifyLayoutChange } from "./useSkiaNode";
// renderNode → skiaFramePipeline.ts로 이동 (ADR-035 Phase 4)
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
  computeWorkflowEdges,
  computeDataSourceEdges,
  computeLayoutGroups,
  type WorkflowEdge,
  type DataSourceEdge,
  type LayoutGroup,
} from "./workflowEdges";
import { recordInvalidation } from "./renderInvalidation";
import {
  readCssBgColor,
  hexToColor4fChannels,
  setupThemeWatcher,
} from "./themeWatcher";
import {
  setPagePosStaleFrames,
  tickPagePosStaleFrames,
} from "./skiaTreeBuilder";
import { buildFrameContent } from "./skiaFramePipeline";
import { type PageFrame, type ElementBounds } from "./workflowRenderer";
import { type CachedEdgeGeometry } from "./workflowHitTest";
import {
  useWorkflowInteraction,
  type WorkflowHoverState,
} from "../hooks/useWorkflowInteraction";
import {
  useElementHoverInteraction,
  type ElementHoverState,
} from "../hooks/useElementHoverInteraction";
import { useScrollWheelInteraction } from "../hooks/useScrollWheelInteraction";
import { DEFAULT_MINIMAP_CONFIG, type MinimapConfig } from "./workflowMinimap";
import { useStore } from "../../../stores";
import { useLayoutsStore } from "../../../stores/layouts";
import type { BoundingBox, DragState } from "../selection/types";
import { watchContextLoss } from "./createSurface";
import { flushWasmMetrics, recordWasmMetric } from "../utils/gpuProfilerCore";
import { buildGridRenderInput } from "./skiaOverlayHelpers";
import { buildSelectionRenderData } from "./skiaWorkflowSelection";
import {
  buildWorkflowOverlayData,
  buildFrameCaches,
  buildOverlayNode,
} from "./skiaOverlayBuilder";

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

// readCssBgColor → themeWatcher.ts로 추출 (ADR-035 Phase 6)

/**
 * Camera 컨테이너를 찾아 줌/팬 상태를 추출한다.
 */
function findCameraContainer(stage: Container): Container | null {
  for (const child of stage.children) {
    if ((child as Container).label === "Camera") return child as Container;
  }
  return null;
}

// updateTextChildren → skiaTreeBuilder.ts로 추출 (ADR-035 Phase 4)

// buildSkiaTreeHierarchical + getCachedTreeBoundsMap → skiaTreeBuilder.ts로 추출 (ADR-035 Phase 4)

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
      recordInvalidation("overlay", "pageFrames");
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

    // 빌더 테마 변경 시 배경색 동기화 (ADR-035 Phase 6: themeWatcher 서비스)
    const themeWatcherHandle = setupThemeWatcher(containerEl, {
      onThemeChange: (hex) => {
        const [rv, gv, bv] = hexToColor4fChannels(hex);
        renderer.setBackgroundColor(ck.Color4f(rv, gv, bv, 1));
        renderer.invalidateContent();
        recordInvalidation("theme", "builderThemeChange");
      },
    });

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
          recordInvalidation("overlay", "minimapShow");
        }
        // 이동 중에는 타이머 리셋
        if (minimapFadeTimerRef.current)
          clearTimeout(minimapFadeTimerRef.current);
        minimapFadeTimerRef.current = setTimeout(() => {
          minimapVisibleRef.current = false;
          overlayVersionRef.current++;
          recordInvalidation("overlay", "minimapHide");
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
        recordInvalidation("overlay", "selection");
        lastSelectedIdsRef.current = currentSelectedIds;
        lastSelectedIdRef.current = currentSelectedId;
      }

      // editingContext 변경 감지
      const currentEditingContext = useStore.getState().editingContextId;
      if (currentEditingContext !== lastEditingContextRef.current) {
        overlayVersionRef.current++;
        recordInvalidation("overlay", "editingContext");
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
          recordInvalidation("overlay", "aiGenerating");
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
            recordInvalidation("overlay", "aiFlash");
          }
        }
      } else if (currentAIActive !== lastAIActiveRef.current) {
        // 비활성 전환 시에도 1회 리렌더 (클린업)
        overlayVersionRef.current++;
        recordInvalidation("overlay", "aiCleanup");
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
        recordInvalidation("overlay", "grid");
        lastShowGridRef.current = currentShowGrid;
        lastGridSizeRef.current = currentGridSize;
      }

      // 드래그 중(라쏘/리사이즈/이동)에는 매 프레임 오버레이 갱신
      const dragState = dragStateRef?.current;
      if (dragState?.isDragging) {
        overlayVersionRef.current++;
        recordInvalidation("overlay", "drag");
      }

      // Workflow 오버레이 상태 감지 및 엣지 계산
      const showWorkflowOverlay = useStore.getState().showWorkflowOverlay;
      if (showWorkflowOverlay !== lastShowWorkflowRef.current) {
        lastShowWorkflowRef.current = showWorkflowOverlay;
        overlayVersionRef.current++;
        recordInvalidation("workflow", "toggleOverlay");
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
          recordInvalidation("workflow", "subToggles");
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
          recordInvalidation("workflow", "edgesRecalc");
        }

        // Phase 3: hover/focus 변경 감지 → overlayVersion++
        const hoveredEdgeId = workflowHoverStateRef.current.hoveredEdgeId;
        if (hoveredEdgeId !== lastHoveredEdgeRef.current) {
          lastHoveredEdgeRef.current = hoveredEdgeId;
          overlayVersionRef.current++;
          recordInvalidation("workflow", "hoverEdge");
        }
        const focusedPageId = storeState.workflowFocusedPageId;
        if (focusedPageId !== lastFocusedPageRef.current) {
          lastFocusedPageRef.current = focusedPageId;
          overlayVersionRef.current++;
          recordInvalidation("workflow", "focusedPage");
        }
      }

      const camera = { zoom: cameraZoom, panX: cameraX, panY: cameraY };

      // 🚀 페이지 위치 변경 감지 — content 무효화 (registryVersion 합산 해킹 제거)
      if (pagePosVersion !== lastPagePosVersionRef.current) {
        lastPagePosVersionRef.current = pagePosVersion;
        renderer.invalidateContent();
        recordInvalidation("viewport", "pagePosition");
        // pagePositionsVersion 변경 직후에는 React 리렌더가 아직 PixiJS 컨테이너의
        // x/y props를 갱신하지 않아 worldTransform이 stale하다.
        // 3프레임간 캐시를 강제 무효화하여 올바른 좌표로 트리가 재빌드되도록 한다.
        setPagePosStaleFrames(3);
      }

      // pagePositionsVersion 변경 후 과도기 프레임: 캐시 무효화하여 stale 트리 방지
      if (tickPagePosStaleFrames()) {
        renderer.invalidateContent();
      }

      const fontMgr =
        skiaFontManager.getFamilies().length > 0
          ? skiaFontManager.getFontMgr()
          : undefined;

      // ── ADR-035 Phase 4: Frame Content Build (skiaFramePipeline.ts) ──
      const contentResult = buildFrameContent({
        registryVersion,
        pagePosVersion,
        cameraContainer,
        cameraX,
        cameraY,
        cameraZoom,
        ck,
        fontMgr,
      });

      if (!contentResult) {
        renderer.clearFrame();
        renderer.invalidateContent();
        return;
      }

      const { treeBoundsMap, nodeBoundsMap, hasAIEffects, contentNode } =
        contentResult;
      treeBoundsMapRef.current = treeBoundsMap;
      renderer.setContentNode(contentNode);

      const selectionData = buildSelectionRenderData(
        cameraX,
        cameraY,
        cameraZoom,
        treeBoundsMap,
        dragStateRef,
        pageFramesRef.current,
      );

      // ── ADR-035 Phase 4: Workflow data + frame caches (skiaOverlayBuilder.ts) ──
      let workflowElementBoundsMap: Map<string, ElementBounds> | null = null;
      if (showWorkflowOverlay) {
        const wfData = buildWorkflowOverlayData(
          treeBoundsMap,
          pageFramesRef.current ?? [],
        );
        pageFrameMapRef.current = wfData.pageFrameMap;
        workflowElementBoundsMap = wfData.workflowElementBoundsMap;

        const { workflowStraightEdges } = useStore.getState();
        const cacheResult = buildFrameCaches(
          workflowEdgesRef.current,
          wfData.pageFrameMap,
          workflowElementBoundsMap,
          workflowEdgesVersionRef.current,
          pagePosVersion,
          workflowStraightEdges,
          edgeGeometryCacheKeyRef.current,
          edgeGeometryCacheRef.current,
        );
        edgeGeometryCacheRef.current = cacheResult.edgeGeometryCache;
        edgeGeometryCacheKeyRef.current = cacheResult.edgeGeometryCacheKey;
      }

      // ── ADR-035 Phase 4: Overlay node (skiaOverlayBuilder.ts) ──
      renderer.setOverlayNode(
        buildOverlayNode({
          ck,
          fontMgr,
          treeBoundsMap,
          cameraX,
          cameraY,
          cameraZoom,
          hasAIEffects,
          nodeBoundsMap,
          selectionData,
          showWorkflowOverlay,
          workflowEdges: workflowEdgesRef.current,
          dataSourceEdges: dataSourceEdgesRef.current,
          layoutGroups: layoutGroupsRef.current,
          pageFrameMap: pageFrameMapRef.current,
          workflowElementBoundsMap,
          workflowHoveredEdgeId: workflowHoverStateRef.current.hoveredEdgeId,
          elementHoverState: elementHoverStateRef.current,
          pageFrames: pageFramesRef.current,
          minimapVisible: minimapVisibleRef.current,
          minimapConfig: minimapConfigRef.current,
          skiaCanvasWidth: skiaCanvas.width,
          skiaCanvasHeight: skiaCanvas.height,
          dpr,
        }),
      );

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
          recordInvalidation("resource", "contextRestored");
        }
      },
    );

    return () => {
      themeWatcherHandle.disconnect();
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
      recordInvalidation("content", "pageSwitch");
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
      recordInvalidation("resource", "imageLoaded");
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
          recordInvalidation("content", "containerResize");
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
      recordInvalidation("resource", "dprChange");

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
