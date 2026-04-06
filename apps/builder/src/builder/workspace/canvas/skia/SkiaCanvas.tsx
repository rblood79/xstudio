/**
 * SkiaCanvas — SceneGraph 기반 독립 Skia 렌더러 (ADR-100 Phase 2.6)
 *
 * PixiJS Application 없이 동작하는 단독 캔버스 컴포넌트.
 * - 자체 requestAnimationFrame 루프
 * - Camera 클래스로 viewport 제어
 * - 기존 빌드 파이프라인(buildSkiaFrameContent, buildFrameRenderPlan) 재사용
 * - Feature flag: USE_SCENE_GRAPH
 *
 * SkiaOverlay와 동일한 렌더링 결과를 산출하되,
 * PixiJS ticker/Container/EventBoundary에 대한 의존성을 완전히 제거한다.
 */

import { useEffect, useRef, useState } from "react";
import type { Application as PixiApplication } from "pixi.js";
import { SkiaRenderer } from "./SkiaRenderer";
import { getRegistryVersion, notifyLayoutChange } from "./useSkiaNode";
import { isCanvasKitInitialized, getCanvasKit } from "./initCanvasKit";
import { initAllWasm } from "../wasm-bindings/init";
import { skiaFontManager } from "./fontManager";
import {
  loadAllCustomFontsToSkia,
  loadGoogleFontsToSkia,
  syncCustomFontsWithSkia,
} from "../../../fonts/loadCustomFontsToSkia";
import { registerImageLoadCallback } from "./imageCache";
import type {
  RendererInvalidationPacket,
  SkiaRendererInput,
} from "../renderers";
import type { DropIndicatorSnapshot } from "../selection/dropTargetResolver";
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
import { tickAnimations, getInterpolatedOffsets } from "./dragAnimator";
import { setDragSiblingOffsets } from "./nodeRendererTree";
import { buildSkiaFrameContent } from "./skiaFramePipeline";
import { type PageFrame } from "./workflowRenderer";
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
import type { BoundingBox } from "../selection/types";
import { watchContextLoss } from "./createSurface";
import { flushWasmMetrics, recordWasmMetric } from "../utils/gpuProfilerCore";
import {
  createFrameInputSnapshot,
  buildFrameRenderPlan,
} from "./skiaFramePlan";
import { Camera } from "../viewport/Camera";
import { viewportState as mutableViewport } from "../viewport/viewportState";
import { StoreRenderBridge } from "./StoreRenderBridge";
import { getSharedLayoutMap } from "../layout/engines/fullTreeLayout";
import { useStore } from "../../../stores";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SkiaCanvasProps {
  /** 부모 컨테이너 DOM 요소 */
  containerEl: HTMLDivElement;
  /** 배경색 (hex) */
  backgroundColor?: number;
  /** PixiJS Application (Camera Container 읽기용, 과도기) */
  app?: PixiApplication;
  /** Layout 무효화 콜백 */
  invalidateLayout: () => void;
  /** 프레임별 무효화 패킷 */
  invalidationPacket: RendererInvalidationPacket;
  /** 렌더러 입력 (store 스냅샷) */
  rendererInput: SkiaRendererInput;
  /** 드롭 인디케이터 스냅샷 ref */
  dropIndicatorSnapshotRef?: React.MutableRefObject<DropIndicatorSnapshot | null>;
  /** 외부 Camera 인스턴스 (미지정 시 내부 생성) */
  camera?: Camera;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SceneGraph 기반 Skia 단독 렌더러.
 *
 * PixiJS 없이 동작:
 * - z-index: 2 — CanvasKit 캔버스 (디자인 + 오버레이)
 * - 자체 RAF 루프 (PixiJS ticker 불필요)
 * - Camera 클래스로 viewport 상태 관리
 * - Command Stream 경로 전용 (sharedLayoutMap 필수)
 */
export function SkiaCanvas({
  containerEl,
  backgroundColor = 0xf3f4f6,
  app,
  invalidateLayout,
  invalidationPacket,
  rendererInput,
  dropIndicatorSnapshotRef,
  camera: externalCamera,
}: SkiaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const contextLostRef = useRef(false);
  const _cameraRef = useRef<Camera>(externalCamera ?? new Camera());

  // Phase 6: Selection/AI 상태 변경 감지용 ref
  const overlayVersionRef = useRef(0);
  const lastSelectionSignatureRef = useRef("");
  const lastAIActiveRef = useRef(0);
  const _lastPageFramesSignatureRef = useRef("");
  const allPageFramesRef = useRef(
    rendererInput.sceneSnapshot.document.allPageFrames,
  );
  const visiblePageFramesRef = useRef(
    rendererInput.sceneSnapshot.document.visiblePageFrames,
  );
  const documentPageFrameVersionRef = useRef(
    rendererInput.sceneSnapshot.document.allPageFrameVersion,
  );
  const lastVisibleContentVersionRef = useRef(
    rendererInput.sceneSnapshot.document.visibleContentVersion,
  );
  const lastVisiblePagePositionVersionRef = useRef(
    rendererInput.sceneSnapshot.document.visiblePagePositionVersion,
  );

  // Workflow/hover 캐시
  const invalidationPacketRef = useRef(invalidationPacket);
  const rendererInputRef = useRef(rendererInput);
  const lastWorkflowOverlaySignatureRef = useRef("");
  const lastWorkflowGraphSignatureRef = useRef("");
  const lastWfSubTogglesRef = useRef("");

  // 호버 상태
  const elementHoverStateRef = useRef<ElementHoverState>({
    hoveredElementId: null,
    hoveredLeafIds: [],
    isGroupHover: false,
  });
  const lastEditingContextRef = useRef<string | null>(null);
  const treeBoundsMapRef = useRef<Map<string, BoundingBox>>(new Map());

  // Workflow
  const workflowHoverStateRef = useRef<WorkflowHoverState>({
    hoveredEdgeId: null,
  });
  const edgeGeometryCacheRef = useRef<CachedEdgeGeometry[]>([]);
  const edgeGeometryCacheKeyRef = useRef("");
  const pageFrameMapRef = useRef<Map<string, PageFrame>>(new Map());
  const lastHoveredEdgeRef = useRef<string | null>(null);
  const lastFocusedPageRef = useRef<string | null>(null);

  // Grid
  const lastGridSignatureRef = useRef("");

  // Minimap
  const minimapConfigRef = useRef<MinimapConfig>(DEFAULT_MINIMAP_CONFIG);
  const minimapVisibleRef = useRef(false);
  const minimapFadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastMinimapCameraRef = useRef({ x: 0, y: 0, zoom: 1 });

  // Dev metrics
  const devRegistryWindowStartMs = useRef(0);
  const devRegistryWindowStartVersion = useRef(0);

  // ---------- Ref 갱신 ----------

  useEffect(() => {
    allPageFramesRef.current =
      rendererInput.sceneSnapshot.document.allPageFrames;
    visiblePageFramesRef.current =
      rendererInput.sceneSnapshot.document.visiblePageFrames;
    rendererInputRef.current = rendererInput;
    documentPageFrameVersionRef.current =
      rendererInput.sceneSnapshot.document.allPageFrameVersion;
  }, [rendererInput]);

  useEffect(() => {
    invalidationPacketRef.current = invalidationPacket;
  }, [invalidationPacket]);

  // ---------- StoreRenderBridge (Phase 6) ----------
  // PixiJS Application이 없을 때 store에서 직접 skiaNodeRegistry를 채운다.

  useEffect(() => {
    if (app) return; // PixiJS가 있으면 기존 Sprite 경로 사용
    const bridge = new StoreRenderBridge();
    bridge.connect({
      getElements: () => useStore.getState().elementsMap,
      getLayoutMap: () => getSharedLayoutMap(),
      getChildrenMap: () => useStore.getState().childrenMap,
      // 선택적 구독: elementsMap/childrenMap 변경만 감지
      // selectedElementId, currentPageId 등 무관한 변경은 fullSync 미트리거
      subscribe: (cb) =>
        useStore.subscribe(
          (state) => ({
            elementsMap: state.elementsMap,
            childrenMap: state.childrenMap,
          }),
          (curr, prev) => {
            if (
              curr.elementsMap !== prev.elementsMap ||
              curr.childrenMap !== prev.childrenMap
            ) {
              cb();
            }
          },
          { equalityFn: Object.is },
        ),
      theme: "light",
    });

    return () => bridge.dispose();
  }, [app]);

  // Camera ↔ viewport 동기화는 viewportState 뮤터블 ref로 대체 (Phase 5.4)
  // ViewportController.notifyUpdateListeners()가 viewportState를 동기 갱신
  // SkiaCanvas RAF에서 mutableViewport.x/y/zoom으로 직접 읽기

  // ---------- 인터랙션 훅 ----------

  useWorkflowInteraction({
    containerEl,
    edgeGeometryCacheRef,
    pageFrameMapRef,
    hoverStateRef: workflowHoverStateRef,
    overlayVersionRef,
    minimapConfigRef,
  });

  useElementHoverInteraction({
    containerEl,
    hoverStateRef: elementHoverStateRef,
    overlayVersionRef,
    treeBoundsMapRef,
  });

  useScrollWheelInteraction({
    containerEl,
    treeBoundsMapRef,
  });

  // ---------- WASM + Font 초기화 ----------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initAllWasm();
        if (cancelled) return;

        getCanvasKit(); // CanvasKit 초기화 확인
        // 기본 폰트 로딩
        await loadAllCustomFontsToSkia();
        await loadGoogleFontsToSkia();
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("[SkiaCanvas] WASM/Font 초기화 실패:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 동적 폰트 동기화
  useEffect(() => {
    if (!ready) return;

    const handleCustomFontsUpdated = async () => {
      try {
        await syncCustomFontsWithSkia();
        notifyLayoutChange();
        invalidateLayout();
        window.dispatchEvent(new CustomEvent("xstudio:fonts-ready"));
      } catch (e) {
        console.warn("[SkiaCanvas] 동적 커스텀 폰트 동기화 실패:", e);
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
  }, [ready, invalidateLayout]);

  // ---------- Surface + RAF 렌더 루프 ----------

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
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

    // 배경색
    const resolvedBg = readCssBgColor(containerEl) ?? backgroundColor;
    const r = ((resolvedBg >> 16) & 0xff) / 255;
    const g = ((resolvedBg >> 8) & 0xff) / 255;
    const b = (resolvedBg & 0xff) / 255;
    const bgColor = ck.Color4f(r, g, b, 1);

    const renderer = new SkiaRenderer(ck, skiaCanvas, bgColor, dpr);
    rendererRef.current = renderer;

    // 테마 변경 동기화
    const themeWatcherHandle = setupThemeWatcher(containerEl, {
      onThemeChange: (hex) => {
        const [rv, gv, bv] = hexToColor4fChannels(hex);
        renderer.setBackgroundColor(ck.Color4f(rv, gv, bv, 1));
        renderer.invalidateContent();
        recordInvalidation("theme", "builderThemeChange");
      },
    });

    // ----- RAF 렌더 루프 (PixiJS ticker 대체) -----
    let rafId = 0;
    let running = true;

    const renderFrame = () => {
      if (!running) return;
      rafId = requestAnimationFrame(renderFrame);

      if (!rendererRef.current) return;
      if (contextLostRef.current) return;

      // Camera 상태 — ViewportController 뮤터블 ref에서 직접 읽기 (zero-latency)
      const cameraX = mutableViewport.x;
      const cameraY = mutableViewport.y;
      const cameraZoom = Math.max(mutableViewport.zoom, 0.001);

      const registryVersion = getRegistryVersion();
      const packet = invalidationPacketRef.current;
      const currentRendererInput = rendererInputRef.current;
      const sceneDocument = currentRendererInput.sceneSnapshot.document;
      const contentPagePositionVersion =
        sceneDocument.visiblePagePositionVersion;
      const documentPageFrameVersion = documentPageFrameVersionRef.current;

      // 미니맵 가시성
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
        if (minimapFadeTimerRef.current)
          clearTimeout(minimapFadeTimerRef.current);
        minimapFadeTimerRef.current = setTimeout(() => {
          minimapVisibleRef.current = false;
          overlayVersionRef.current++;
          recordInvalidation("overlay", "minimapHide");
        }, 1500);
      }

      // Dev metrics
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
            flushWasmMetrics();
            devRegistryWindowStartMs.current = now;
            devRegistryWindowStartVersion.current = registryVersion;
          }
        }
      }

      // Selection 상태 변경 감지
      const currentSelectionSignature = packet.selection.selectionSignature;
      if (currentSelectionSignature !== lastSelectionSignatureRef.current) {
        overlayVersionRef.current++;
        recordInvalidation("overlay", "selection");
        lastSelectionSignatureRef.current = currentSelectionSignature;
      }

      // editingContext 변경 감지
      const currentEditingSignature = packet.selection.editingSignature;
      if (currentEditingSignature !== lastEditingContextRef.current) {
        overlayVersionRef.current++;
        recordInvalidation("overlay", "editingContext");
        lastEditingContextRef.current = currentEditingSignature;
      }

      // AI 상태 변경 감지
      const aiState = packet.ai;
      const currentAIActive =
        aiState.generatingNodes.size + aiState.flashAnimations.size;
      if (currentAIActive > 0) {
        const hasGenerating = aiState.generatingNodes.size > 0;
        if (hasGenerating) {
          overlayVersionRef.current++;
          recordInvalidation("overlay", "aiGenerating");
        } else {
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
        overlayVersionRef.current++;
        recordInvalidation("overlay", "aiCleanup");
      }
      lastAIActiveRef.current = currentAIActive;

      // Grid 상태
      const currentGridSignature = packet.grid.signature;
      if (currentGridSignature !== lastGridSignatureRef.current) {
        overlayVersionRef.current++;
        recordInvalidation("overlay", "grid");
        lastGridSignatureRef.current = currentGridSignature;
      }

      // 드래그 중 오버레이 갱신
      if (packet.dragActive) {
        overlayVersionRef.current++;
        recordInvalidation("overlay", "drag");
      }

      // Workflow 오버레이 상태
      const workflowOverlaySignature = packet.workflow.overlaySignature;
      if (
        workflowOverlaySignature !== lastWorkflowOverlaySignatureRef.current
      ) {
        lastWorkflowOverlaySignatureRef.current = workflowOverlaySignature;
        overlayVersionRef.current++;
        recordInvalidation("workflow", "toggleOverlay");
      }

      if (packet.workflow.showOverlay) {
        const subKey = packet.workflow.subToggleSignature;
        if (subKey !== lastWfSubTogglesRef.current) {
          lastWfSubTogglesRef.current = subKey;
          overlayVersionRef.current++;
          recordInvalidation("workflow", "subToggles");
        }

        const workflowGraphSignature = packet.workflow.graphSignature;
        if (workflowGraphSignature !== lastWorkflowGraphSignatureRef.current) {
          lastWorkflowGraphSignatureRef.current = workflowGraphSignature;
          overlayVersionRef.current++;
          recordInvalidation("workflow", "edgesRecalc");
        }

        const hoveredEdgeId = workflowHoverStateRef.current.hoveredEdgeId;
        if (hoveredEdgeId !== lastHoveredEdgeRef.current) {
          lastHoveredEdgeRef.current = hoveredEdgeId;
          overlayVersionRef.current++;
          recordInvalidation("workflow", "hoverEdge");
        }
        const focusedPageId = packet.workflow.focusedPageId;
        if (focusedPageId !== lastFocusedPageRef.current) {
          lastFocusedPageRef.current = focusedPageId;
          overlayVersionRef.current++;
          recordInvalidation("workflow", "focusedPage");
        }
      }

      const cameraState = {
        zoom: cameraZoom,
        panX: cameraX,
        panY: cameraY,
      };

      // Visible page 변경 → content 무효화
      if (
        sceneDocument.visibleContentVersion !==
        lastVisibleContentVersionRef.current
      ) {
        lastVisibleContentVersionRef.current =
          sceneDocument.visibleContentVersion;
        renderer.invalidateContent();
        recordInvalidation("content", "visiblePages");
      }

      if (
        sceneDocument.visiblePagePositionVersion !==
        lastVisiblePagePositionVersionRef.current
      ) {
        lastVisiblePagePositionVersionRef.current =
          sceneDocument.visiblePagePositionVersion;
        renderer.invalidateContent();
        recordInvalidation("viewport", "visiblePagePosition");
        setPagePosStaleFrames(3);
      }

      if (tickPagePosStaleFrames()) {
        renderer.invalidateContent();
      }

      const fontMgr =
        skiaFontManager.getFamilies().length > 0
          ? skiaFontManager.getFontMgr()
          : undefined;

      // Drag animation
      const dropIndicator = dropIndicatorSnapshotRef?.current ?? null;
      if (dropIndicator) {
        const stillAnimating = tickAnimations();
        const interpolated = getInterpolatedOffsets();
        setDragSiblingOffsets(interpolated.size > 0 ? interpolated : null);
        if (stillAnimating) {
          notifyLayoutChange();
        }
      }

      // Content build — Command Stream 경로 (cameraContainer: null → PixiJS 불필요)
      const contentResult = buildSkiaFrameContent({
        aiState: packet.ai,
        registryVersion,
        pagePosVersion: contentPagePositionVersion,
        cameraContainer: null, // SceneGraph 모드: PixiJS Container 불필요
        cameraX,
        cameraY,
        cameraZoom,
        ck,
        fontMgr,
        rendererInput: currentRendererInput,
      });

      if (!contentResult) {
        renderer.clearFrame();
        renderer.invalidateContent();
        return;
      }

      const { sharedScene, nodeBoundsMap, hasAIEffects, contentNode } =
        contentResult;
      const snapshot = createFrameInputSnapshot({
        registryVersion,
        pagePosVersion: documentPageFrameVersion,
        cameraX,
        cameraY,
        cameraZoom,
        overlayVersion: overlayVersionRef.current,
      });
      const framePlan = buildFrameRenderPlan({
        ck,
        elementsMap: currentRendererInput.elementsMap,
        fontMgr,
        invalidationPacket: packet,
        snapshot,
        sharedScene,
        nodeBoundsMap,
        hasAIEffects,
        contentNode,
        allPageFrames: allPageFramesRef.current,
        visiblePageFrames: visiblePageFramesRef.current,
        workflowHoverState: workflowHoverStateRef.current,
        elementHoverState: elementHoverStateRef.current,
        dropIndicatorState: dropIndicator,
        minimapVisible: minimapVisibleRef.current,
        minimapConfig: minimapConfigRef.current,
        skiaCanvasWidth: skiaCanvas.width,
        skiaCanvasHeight: skiaCanvas.height,
        dpr,
        prevEdgeGeometryCache: edgeGeometryCacheRef.current,
        prevEdgeGeometryCacheKey: edgeGeometryCacheKeyRef.current,
      });

      treeBoundsMapRef.current = framePlan.sharedScene.treeBoundsMap;
      renderer.setContentNode(framePlan.contentNode);
      renderer.setOverlayNode(framePlan.overlayNode);
      renderer.setScreenOverlayNode(framePlan.screenOverlayNode);

      if (framePlan.workflow) {
        pageFrameMapRef.current = framePlan.workflow.pageFrameMap;
        edgeGeometryCacheRef.current = framePlan.workflow.edgeGeometryCache;
        edgeGeometryCacheKeyRef.current =
          framePlan.workflow.edgeGeometryCacheKey;
      } else {
        pageFrameMapRef.current = new Map<string, PageFrame>();
        edgeGeometryCacheRef.current = [];
        edgeGeometryCacheKeyRef.current = "";
      }

      renderer.render(
        framePlan.cullingBounds,
        registryVersion,
        cameraState,
        overlayVersionRef.current,
      );
    };

    // RAF 시작
    rafId = requestAnimationFrame(renderFrame);

    // WebGL 컨텍스트 손실 감시
    const unwatchContext = watchContextLoss(
      skiaCanvas,
      () => {
        contextLostRef.current = true;
      },
      () => {
        contextLostRef.current = false;
        if (rendererRef.current && canvasRef.current) {
          rendererRef.current.resize(canvasRef.current);
          rendererRef.current.invalidateContent();
          rendererRef.current.clearFrame();
          recordInvalidation("resource", "contextRestored");
        }
      },
    );

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      themeWatcherHandle.disconnect();
      unwatchContext();
      if (minimapFadeTimerRef.current)
        clearTimeout(minimapFadeTimerRef.current);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [ready, containerEl, backgroundColor]);

  // 페이지 전환 시 오버레이 갱신
  const prevPageIdRef = useRef(
    rendererInput.sceneSnapshot.document.currentPageId,
  );

  useEffect(() => {
    const currentPageId = rendererInput.sceneSnapshot.document.currentPageId;
    if (prevPageIdRef.current !== currentPageId) {
      prevPageIdRef.current = currentPageId;
      overlayVersionRef.current++;
      recordInvalidation("overlay", "pageSwitch");
    }
  }, [rendererInput.sceneSnapshot.document.currentPageId]);

  // 이미지 로딩 완료 콜백
  useEffect(() => {
    if (!ready) return;

    const unregister = registerImageLoadCallback(() => {
      rendererRef.current?.invalidateContent();
      invalidateLayout();
      recordInvalidation("resource", "imageLoaded");
    });

    return unregister;
  }, [ready, invalidateLayout]);

  // 리사이즈 대응 (150ms 디바운스)
  useEffect(() => {
    if (!ready || !canvasRef.current) return;

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
          rendererRef.current.invalidateContent();
          rendererRef.current.clearFrame();
          recordInvalidation("content", "containerResize");
        }
      }, 150);
    });

    observer.observe(containerEl);

    // DPR 변경 감지
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
  }, [ready, containerEl]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="skia-canvas-unified"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
        // SkiaCanvas는 단독 렌더러이므로 이벤트도 수신
        // (PixiJS 없음 → pointerEvents를 'auto'로)
        pointerEvents: "auto",
      }}
    />
  );
}
