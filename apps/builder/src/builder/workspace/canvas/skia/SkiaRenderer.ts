/**
 * CanvasKit/Skia 렌더 루프
 *
 * Phase 5: 기본 렌더 루프 (단일 Surface)
 * Phase 6: 이중 Surface 캐싱 + Dirty Rect 렌더링
 *
 * 프레임 분류:
 * - idle: 변경 없음 → 렌더링 스킵 (0ms)
 * - camera-only: 카메라만 변경 → 캐시 blit + 아핀 변환 (~1ms)
 * - content: 요소 변경 → dirty rect 부분 렌더링 후 블리팅
 * - full: 리사이즈/첫 프레임/cleanup → 전체 재렌더링
 *
 * @see docs/WASM.md §5.10, §6.1, §6.2
 */

import type { CanvasKit, Canvas, Surface, Image } from 'canvaskit-wasm';
import type { SkiaRenderable, FrameType, CameraState, DirtyRect } from './types';
import { createGPUSurface } from './createSurface';
import { recordWasmMetric } from '../utils/gpuProfilerCore';
import { mergeDirtyRects } from './dirtyRectTracker';


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
  /** 프레임 분류용 — 매 프레임 갱신 */
  private lastCamera: CameraState = { zoom: 1, panX: 0, panY: 0 };
  /** 스냅샷 캡처 시점의 카메라 — camera-only blit 델타 기준점 */
  private snapshotCamera: CameraState = { zoom: 1, panX: 0, panY: 0 };

  // ============================================
  // Cleanup Render (Pencil debouncedMoveEnd 패턴)
  // ============================================
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private needsCleanupRender = false;

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
   *
   * 현재: camera-only blit은 비활성화 (contentSurface가 뷰포트 크기로
   * 가장자리 클리핑 발생). Content Render Padding (Phase 5) 구현 시 재활성화.
   *
   * Cleanup Render/camera-only blit 인프라는 Phase 5 대비 보존:
   * - blitWithCameraTransform(): snapshotCamera 기반 아핀 변환
   * - scheduleCleanupRender(): 200ms 디바운스 full quality 재렌더링
   */
  private classifyFrame(
    registryVersion: number,
    camera: CameraState,
  ): FrameType {
    if (this.contentDirty) return 'full';

    // Cleanup render — 모션 종료 후 200ms 디바운스 full quality 재렌더링
    if (this.needsCleanupRender) {
      this.needsCleanupRender = false;
      return 'full';
    }

    const registryChanged = registryVersion !== this.lastRegistryVersion;
    const cameraChanged =
      camera.zoom !== this.lastCamera.zoom ||
      camera.panX !== this.lastCamera.panX ||
      camera.panY !== this.lastCamera.panY;

    if (registryChanged) {
      return 'content';
    }
    if (cameraChanged) {
      // camera-only blit은 contentSurface가 뷰포트 크기이므로
      // 스냅샷에 없는 가장자리 영역이 배경색으로 노출되는 문제가 있다.
      // Content Render Padding (Phase 5, 512px) 구현 전까지는
      // 카메라 변경 시에도 content render를 수행한다.
      // 트리 캐시(~0ms)와 AABB 컬링으로 content render 비용이
      // 충분히 낮아(~1-3ms) 실용적 영향 없음.
      return 'content';
    }
    return 'idle';
  }

  /**
   * Cleanup render를 200ms 후로 예약한다.
   *
   * Pencil의 debouncedMoveEnd(200ms) → invalidateContent() 패턴.
   * 카메라 모션/콘텐츠 변경 종료 후 full quality 재렌더링으로
   * camera-only blit의 가장자리 아티팩트를 보정한다.
   */
  private scheduleCleanupRender(): void {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => {
      this.needsCleanupRender = true;
      this.cleanupTimer = null;
    }, 200);
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
   * dirtyRects가 있으면 카메라 좌표로 변환 후 해당 영역만 clipRect로 부분 렌더링.
   * 없으면 전체 렌더링.
   *
   * Phase 3: dirty rect 좌표를 씬-로컬 → content canvas 공간으로 변환하여
   * 부분 렌더링의 좌표계 불일치를 해결한다.
   */
  private renderContent(
    cullingBounds: DOMRect,
    camera: CameraState,
    dirtyRects?: DirtyRect[],
  ): void {
    if (!this.contentCanvas || !this.contentSurface || !this.rootNode) return;

    const start = performance.now();

    // 뷰포트 면적 기반 폴백: dirty 면적이 30% 초과 시 전체 렌더
    const viewportArea = (this.mainSurface.width() / this.dpr) * (this.mainSurface.height() / this.dpr);

    if (!dirtyRects || dirtyRects.length === 0 || this.contentDirty) {
      // 전체 콘텐츠 렌더링
      this.contentCanvas.clear(this.backgroundColor);
      this.contentCanvas.save();
      this.contentCanvas.scale(this.dpr, this.dpr);
      this.rootNode.renderSkia(this.contentCanvas, cullingBounds);
      this.contentCanvas.restore();
    } else {
      // Dirty Rect 부분 렌더링 — 좌표 변환 후 적용
      const merged = mergeDirtyRects(dirtyRects, 16, viewportArea);
      if (merged.length === 0) {
        // 뷰포트 30% 초과 → 전체 렌더 폴백
        this.contentCanvas.clear(this.backgroundColor);
        this.contentCanvas.save();
        this.contentCanvas.scale(this.dpr, this.dpr);
        this.rootNode.renderSkia(this.contentCanvas, cullingBounds);
        this.contentCanvas.restore();
      } else {
        for (const rect of merged) {
          // 씬-로컬 좌표 → content canvas 좌표 (카메라 변환 적용)
          const screenRect = {
            x: rect.x * camera.zoom + camera.panX,
            y: rect.y * camera.zoom + camera.panY,
            width: rect.width * camera.zoom,
            height: rect.height * camera.zoom,
          };

          this.contentCanvas.save();
          this.contentCanvas.scale(this.dpr, this.dpr);

          const skRect = this.ck.LTRBRect(
            screenRect.x,
            screenRect.y,
            screenRect.x + screenRect.width,
            screenRect.y + screenRect.height,
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
    }

    // 콘텐츠 스냅샷 생성 (이전 스냅샷 해제)
    this.contentSnapshot?.delete();
    this.contentSurface.flush();
    this.contentSnapshot = this.contentSurface.makeImageSnapshot();
    this.snapshotCamera = { ...camera }; // camera-only blit 델타 기준점 갱신
    this.contentDirty = false;

    recordWasmMetric('skiaFrameTime', performance.now() - start);
  }

  /**
   * Content 스냅샷을 Main Surface에 블리팅한다.
   *
   * 카메라 변환은 content 렌더링 시 worldTransform에 이미 포함되어 있으므로
   * 단순 1:1 복사만 수행한다.
   */
  private blitToMain(): void {
    if (!this.contentSnapshot) return;

    this.mainCanvas.clear(this.backgroundColor);
    this.mainCanvas.drawImage(this.contentSnapshot, 0, 0);
    this.mainSurface.flush();
  }

  /**
   * Phase 4: 카메라만 변경된 프레임에서 캐시된 스냅샷에 아핀 변환만 적용한다.
   *
   * content re-render 없이 이전 스냅샷을 카메라 델타만큼 이동/스케일하여
   * ~1ms 이내로 프레임을 완성한다.
   * 가장자리 아티팩트는 Cleanup Render(Phase 1)로 200ms 후 보정된다.
   */
  private blitWithCameraTransform(camera: CameraState): void {
    if (!this.contentSnapshot) return;

    this.mainCanvas.clear(this.backgroundColor);
    this.mainCanvas.save();

    // 스냅샷 픽셀 (px, py) → 새 위치로 변환:
    //   oldPixelX = (sceneX * oldZoom + oldPanX) * dpr
    //   newPixelX = (sceneX * newZoom + newPanX) * dpr
    // canvas.translate(tx, ty) → canvas.scale(r, r) 적용 시:
    //   newPixelX = oldPixelX * r + tx
    //   tx = (newPanX - oldPanX * r) * dpr
    const zoomRatio = camera.zoom / this.snapshotCamera.zoom;
    const tx = (camera.panX - this.snapshotCamera.panX * zoomRatio) * this.dpr;
    const ty = (camera.panY - this.snapshotCamera.panY * zoomRatio) * this.dpr;

    this.mainCanvas.translate(tx, ty);
    this.mainCanvas.scale(zoomRatio, zoomRatio);

    this.mainCanvas.drawImage(this.contentSnapshot, 0, 0);
    this.mainCanvas.restore();
    this.mainSurface.flush();
  }

  /**
   * 이중 Surface 모드로 한 프레임을 렌더링한다.
   *
   * 프레임 분류에 따라 최소 작업만 수행:
   * - idle → 스킵
   * - camera-only → 캐시 blit + 아핀 변환 (~1ms)
   * - content → renderContent(dirtyRects) + blitToMain()
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
        this.blitWithCameraTransform(camera);
        break;

      case 'content':
        this.renderContent(cullingBounds, camera, dirtyRects);
        this.blitToMain();
        break;

      case 'full':
        this.renderContent(cullingBounds, camera);
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

    // DPR 갱신 — 외부 모니터 이동 등으로 변경될 수 있음 (I-H4)
    this.dpr = window.devicePixelRatio || 1;

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
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.disposeContentSurface();
    this.mainSurface.delete();
  }
}
