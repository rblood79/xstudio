/**
 * CanvasKit/Skia 렌더 루프
 *
 * Pencil §10.9.3 렌더 루프를 xstudio에 적용한다.
 * 매 프레임마다 씬 트리의 renderSkia()를 재귀 호출하고
 * GPU Surface에 결과를 제출한다.
 *
 * @see docs/WASM.md §5.10 SkiaRenderer 렌더 루프
 */

import type { CanvasKit, Canvas, Surface } from 'canvaskit-wasm';
import type { SkiaRenderable } from './types';
import { createGPUSurface } from './createSurface';
import { recordWasmMetric } from '../utils/gpuProfilerCore';

export class SkiaRenderer {
  private ck: CanvasKit;
  private surface: Surface;
  private canvas: Canvas;
  private rootNode: SkiaRenderable | null = null;
  private backgroundColor: Float32Array;
  private disposed = false;
  private dpr: number;

  constructor(
    ck: CanvasKit,
    htmlCanvas: HTMLCanvasElement,
    backgroundColor?: Float32Array,
    dpr?: number,
  ) {
    this.ck = ck;
    this.dpr = dpr ?? (window.devicePixelRatio || 1);
    this.surface = createGPUSurface(ck, htmlCanvas);
    this.canvas = this.surface.getCanvas();
    this.backgroundColor = backgroundColor ?? ck.Color4f(1, 1, 1, 1);
  }

  /** 렌더링할 루트 노드를 설정한다. */
  setRootNode(node: SkiaRenderable): void {
    this.rootNode = node;
  }

  /** 배경색을 변경한다. */
  setBackgroundColor(color: Float32Array): void {
    this.backgroundColor = color;
  }

  /**
   * 한 프레임을 렌더링한다.
   *
   * 1. 캔버스 초기화 (배경색)
   * 2. 루트 노드부터 renderSkia() 재귀 호출
   * 3. GPU Surface flush
   */
  render(cullingBounds: DOMRect): void {
    if (this.disposed || !this.rootNode) return;

    const start = performance.now();

    // 1. 캔버스 초기화
    this.canvas.clear(this.backgroundColor);

    // 2. DPR 스케일링 적용
    // CanvasKit surface는 물리 픽셀(canvas.width/height) 크기로 생성되므로
    // CSS 픽셀 좌표로 그리려면 DPR 배율을 적용해야 한다.
    this.canvas.save();
    this.canvas.scale(this.dpr, this.dpr);

    // 3. 씬 트리 렌더링
    this.rootNode.renderSkia(this.canvas, cullingBounds);

    // 4. DPR 스케일링 복원
    this.canvas.restore();

    // 5. GPU 제출
    this.surface.flush();

    // 프레임 시간 기록
    recordWasmMetric('skiaFrameTime', performance.now() - start);
  }

  /**
   * Surface를 새 크기로 재생성한다.
   *
   * 윈도우 리사이즈, DPR 변경 시 호출.
   * ⚠️ 호출 전에 htmlCanvas.width/height를 디바이스 픽셀 크기로 설정할 것.
   */
  resize(htmlCanvas: HTMLCanvasElement): void {
    if (this.disposed) return;

    this.surface.delete();
    this.surface = createGPUSurface(this.ck, htmlCanvas);
    this.canvas = this.surface.getCanvas();
  }

  /** 내부 Canvas 인스턴스 (직접 그리기용) */
  getCanvas(): Canvas {
    return this.canvas;
  }

  /** 내부 Surface 인스턴스 */
  getSurface(): Surface {
    return this.surface;
  }

  /** 모든 리소스 해제 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.surface.delete();
  }
}
