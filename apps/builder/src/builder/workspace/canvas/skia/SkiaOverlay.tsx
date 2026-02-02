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
import { getSkiaNode, getRegistryVersion, flushDirtyRects, clearSkiaRegistry } from './useSkiaNode';
import { renderNode } from './nodeRenderers';
import type { SkiaNodeData } from './nodeRenderers';
import { isCanvasKitInitialized, getCanvasKit } from './initCanvasKit';
import { initAllWasm } from '../wasm-bindings/init';
import { skiaFontManager } from './fontManager';
import { useAIVisualFeedbackStore } from '../../../stores/aiVisualFeedback';
import { buildNodeBoundsMap, renderGeneratingEffects, renderFlashes } from './aiEffects';
import { renderSelectionBox, renderTransformHandles, renderLasso } from './selectionRenderer';
import type { LassoRenderData } from './selectionRenderer';
import { useStore } from '../../../stores';
import { getElementBoundsSimple } from '../elementRegistry';
import { calculateCombinedBounds } from '../selection/types';
import type { BoundingBox, DragState } from '../selection/types';
import { watchContextLoss } from './createSurface';
import { clearImageCache } from './imageCache';

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
 * text children의 크기/정렬을 실제 컨테이너 크기에 맞춰 갱신한다.
 * (ElementSprite의 useMemo 시점에는 style 기본값만 사용 가능하므로)
 */
function updateTextChildren(
  children: SkiaNodeData[] | undefined,
  parentWidth: number,
  parentHeight: number,
): SkiaNodeData[] | undefined {
  return children?.map((child: SkiaNodeData) => {
    if (child.type === 'text' && child.text) {
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

// 트리 rebuild 캐시 — registry/camera 미변경 시 재사용하여 GC 압력 저감 (I-H6→M)
let _cachedTree: SkiaNodeData | null = null;
let _cachedVersion = -1;
let _cachedCamX = NaN;
let _cachedCamY = NaN;
let _cachedCamZoom = NaN;

function buildSkiaTreeHierarchical(
  cameraContainer: Container,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
): SkiaNodeData | null {
  const currentVersion = getRegistryVersion();
  if (
    _cachedTree &&
    currentVersion === _cachedVersion &&
    cameraX === _cachedCamX &&
    cameraY === _cachedCamY &&
    cameraZoom === _cachedCamZoom
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
  function traverse(container: Container, parentAbsX: number, parentAbsY: number): SkiaNodeData[] {
    const results: SkiaNodeData[] = [];

    for (const child of container.children) {
      if (!('children' in child)) continue;
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

          // PixiJS 컨테이너의 실제 크기 사용 (Yoga 레이아웃 결과)
          const actualWidth = c.width > 0 ? c.width : nodeData.width;
          const actualHeight = c.height > 0 ? c.height : nodeData.height;

          // 내부 자식 (text 등) 크기 갱신
          const updatedInternalChildren = updateTextChildren(
            nodeData.children, actualWidth, actualHeight,
          );

          // 하위 element 자식 재귀 (이 노드의 절대 좌표를 부모로 전달)
          const elementChildren = traverse(c, absX, absY);

          results.push({
            ...nodeData,
            elementId: c.label, // G.3: AI 이펙트 타겟팅용
            x: relX,            // 부모 labeled 노드 기준 상대 좌표
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
    _cachedVersion = currentVersion;
    _cachedCamX = cameraX;
    _cachedCamY = cameraY;
    _cachedCamZoom = cameraZoom;
    return null;
  }

  const result: SkiaNodeData = {
    type: 'container',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: true,
    children,
  };

  _cachedTree = result;
  _cachedVersion = currentVersion;
  _cachedCamX = cameraX;
  _cachedCamY = cameraY;
  _cachedCamZoom = cameraZoom;

  return result;
}

/** Selection 렌더 데이터 결과 */
interface SelectionRenderResult {
  bounds: BoundingBox | null;
  showHandles: boolean;
  lasso: LassoRenderData | null;
}

/**
 * Skia 렌더 트리에서 각 element의 씬-로컬 절대 바운드를 추출한다.
 *
 * 계층 트리에서 부모 오프셋을 누적하여 절대 좌표를 복원한다.
 * 컨텐츠 렌더링과 동일한 좌표 소스(worldTransform 기반)를 사용하므로
 * Selection 오버레이와 컨텐츠가 항상 동기화된다.
 */
function buildTreeBoundsMap(tree: SkiaNodeData): Map<string, BoundingBox> {
  const boundsMap = new Map<string, BoundingBox>();

  function traverse(node: SkiaNodeData, parentX: number, parentY: number): void {
    const absX = parentX + node.x;
    const absY = parentY + node.y;

    if (node.elementId) {
      boundsMap.set(node.elementId, {
        x: absX,
        y: absY,
        width: node.width,
        height: node.height,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, absX, absY);
      }
    }
  }

  traverse(tree, 0, 0);
  return boundsMap;
}

/**
 * Selection 렌더 데이터를 수집한다.
 *
 * Skia 트리의 절대 바운드를 사용하여 컨텐츠 렌더링과 동일한 좌표 소스를 참조한다.
 * 이전 방식(elementRegistry/하드코딩 좌표)은 팬 시 worldTransform 타이밍 불일치로
 * Selection이 컨텐츠와 분리되는 문제가 있었다.
 */
function buildSelectionRenderData(
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  treeBoundsMap: Map<string, BoundingBox>,
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

      // Skia 트리에서 바운드 조회 (컨텐츠 렌더링과 동일한 worldTransform 기반 좌표)
      // tree bounds는 이미 씬-로컬 좌표이므로 zoom 보정 불필요
      const treeBounds = treeBoundsMap.get(id);
      if (treeBounds) {
        boxes.push({
          x: treeBounds.x,
          y: treeBounds.y,
          width: treeBounds.width,
          height: treeBounds.height,
        });
        continue;
      }

      // 트리에 없는 요소는 elementRegistry 폴백
      const globalBounds = getElementBoundsSimple(id);
      if (globalBounds) {
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
  const contextLostRef = useRef(false);

  // Phase 6: Selection/AI 상태 변경 감지용 ref (idle 프레임 스킵 방지)
  const overlayVersionRef = useRef(0);
  const lastSelectedIdsRef = useRef<string[]>([]);
  const lastSelectedIdRef = useRef<string | null>(null);
  const lastAIActiveRef = useRef(0);

  const isActive = true;

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
    app.renderer.background.alpha = 0;
    pixiCanvas.style.zIndex = '3';

    // Camera 하위 레이어 alpha=0 설정 (PixiJS 렌더링 전에 실행)
    // ⚠️ renderable=false는 PixiJS 8의 _interactivePrune()에서
    //    hit testing까지 비활성화하므로 사용 금지.
    //    alpha=0으로 시각적으로만 숨겨 이벤트 처리를 유지한다.
    // HIGH priority (25): Application.render() (LOW=-25) 전에 실행하여
    // PixiJS 렌더링 시 Camera 자식이 이미 숨겨진 상태 보장.
    const syncPixiVisibility = () => {
      const cameraContainer = findCameraContainer(app.stage);
      if (cameraContainer) {
        for (const child of cameraContainer.children) {
          const c = child as Container;
          if (c.label) {
            c.alpha = 0;
          }
        }
      }
    };

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

      // 매 프레임 계층적 Skia 트리 재구성
      // worldTransform 기반이지만, 부모-자식 간 상대 좌표로 변환하여
      // 팬/줌 중에도 부모-자식 상대 위치가 항상 정확하다.
      const tree = cameraContainer
        ? buildSkiaTreeHierarchical(cameraContainer, cameraX, cameraY, cameraZoom)
        : null;
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
            const nodeBoundsMap = buildNodeBoundsMap(tree, aiState);
            renderGeneratingEffects(ck, canvas, now, aiState.generatingNodes, nodeBoundsMap);
            renderFlashes(ck, canvas, now, aiState.flashAnimations, nodeBoundsMap);
            // 만료된 flash를 렌더링 이후에 정리하여 마지막 프레임이 누락되지 않도록 한다.
            if (aiState.flashAnimations.size > 0) {
              aiState.cleanupExpiredFlashes(now);
            }
          }

          // Phase 4-6: Selection 오버레이 (Pencil 방식 — Skia에서 직접 렌더링)
          // Skia 트리의 절대 바운드를 추출하여 Selection이 컨텐츠와 동일한 좌표 소스를 참조
          const treeBoundsMap = buildTreeBoundsMap(tree);
          const selectionData = buildSelectionRenderData(cameraX, cameraY, cameraZoom, treeBoundsMap, dragStateRef);
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
      // Selection/AI 상태 변경도 re-render 트리거에 포함
      const registryVersion = getRegistryVersion();
      const dirtyRects = flushDirtyRects();
      const camera = { zoom: cameraZoom, panX: cameraX, panY: cameraY };

      // Selection 상태 변경 감지 — selectedElementIds 참조 변경 시 version 증가
      const currentSelectedIds = useStore.getState().selectedElementIds;
      const currentSelectedId = useStore.getState().selectedElementId;
      if (currentSelectedIds !== lastSelectedIdsRef.current ||
          currentSelectedId !== lastSelectedIdRef.current) {
        overlayVersionRef.current++;
        lastSelectedIdsRef.current = currentSelectedIds;
        lastSelectedIdRef.current = currentSelectedId;
      }

      // AI 상태 변경 감지
      // AI 이펙트가 활성 상태(generating/flash)면 매 프레임 version 증가하여
      // 애니메이션이 idle 분류로 멈추는 것을 방지한다.
      const aiState = useAIVisualFeedbackStore.getState();
      const currentAIActive = aiState.generatingNodes.size + aiState.flashAnimations.size;
      if (currentAIActive > 0) {
        // 활성 애니메이션 → 매 프레임 강제 리렌더
        overlayVersionRef.current++;
      } else if (currentAIActive !== lastAIActiveRef.current) {
        // 비활성 전환 시에도 1회 리렌더 (클린업)
        overlayVersionRef.current++;
      }
      lastAIActiveRef.current = currentAIActive;

      // registryVersion + overlayVersion을 합산하여 모든 시각 변경을 감지
      const effectiveVersion = registryVersion + overlayVersionRef.current;
      renderer.render(cullingBounds, effectiveVersion, camera, dirtyRects);
    };

    app.ticker.add(syncPixiVisibility, undefined, 25);  // HIGH: before Application.render()
    app.ticker.add(renderFrame, undefined, -50);          // UTILITY: after Application.render()

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
        }
      },
    );

    return () => {
      unwatchContext();
      app.ticker.remove(syncPixiVisibility);
      app.ticker.remove(renderFrame);
      renderer.dispose();
      rendererRef.current = null;

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
    };
  }, [ready, isActive, app, containerEl, backgroundColor]);

  // 페이지 전환 시 Skia 레지스트리 + 이미지 캐시 초기화
  // 개별 Sprite unmount의 useEffect cleanup보다 선행하여
  // stale 노드가 전환 프레임에 렌더링되는 것을 방지한다.
  const currentPageId = useStore((s) => s.currentPageId);
  const prevPageIdRef = useRef(currentPageId);

  useEffect(() => {
    if (prevPageIdRef.current !== currentPageId) {
      prevPageIdRef.current = currentPageId;
      clearSkiaRegistry();
      clearImageCache();
    }
  }, [currentPageId]);

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
        }
      }, 150);
    });

    observer.observe(containerEl);

    // DPR 변경 감지 (외부 모니터 이동 시)
    const dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handleDprChange = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      const newDpr = window.devicePixelRatio || 1;
      const rect = containerEl.getBoundingClientRect();
      canvasRef.current.width = Math.floor(rect.width * newDpr);
      canvasRef.current.height = Math.floor(rect.height * newDpr);
      rendererRef.current.resize(canvasRef.current);
    };
    dprQuery.addEventListener('change', handleDprChange);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
      dprQuery.removeEventListener('change', handleDprChange);
    };
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
