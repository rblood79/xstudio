/**
 * CanvasKit/Skia 렌더 루프
 *
 * Phase 5: 기본 렌더 루프 (단일 Surface)
 * Phase 6: 이중 Surface 캐싱 + Dirty Rect 렌더링
 *
 * 프레임 분류:
 * - idle: 변경 없음 → 렌더링 스킵 (0ms)
 * - camera-only: 줌/팬만 변경 → 캐시된 콘텐츠 블리팅 (< 2ms)
 * - content: 요소 변경 → dirty rect 부분 렌더링 후 블리팅
 * - full: 리사이즈/첫 프레임 → 전체 재렌더링
 *
 * @see docs/WASM.md §5.10, §6.1, §6.2
 */

import type { CanvasKit, Canvas, Surface, Image } from 'canvaskit-wasm';
import type { SkiaRenderable, FrameType, CameraState, DirtyRect } from './types';
import { createGPUSurface } from './createSurface';
import { recordWasmMetric } from '../utils/gpuProfilerCore';
import { mergeDirtyRects } from './dirtyRectTracker';
import { WASM_FLAGS } from '../wasm-bindings/featureFlags';

export class SkiaRenderer {
  private ck: CanvasKit;
  private rootNode: SkiaRenderable | null = null;
  private backgroundColor: Float32Array;
  private disposed = false;
  private dpr: number;

  // ============================================
  // Main Surface (화면 표시)
  // ============================================
  private mainSurface: Surface;
  private mainCanvas: Canvas;

  // ============================================
  // Content Surface (Phase 6: 오프스크린 캐시)
  // ============================================
  private contentSurface: Surface | null = null;
  private contentCanvas: Canvas | null = null;
  private contentSnapshot: Image | null = null;
  private contentDirty = true;
  private lastRegistryVersion = -1;
  private lastCamera: CameraState = { zoom: 1, panX: 0, panY: 0 };

  constructor(
    ck: CanvasKit,
    htmlCanvas: HTMLCanvasElement,
    backgroundColor?: Float32Array,
    dpr?: number,
  ) {
    this.ck = ck;
    this.dpr = dpr ?? (window.devicePixelRatio || 1);
    this.mainSurface = createGPUSurface(ck, htmlCanvas);
    this.mainCanvas = this.mainSurface.getCanvas();
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

  // ============================================
  // Phase 6: 이중 Surface 렌더링
  // ============================================

  /**
   * 프레임을 분류하여 최적 렌더 경로를 결정한다.
   */
  private classifyFrame(
    registryVersion: number,
    camera: CameraState,
  ): FrameType {
    if (this.contentDirty) return 'full';

    const registryChanged = registryVersion !== this.lastRegistryVersion;
    const cameraChanged =
      camera.zoom !== this.lastCamera.zoom ||
      camera.panX !== this.lastCamera.panX ||
      camera.panY !== this.lastCamera.panY;

    if (registryChanged) return 'content';
    if (cameraChanged) return 'camera-only';
    return 'idle';
  }

  /**
   * Content Surface를 초기화한다.
   * mainSurface와 동일한 크기의 오프스크린 래스터 Surface를 생성한다.
   *
   * CanvasKit.MakeSurface()로 CPU-backed surface를 생성한다.
   * makeImageSnapshot()으로 생성된 Image는 GPU canvas에 그릴 때
   * 자동으로 GPU 텍스처로 업로드되므로 블리팅 성능에 문제 없다.
   */
  private initContentSurface(): void {
    this.disposeContentSurface();

    const width = this.mainSurface.width();
    const height = this.mainSurface.height();

    this.contentSurface = this.ck.MakeSurface(width, height)!;
    if (!this.contentSurface) {
      console.warn('[SkiaRenderer] Content surface 생성 실패, 레거시 모드로 폴백');
      return;
    }
    this.contentCanvas = this.contentSurface.getCanvas();
    this.contentDirty = true;
  }

  /**
   * Content Surface에 씬을 렌더링한다.
   *
   * dirtyRects가 있으면 해당 영역만 clipRect로 잘라서 부분 렌더링.
   * 없으면 전체 렌더링.
   */
  private renderContent(
    cullingBounds: DOMRect,
    dirtyRects?: DirtyRect[],
  ): void {
    if (!this.contentCanvas || !this.contentSurface || !this.rootNode) return;

    const start = performance.now();

    if (!dirtyRects || dirtyRects.length === 0 || this.contentDirty) {
      // 전체 콘텐츠 렌더링
      this.contentCanvas.clear(this.backgroundColor);
      this.contentCanvas.save();
      this.contentCanvas.scale(this.dpr, this.dpr);
      this.rootNode.renderSkia(this.contentCanvas, cullingBounds);
      this.contentCanvas.restore();
    } else {
      // Dirty Rect 부분 렌더링
      const merged = mergeDirtyRects(dirtyRects);
      for (const rect of merged) {
        this.contentCanvas.save();
        this.contentCanvas.scale(this.dpr, this.dpr);

        // dirty 영역 클리핑
        const skRect = this.ck.LTRBRect(
          rect.x,
          rect.y,
          rect.x + rect.width,
          rect.y + rect.height,
        );
        this.contentCanvas.clipRect(
          skRect,
          this.ck.ClipOp.Intersect,
          false,
        );

        // dirty 영역 초기화 + 재렌더링
        this.contentCanvas.clear(this.backgroundColor);
        const dirtyBounds = new DOMRect(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );
        this.rootNode.renderSkia(this.contentCanvas, dirtyBounds);

        this.contentCanvas.restore();
      }
    }

    // 콘텐츠 스냅샷 생성 (이전 스냅샷 해제)
    this.contentSnapshot?.delete();
    this.contentSurface.flush();
    this.contentSnapshot = this.contentSurface.makeImageSnapshot();
    this.contentDirty = false;

    recordWasmMetric('skiaFrameTime', performance.now() - start);
  }

  /**
   * Content 스냅샷을 Main Surface에 블리팅한다.
   *
   * 현재 구현: 카메라 변환은 content 렌더링 시 worldTransform에 이미 포함되어 있으므로
   * 단순 1:1 복사만 수행한다.
   * 향후 씬 좌표 분리 시 카메라 변환을 blit 단계에서 적용하도록 확장 가능.
   */
  private blitToMain(): void {
    if (!this.contentSnapshot) return;

    this.mainCanvas.clear(this.backgroundColor);
    this.mainCanvas.drawImage(this.contentSnapshot, 0, 0);
    this.mainSurface.flush();
  }

  /**
   * 이중 Surface 모드로 한 프레임을 렌더링한다.
   *
   * 프레임 분류에 따라 최소 작업만 수행:
   * - idle → 스킵
   * - camera-only → blitToMain() 만
   * - content → renderContent(dirty) + blitToMain()
   * - full → renderContent(all) + blitToMain()
   */
  renderDualSurface(
    cullingBounds: DOMRect,
    registryVersion: number,
    camera: CameraState,
    dirtyRects?: DirtyRect[],
  ): void {
    if (this.disposed || !this.rootNode) return;

    // Lazy init content surface
    if (!this.contentSurface) {
      this.initContentSurface();
      // Content surface 실패 시 레거시 폴백
      if (!this.contentSurface) {
        this.renderLegacy(cullingBounds);
        return;
      }
    }

    const frameType = this.classifyFrame(registryVersion, camera);

    switch (frameType) {
      case 'idle':
        break;

      case 'camera-only':
        // 카메라 변경 시 content에 worldTransform이 포함되므로 전체 재렌더링 필요
        this.renderContent(cullingBounds);
        this.blitToMain();
        break;

      case 'content':
        this.renderContent(cullingBounds, dirtyRects);
        this.blitToMain();
        break;

      case 'full':
        this.renderContent(cullingBounds);
        this.blitToMain();
        break;
    }

    this.lastRegistryVersion = registryVersion;
    this.lastCamera = { ...camera };
  }

  // ============================================
  // Phase 5: 레거시 단일 Surface 렌더링
  // ============================================

  /**
   * 단일 Surface로 한 프레임을 렌더링한다 (Phase 5 레거시).
   *
   * DUAL_SURFACE_CACHE가 비활성화된 경우 또는 content surface 생성 실패 시 사용.
   */
  renderLegacy(cullingBounds: DOMRect): void {
    if (this.disposed || !this.rootNode) return;

    const start = performance.now();

    this.mainCanvas.clear(this.backgroundColor);
    this.mainCanvas.save();
    this.mainCanvas.scale(this.dpr, this.dpr);
    this.rootNode.renderSkia(this.mainCanvas, cullingBounds);
    this.mainCanvas.restore();
    this.mainSurface.flush();

    recordWasmMetric('skiaFrameTime', performance.now() - start);
  }

  /**
   * 통합 렌더 진입점.
   *
   * Feature Flag에 따라 이중 Surface 또는 레거시 모드를 선택한다.
   * SkiaOverlay에서 호출한다.
   */
  render(
    cullingBounds: DOMRect,
    registryVersion?: number,
    camera?: CameraState,
    dirtyRects?: DirtyRect[],
  ): void {
    if (
      WASM_FLAGS.DUAL_SURFACE_CACHE &&
      registryVersion !== undefined &&
      camera !== undefined
    ) {
      this.renderDualSurface(cullingBounds, registryVersion, camera, dirtyRects);
    } else {
      this.renderLegacy(cullingBounds);
    }
  }

  // ============================================
  // 리사이즈 / 리소스 관리
  // ============================================

  /**
   * Surface를 새 크기로 재생성한다.
   */
  resize(htmlCanvas: HTMLCanvasElement): void {
    if (this.disposed) return;

    // Content surface 정리
    this.disposeContentSurface();

    // Main surface 재생성
    this.mainSurface.delete();
    this.mainSurface = createGPUSurface(this.ck, htmlCanvas);
    this.mainCanvas = this.mainSurface.getCanvas();

    // Content surface는 다음 render()에서 lazy 재생성
    this.contentDirty = true;
  }

  private disposeContentSurface(): void {
    this.contentSnapshot?.delete();
    this.contentSnapshot = null;
    this.contentSurface?.delete();
    this.contentSurface = null;
    this.contentCanvas = null;
  }

  /** 내부 Canvas 인스턴스 (직접 그리기용) */
  getCanvas(): Canvas {
    return this.mainCanvas;
  }

  /** 내부 Surface 인스턴스 */
  getSurface(): Surface {
    return this.mainSurface;
  }

  /** 모든 리소스 해제 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeContentSurface();
    this.mainSurface.delete();
  }
}
