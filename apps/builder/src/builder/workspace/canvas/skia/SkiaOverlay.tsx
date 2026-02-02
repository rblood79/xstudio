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
 * @see docs/WASM.md §5.7, §6.1, §6.2
 */

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Application, Container } from 'pixi.js';
import { SkiaRenderer } from './SkiaRenderer';
import { getSkiaNode, getRegistryVersion, flushDirtyRects } from './useSkiaNode';
import { renderNode } from './nodeRenderers';
import type { SkiaNodeData } from './nodeRenderers';
import { isCanvasKitInitialized, getCanvasKit } from './initCanvasKit';
import { initAllWasm } from '../wasm-bindings/init';
import { getRenderMode } from '../wasm-bindings/featureFlags';
import { skiaFontManager } from './fontManager';
import { useAIVisualFeedbackStore } from '../../../stores/aiVisualFeedback';
import { buildNodeBoundsMap, renderGeneratingEffects, renderFlashes } from './aiEffects';
import { renderSelectionBox, renderTransformHandles, renderLasso } from './selectionRenderer';
import type { LassoRenderData } from './selectionRenderer';
import { useStore } from '../../../stores';
import { getElementBoundsSimple } from '../elementRegistry';
import { calculateCombinedBounds } from '../selection/types';
import type { BoundingBox, DragState } from '../selection/types';

interface SkiaOverlayProps {
  /** 부모 컨테이너 DOM 요소 */
  containerEl: HTMLDivElement;
  /** 배경색 (hex) */
  backgroundColor?: number;
  /** PixiJS Application 인스턴스 */
  app: Application;
  /** 드래그 상태 Ref (라쏘 렌더링용) */
  dragStateRef?: RefObject<DragState | null>;
}

/**
 * Camera 컨테이너를 찾아 줌/팬 상태를 추출한다.
 */
function findCameraContainer(stage: Container): Container | null {
  for (const child of stage.children) {
    if ((child as Container).label === 'Camera') return child as Container;
  }
  return null;
}

/**
 * PixiJS 씬 그래프 순회 + 레지스트리 조회로 Skia 렌더 트리를 구성한다.
 *
 * PixiJS Container의 label이 elementId 형식(UUID)인 노드를 탐색하고,
 * 레지스트리에서 해당 elementId의 SkiaNodeData를 조회한다.
 * Container의 worldTransform에서 카메라 변환을 제거하여 씬-로컬 좌표로 변환한다.
 *
 * @param root - 탐색 시작 컨테이너 (app.stage)
 * @param cameraX - Camera 컨테이너 X (panOffset.x)
 * @param cameraY - Camera 컨테이너 Y (panOffset.y)
 * @param cameraZoom - Camera 스케일 (줌 레벨)
 */
function buildSkiaTreeFromRegistry(
  root: Container,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
): SkiaNodeData | null {
  const children: SkiaNodeData[] = [];

  function traverse(container: Container): void {
    // label이 있으면 레지스트리에서 조회
    if (container.label) {
      const nodeData = getSkiaNode(container.label);
      if (nodeData) {
        // PixiJS 월드 변환에서 카메라 변환을 제거하여 씬-로컬 좌표 추출
        const wt = container.worldTransform;
        const localX = (wt.tx - cameraX) / cameraZoom;
        const localY = (wt.ty - cameraY) / cameraZoom;

        // PixiJS 컨테이너의 실제 크기 사용 (Yoga 레이아웃 결과)
        // CSS style에 명시적 width/height가 없는 요소(Button 등)는
        // nodeData에 기본값(100x100)이 들어있으므로 컨테이너 크기로 덮어쓴다.
        const actualWidth = container.width > 0 ? container.width : nodeData.width;
        const actualHeight = container.height > 0 ? container.height : nodeData.height;

        // text children의 크기/정렬도 실제 컨테이너 크기에 맞춰 갱신
        // (ElementSprite의 useMemo 시점에는 style 기본값만 사용 가능하므로)
        const updatedChildren = nodeData.children?.map((child: SkiaNodeData) => {
          if (child.type === 'text' && child.text) {
            const fontSize = child.text.fontSize || 14;
            const lineHeight = fontSize * 1.2;
            return {
              ...child,
              width: actualWidth,
              height: actualHeight,
              text: {
                ...child.text,
                maxWidth: actualWidth,
                paddingTop: Math.max(0, (actualHeight - lineHeight) / 2),
              },
            };
          }
          return child;
        });

        children.push({
          ...nodeData,
          elementId: container.label, // G.3: AI 이펙트 타겟팅용
          x: localX,
          y: localY,
          width: actualWidth,
          height: actualHeight,
          children: updatedChildren,
        });
        return; // 리프 노드 — 자식 탐색 불필요
      }
    }

    // 컨테이너: 자식 재귀
    for (const child of container.children) {
      if ('children' in child) {
        traverse(child as Container);
      }
    }
  }

  traverse(root);

  if (children.length === 0) return null;

  return {
    type: 'container',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: true,
    children,
  };
}

/** Selection 렌더 데이터 결과 */
interface SelectionRenderResult {
  bounds: BoundingBox | null;
  showHandles: boolean;
  lasso: LassoRenderData | null;
}

/**
 * Selection 렌더 데이터를 Zustand 스토어에서 수집한다.
 *
 * 매 프레임 getState()로 읽기 (React 구독 없음).
 * 글로벌 좌표를 씬-로컬 좌표로 변환하여 반환.
 */
function buildSelectionRenderData(
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  dragStateRef?: RefObject<DragState | null>,
): SelectionRenderResult {
  const state = useStore.getState();
  const selectedIds = state.selectedElementIds;

  let selectionBounds: BoundingBox | null = null;
  let showHandles = false;

  if (selectedIds.length > 0) {
    const currentPageId = state.currentPageId;
    const boxes: BoundingBox[] = [];

    for (const id of selectedIds) {
      const el = state.elementsMap.get(id);
      if (!el || el.page_id !== currentPageId) continue;

      const globalBounds = getElementBoundsSimple(id);
      if (globalBounds) {
        // 글로벌 → 씬-로컬 좌표 변환
        boxes.push({
          x: (globalBounds.x - cameraX) / cameraZoom,
          y: (globalBounds.y - cameraY) / cameraZoom,
          width: globalBounds.width / cameraZoom,
          height: globalBounds.height / cameraZoom,
        });
      }
    }

    selectionBounds = calculateCombinedBounds(boxes);
    showHandles = selectedIds.length === 1;
  }

  // 라쏘 상태
  let lasso: LassoRenderData | null = null;
  const dragState = dragStateRef?.current;
  if (
    dragState?.isDragging &&
    dragState.operation === 'lasso' &&
    dragState.startPosition &&
    dragState.currentPosition
  ) {
    const sx = dragState.startPosition.x;
    const sy = dragState.startPosition.y;
    const cx = dragState.currentPosition.x;
    const cy = dragState.currentPosition.y;
    lasso = {
      x: Math.min(sx, cx),
      y: Math.min(sy, cy),
      width: Math.abs(cx - sx),
      height: Math.abs(cy - sy),
    };
  }

  return { bounds: selectionBounds, showHandles, lasso };
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
export function SkiaOverlay({ containerEl, backgroundColor = 0xf8fafc, app, dragStateRef }: SkiaOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const [ready, setReady] = useState(false);

  const renderMode = getRenderMode();
  // hybrid 모드: Skia 텍스트 렌더링 미구현 상태에서 Skia 오버레이가
  // PixiJS 콘텐츠(버튼 텍스트 등)를 가리므로 비활성화.
  // skia 모드에서만 Skia 오버레이 활성화.
  const isActive = renderMode === 'skia';

  // CanvasKit + 폰트 초기화
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    initAllWasm().then(async () => {
      if (cancelled) return;

      // 기본 폰트 로드 (텍스트 렌더링에 필수)
      if (skiaFontManager.getFamilies().length === 0) {
        try {
          // Vite asset import로 woff2 URL 획득
          const fontModule = await import(
            'pretendard/dist/web/static/woff2/Pretendard-Regular.woff2?url'
          );
          await skiaFontManager.loadFont('Pretendard', fontModule.default);
        } catch (e) {
          console.warn('[SkiaOverlay] 폰트 로드 실패, CDN 폴백 시도:', e);
          try {
            await skiaFontManager.loadFont(
              'Pretendard',
              'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/woff2/Pretendard-Regular.woff2',
            );
          } catch (e2) {
            console.error('[SkiaOverlay] 폰트 로드 최종 실패:', e2);
          }
        }
      }

      if (cancelled) return;
      setReady(true);
    }).catch((err) => {
      console.error('[SkiaOverlay] WASM 초기화 실패:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  // CanvasKit Surface 생성 + 이벤트 브리징
  useEffect(() => {
    if (!ready || !isActive || !canvasRef.current) return;
    if (!isCanvasKitInitialized()) return;

    const ck = getCanvasKit();
    const skiaCanvas = canvasRef.current;
    const pixiCanvas = app.canvas as HTMLCanvasElement;

    // DPR 적용
    const dpr = window.devicePixelRatio || 1;
    const rect = containerEl.getBoundingClientRect();
    skiaCanvas.width = Math.floor(rect.width * dpr);
    skiaCanvas.height = Math.floor(rect.height * dpr);
    skiaCanvas.style.width = `${rect.width}px`;
    skiaCanvas.style.height = `${rect.height}px`;

    // 배경색 변환 (hex → Float32Array)
    const r = ((backgroundColor >> 16) & 0xff) / 255;
    const g = ((backgroundColor >> 8) & 0xff) / 255;
    const b = (backgroundColor & 0xff) / 255;
    const bgColor = ck.Color4f(r, g, b, 1);

    // SkiaRenderer 생성 (DPR 전달)
    const renderer = new SkiaRenderer(ck, skiaCanvas, bgColor, dpr);
    rendererRef.current = renderer;

    // Pencil 방식: PixiJS는 이벤트 처리 전용 (시각적 렌더링 없음)
    // Skia가 디자인 + AI 이펙트 + Selection 오버레이를 모두 렌더링
    if (renderMode === 'skia') {
      // PixiJS 배경을 투명하게 → 시각적 렌더링 없음
      app.renderer.background.alpha = 0;
      // PixiJS 캔버스를 Skia 위에 배치 (이벤트 처리 전용)
      pixiCanvas.style.zIndex = '3';
    }

    // 렌더 루프: PixiJS ticker에 통합
    const renderFrame = () => {
      if (!rendererRef.current) return;

      const stage = app.stage;

      // 카메라 상태 추출 (줌/팬)
      const cameraContainer = findCameraContainer(stage);

      // Pencil 방식: Camera 하위 레이어를 시각적으로 숨기되 이벤트는 유지
      // ⚠️ renderable=false는 PixiJS 8의 _interactivePrune()에서
      //    hit testing까지 비활성화하므로 사용 금지.
      //    alpha=0으로 시각적으로만 숨겨 이벤트 처리를 유지한다.
      if (renderMode === 'skia' && cameraContainer) {
        for (const child of cameraContainer.children) {
          const c = child as Container;
          if (c.label) {
            c.alpha = 0;
          }
        }
      }
      const cameraX = cameraContainer?.x ?? 0;
      const cameraY = cameraContainer?.y ?? 0;
      const cameraZoom = Math.max(cameraContainer?.scale?.x ?? 1, 0.001);

      // 매 프레임 트리 재구성 (씬-로컬 좌표로 변환)
      // registryVersion 기반 idle 프레임 스킵은 useEffect/rAF 타이밍 차이로
      // 스타일 변경을 놓칠 수 있어, 매 프레임 렌더링으로 안정성을 우선한다.
      const tree = buildSkiaTreeFromRegistry(stage, cameraX, cameraY, cameraZoom);
      if (!tree) return;

      // 씬-로컬 좌표계에서의 가시 영역 (컬링용)
      const screenW = skiaCanvas.width / dpr;
      const screenH = skiaCanvas.height / dpr;
      const cullingBounds = new DOMRect(
        -cameraX / cameraZoom,
        -cameraY / cameraZoom,
        screenW / cameraZoom,
        screenH / cameraZoom,
      );

      renderer.setRootNode({
        renderSkia(canvas, bounds) {
          const fontMgr = skiaFontManager.getFamilies().length > 0
            ? skiaFontManager.getFontMgr()
            : undefined;

          // 카메라 변환 적용 (팬 + 줌)
          canvas.save();
          canvas.translate(cameraX, cameraY);
          canvas.scale(cameraZoom, cameraZoom);

          // Phase 1: 디자인 노드 렌더링 (씬-로컬 좌표)
          renderNode(ck, canvas, tree, bounds, fontMgr);

          // Phase 2-3: G.3 AI 시각 피드백 (카메라 좌표계 내에서 렌더링)
          const aiState = useAIVisualFeedbackStore.getState();
          const hasAIEffects =
            aiState.generatingNodes.size > 0 || aiState.flashAnimations.size > 0;

          if (hasAIEffects) {
            const now = performance.now();
            if (aiState.flashAnimations.size > 0) {
              aiState.cleanupExpiredFlashes(now);
            }
            const nodeBoundsMap = buildNodeBoundsMap(tree, aiState);
            renderGeneratingEffects(ck, canvas, now, aiState.generatingNodes, nodeBoundsMap);
            renderFlashes(ck, canvas, now, aiState.flashAnimations, nodeBoundsMap);
          }

          // Phase 4-6: Selection 오버레이 (Pencil 방식 — Skia에서 직접 렌더링)
          const selectionData = buildSelectionRenderData(cameraX, cameraY, cameraZoom, dragStateRef);
          if (selectionData.bounds) {
            renderSelectionBox(ck, canvas, selectionData.bounds, cameraZoom);
            if (selectionData.showHandles) {
              renderTransformHandles(ck, canvas, selectionData.bounds, cameraZoom);
            }
          }
          if (selectionData.lasso) {
            renderLasso(ck, canvas, selectionData.lasso, cameraZoom);
          }

          canvas.restore();
        },
      });

      // Phase 6: 이중 Surface 캐싱 활성화 — registryVersion/camera/dirtyRects 전달
      const registryVersion = getRegistryVersion();
      const dirtyRects = flushDirtyRects();
      const camera = { zoom: cameraZoom, panX: cameraX, panY: cameraY };
      renderer.render(cullingBounds, registryVersion, camera, dirtyRects);
    };

    app.ticker.add(renderFrame);

    return () => {
      app.ticker.remove(renderFrame);
      renderer.dispose();
      rendererRef.current = null;

      if (renderMode === 'skia') {
        // PixiJS 상태 복원
        app.renderer.background.alpha = 1;
        pixiCanvas.style.zIndex = '';

        // 디자인 레이어 렌더링 복원
        const camera = findCameraContainer(app.stage);
        if (camera) {
          for (const child of camera.children) {
            (child as Container).alpha = 1;
          }
        }
      }
    };
  }, [ready, isActive, app, containerEl, backgroundColor, renderMode]);

  // 리사이즈 대응
  useEffect(() => {
    if (!ready || !isActive || !canvasRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !canvasRef.current) return;

      const dpr = window.devicePixelRatio || 1;
      const { width, height } = entry.contentRect;
      canvasRef.current.width = Math.floor(width * dpr);
      canvasRef.current.height = Math.floor(height * dpr);
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      if (rendererRef.current) {
        rendererRef.current.resize(canvasRef.current);
      }
    });

    observer.observe(containerEl);

    return () => observer.disconnect();
  }, [ready, isActive, containerEl]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none', // PixiJS 캔버스(z-index:3)가 이벤트 처리
      }}
    />
  );
}
