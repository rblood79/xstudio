/**
 * CanvasKit 캔버스 오버레이 컴포넌트
 *
 * PixiJS Application 위에 CanvasKit `<canvas>`를 오버레이한다.
 * 전역 레지스트리에서 Skia 렌더 데이터를 읽어 CanvasKit으로 렌더링하고,
 * DOM 이벤트를 PixiJS 캔버스로 브리징한다.
 *
 * @see docs/WASM.md §5.7 BuilderCanvas 통합
 */

import { useEffect, useRef, useState } from 'react';
import type { Application, Container } from 'pixi.js';
import { SkiaRenderer } from './SkiaRenderer';
import { bridgeEvents } from './eventBridge';
import { getSkiaNode } from './useSkiaNode';
import { renderNode } from './nodeRenderers';
import type { SkiaNodeData } from './nodeRenderers';
import { isCanvasKitInitialized, getCanvasKit } from './initCanvasKit';
import { initAllWasm } from '../wasm-bindings/init';
import { getRenderMode } from '../wasm-bindings/featureFlags';
import { skiaFontManager } from './fontManager';

interface SkiaOverlayProps {
  /** 부모 컨테이너 DOM 요소 */
  containerEl: HTMLDivElement;
  /** 배경색 (hex) */
  backgroundColor?: number;
  /** PixiJS Application 인스턴스 */
  app: Application;
}

/**
 * PixiJS 씬 그래프 순회 + 레지스트리 조회로 Skia 렌더 트리를 구성한다.
 *
 * PixiJS Container의 label이 elementId 형식(UUID)인 노드를 탐색하고,
 * 레지스트리에서 해당 elementId의 SkiaNodeData를 조회한다.
 * Container의 worldTransform에서 위치를 추출하여 올바른 좌표에 렌더링한다.
 */
function buildSkiaTreeFromRegistry(root: Container): SkiaNodeData | null {
  const children: SkiaNodeData[] = [];

  function traverse(container: Container): void {
    // label이 있으면 레지스트리에서 조회
    if (container.label) {
      const nodeData = getSkiaNode(container.label);
      if (nodeData) {
        // PixiJS 월드 변환에서 절대 좌표 추출
        const wt = container.worldTransform;
        children.push({
          ...nodeData,
          x: wt.tx,
          y: wt.ty,
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

/**
 * CanvasKit 오버레이.
 *
 * - z-index: 2 (위) — CanvasKit GPU 렌더링
 * - PixiJS canvas: z-index: 1 (아래) — 씬 그래프/이벤트
 */
export function SkiaOverlay({ containerEl, backgroundColor = 0xf8fafc, app }: SkiaOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SkiaRenderer | null>(null);
  const [ready, setReady] = useState(false);

  const renderMode = getRenderMode();
  const isActive = renderMode === 'skia' || renderMode === 'hybrid';

  // CanvasKit 초기화
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    initAllWasm().then(() => {
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

    // 이벤트 브리징
    const cleanupBridge = bridgeEvents(skiaCanvas, pixiCanvas);

    // PixiJS 자체 렌더링 비활성화 (skia 모드)
    if (renderMode === 'skia') {
      pixiCanvas.style.visibility = 'hidden';
      pixiCanvas.style.pointerEvents = 'none';
    }

    // 렌더 루프: PixiJS ticker에 통합
    const renderFrame = () => {
      if (!rendererRef.current) return;

      // 레지스트리 기반 Skia 렌더 트리 구성
      const stage = app.stage;
      const tree = buildSkiaTreeFromRegistry(stage);

      if (tree) {
        const cullingBounds = new DOMRect(
          0,
          0,
          skiaCanvas.width / dpr,
          skiaCanvas.height / dpr,
        );

        renderer.setRootNode({
          renderSkia(canvas, bounds) {
            const fontMgr = skiaFontManager.getFamilies().length > 0
              ? skiaFontManager.getFontMgr()
              : undefined;
            renderNode(ck, canvas, tree, bounds, fontMgr);
          },
        });

        renderer.render(cullingBounds);
      }
    };

    app.ticker.add(renderFrame);

    return () => {
      app.ticker.remove(renderFrame);
      cleanupBridge();
      renderer.dispose();
      rendererRef.current = null;

      if (renderMode === 'skia') {
        pixiCanvas.style.visibility = '';
        pixiCanvas.style.pointerEvents = '';
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
        pointerEvents: 'auto',
      }}
    />
  );
}
