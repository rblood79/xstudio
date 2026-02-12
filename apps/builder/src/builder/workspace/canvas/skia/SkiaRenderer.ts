/**
 * CanvasKit/Skia 렌더 루프
 *
 * Phase 5: 기본 렌더 루프 (단일 Surface)
 * Phase 6: 이중 Surface 캐싱 (컨텐츠 캐시 + 오버레이 분리)
 *
 * 프레임 분류:
 * - idle: 변경 없음 → 렌더링 스킵 (0ms)
 * - present: 오버레이만 변경 → 캐시 blit + 오버레이 렌더
 * - camera-only: 카메라만 변경 → 캐시 blit + 아핀 변환 + 오버레이 렌더 (~1ms)
 * - content: 요소 변경 → 컨텐츠 재렌더링 + 캐시 갱신
 * - full: 리사이즈/첫 프레임/cleanup → 전체 재렌더링
 *
 * @see docs/WASM.md §5.10, §6.1, §6.2
 */

import type { CanvasKit, Canvas, Surface, Image } from 'canvaskit-wasm';
import type { SkiaRenderable, FrameType, CameraState } from './types';
import { createGPUSurface } from './createSurface';
import { recordWasmMetric, flushWasmMetrics } from '../utils/gpuProfilerCore';


export class SkiaRenderer {
  private ck: CanvasKit;
  private contentNode: SkiaRenderable | null = null;
  private overlayNode: SkiaRenderable | null = null;
  private screenOverlayNode: SkiaRenderable | null = null;
  private backgroundColor: Float32Array;
  private disposed = false;
  private dpr: number;

  /** Content Surface 패딩 (CSS px) — camera-only blit 가장자리 아티팩트 방지 */
  private readonly contentPaddingCssPx = 512;
  /** DPR 반영된 패딩 (device px) */
  private contentPaddingDevicePx = 0;

  /**
   * Snapshot(blit) 리샘플링 정책
   *
   * Pencil은 zoom mismatch 시 drawImageCubic 계열로 보간을 사용하는 것으로 알려져 있다.
   * xstudio도 zoomRatio != 1인 경우(스케일링 발생)에 cubic 보간을 우선 사용한다.
   *
   * Mitchell-Netravali (B=C=1/3): 일반적인 UI 확대/축소에 무난한 기본값.
   */
  private readonly snapshotCubicResampler = { b: 1 / 3, c: 1 / 3 };

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
  private lastOverlayVersion = -1;
  private lastScreenOverlayVersion = -1;
  /** 프레임 분류용 — 매 프레임 갱신 */
  private lastCamera: CameraState = { zoom: 1, panX: 0, panY: 0 };
  /** 스냅샷 캡처 시점의 카메라 — camera-only blit 델타 기준점 */
  private snapshotCamera: CameraState = { zoom: 1, panX: 0, panY: 0 };

  // ============================================
  // Cleanup Render (Pencil debouncedMoveEnd 패턴)
  // ============================================
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private needsCleanupRender = false;

  // ============================================
  // Dev instrumentation
  // ============================================
  private devContentRenderCount = 0;
  private devContentRenderWindowStartMs = 0;
  private devFrameCount = 0;
  private devIdleFrameCount = 0;
  private devFrameWindowStartMs = 0;

  constructor(
    ck: CanvasKit,
    htmlCanvas: HTMLCanvasElement,
    backgroundColor?: Float32Array,
    dpr?: number,
  ) {
    this.ck = ck;
    this.dpr = dpr ?? (window.devicePixelRatio || 1);
    this.contentPaddingDevicePx = Math.round(this.contentPaddingCssPx * this.dpr);
    this.mainSurface = createGPUSurface(ck, htmlCanvas);
    this.mainCanvas = this.mainSurface.getCanvas();
    this.backgroundColor = backgroundColor ?? ck.Color4f(1, 1, 1, 1);

    if (process.env.NODE_ENV === 'development') {
      this.devContentRenderWindowStartMs = performance.now();
      this.devFrameWindowStartMs = this.devContentRenderWindowStartMs;
    }
  }

  /** 컨텐츠(디자인 노드) 렌더러를 설정한다. */
  setContentNode(node: SkiaRenderable | null): void {
    this.contentNode = node;
  }

  /** 오버레이(Selection/AI) 렌더러를 설정한다. */
  setOverlayNode(node: SkiaRenderable | null): void {
    this.overlayNode = node;
  }

  /** 씬 좌표계 오버레이(그리드 등) 렌더러를 설정한다. 카메라 변환이 적용된다. */
  setScreenOverlayNode(node: SkiaRenderable | null): void {
    this.screenOverlayNode = node;
  }

  /** 배경색을 변경한다. */
  setBackgroundColor(color: Float32Array): void {
    this.backgroundColor = color;
  }

  /** 컨텐츠 캐시를 무효화하여 다음 프레임에서 전체 재렌더링하도록 한다. */
  invalidateContent(): void {
    this.contentDirty = true;
  }

  /** 메인 캔버스를 클리어한다 (페이지 전환/초기화용). */
  clearFrame(): void {
    this.mainCanvas.clear(this.backgroundColor);
    this.mainSurface.flush();
  }

  // ============================================
  // Phase 6: 이중 Surface 렌더링
  // ============================================

  /**
   * 프레임을 분류하여 최적 렌더 경로를 결정한다.
   *
   * 컨텐츠는 contentSurface에 캐시하고, 화면 표시는
   * snapshot blit + 오버레이를 mainSurface에 덧그린다.
   */
  private classifyFrame(
    registryVersion: number,
    camera: CameraState,
    overlayVersion: number,
    screenOverlayVersion: number,
  ): FrameType {
    if (this.contentDirty) return 'full';

    // Cleanup render — 모션 종료 후 200ms 디바운스 full quality 재렌더링
    if (this.needsCleanupRender) {
      this.needsCleanupRender = false;
      return 'full';
    }

    const registryChanged = registryVersion !== this.lastRegistryVersion;
    const overlayChanged = overlayVersion !== this.lastOverlayVersion;
    const screenOverlayChanged = screenOverlayVersion !== this.lastScreenOverlayVersion;
    const cameraChanged =
      camera.zoom !== this.lastCamera.zoom ||
      camera.panX !== this.lastCamera.panX ||
      camera.panY !== this.lastCamera.panY;

    if (registryChanged) {
      return 'content';
    }
    if (cameraChanged) {
      if (!this.contentSnapshot) {
        return 'content';
      }

      // Pencil 모델: 팬/줌 중에는 snapshot blit(camera-only)으로 즉시 응답한다.
      //
      // 단, 아래 조건에서는 "현재 스냅샷으로는 품질/커버리지를 유지할 수 없다"고 보고
      // 즉시 content를 재렌더링한다. (Pencil의 redrawContentIfNeeded() 패턴)
      //
      // 1) zoom in이 스냅샷 캡처 시점 대비 너무 커짐 → 리샘플링 blur/디테일 손실
      // 2) 스냅샷(패딩 포함)이 현재 뷰포트를 완전히 덮지 못함 → 빈 영역/가장자리 아티팩트
      const zoomTooLarge = camera.zoom > this.snapshotCamera.zoom * 3;
      const outOfCoverage = !this.canBlitWithCameraTransform(camera);
      if (zoomTooLarge || outOfCoverage) {
        return 'content';
      }

      // 모션 종료 후 200ms에 1회 full render로 최종 품질을 정리한다.
      // (zoom mismatch 보간, 서브픽셀 이동에 대한 cleanup)
      this.scheduleCleanupRender();
      return 'camera-only';
    }
    if (overlayChanged || screenOverlayChanged) {
      return 'present';
    }
    return 'idle';
  }

  private tickDevMetrics(nowMs: number): void {
    if (process.env.NODE_ENV !== 'development') return;

    if (this.devContentRenderWindowStartMs <= 0) {
      this.devContentRenderWindowStartMs = nowMs;
      this.devContentRenderCount = 0;
      return;
    }

    const elapsed = nowMs - this.devContentRenderWindowStartMs;
    if (elapsed < 1000) return;

    const perSec = this.devContentRenderCount / (elapsed / 1000);
    recordWasmMetric('contentRendersPerSec', perSec);
    // CanvasSync 스토어로 플러시하여 dev overlay/monitor에서 확인 가능하게 한다.
    flushWasmMetrics();

    this.devContentRenderWindowStartMs = nowMs;
    this.devContentRenderCount = 0;
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

  private cancelCleanupRender(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.needsCleanupRender = false;
  }

  private canBlitWithCameraTransform(camera: CameraState): boolean {
    if (!this.contentSnapshot) return false;

    const mainW = this.mainSurface.width();
    const mainH = this.mainSurface.height();
    if (mainW <= 0 || mainH <= 0) return false;

    const pad = this.contentPaddingDevicePx;
    const zoomRatio = camera.zoom / this.snapshotCamera.zoom;
    const tx = (camera.panX - this.snapshotCamera.panX * zoomRatio) * this.dpr;
    const ty = (camera.panY - this.snapshotCamera.panY * zoomRatio) * this.dpr;

    // 변환된 스냅샷 이미지가 메인 캔버스를 완전히 덮는지 확인한다.
    // base = -pad 이고 contentSize = main + 2*pad 이므로:
    // left = -pad*r + tx, right = (mainW + pad)*r + tx
    const left = -pad * zoomRatio + tx;
    const top = -pad * zoomRatio + ty;
    const right = (mainW + pad) * zoomRatio + tx;
    const bottom = (mainH + pad) * zoomRatio + ty;

    const margin = 1; // 1px 여유 (부동소수점 오차)
    return (
      left <= margin &&
      top <= margin &&
      right >= mainW - margin &&
      bottom >= mainH - margin
    );
  }

  /**
   * Content Surface를 초기화한다.
   * mainSurface보다 큰 오프스크린 Surface를 생성하여 camera-only blit 시
   * 가장자리 아티팩트를 방지한다.
   *
   * mainSurface.makeSurface()로 **동일 백엔드(GPU/SW)** 의 호환 Surface를 생성한다.
   * (ck.MakeSurface는 raster-direct(CPU) surface를 만들어 content render 비용이 커질 수 있으므로 사용하지 않는다.)
   */
  private initContentSurface(): void {
    this.disposeContentSurface();

    const width = this.mainSurface.width() + this.contentPaddingDevicePx * 2;
    const height = this.mainSurface.height() + this.contentPaddingDevicePx * 2;

    const baseInfo = this.mainSurface.imageInfo();
    this.contentSurface = this.mainSurface.makeSurface({
      ...baseInfo,
      width,
      height,
    });
    this.contentCanvas = this.contentSurface.getCanvas();
    this.contentDirty = true;
  }

  /**
   * Content Surface에 씬을 렌더링한다.
   */
  private renderContent(
    cullingBounds: DOMRect,
    camera: CameraState,
  ): void {
    if (!this.contentCanvas || !this.contentSurface || !this.contentNode) return;

    if (process.env.NODE_ENV === 'development') {
      this.devContentRenderCount++;
    }

    // content/full 렌더가 수행되면 cleanup 목적(최종 품질 정리)이 충족되므로 예약을 취소한다.
    // (카메라 모션 도중 스타일 변경 등이 겹쳤을 때, 모션 종료 후 불필요한 추가 full render 방지)
    this.cancelCleanupRender();

    const start = performance.now();

    // 전체 콘텐츠 렌더링 (Pencil 방식: content invalidation은 full rerender)
    const padCss = this.contentPaddingDevicePx / this.dpr;
    const padScene = padCss / Math.max(camera.zoom, 0.001);
    const paddedBounds = new DOMRect(
      cullingBounds.x - padScene,
      cullingBounds.y - padScene,
      cullingBounds.width + padScene * 2,
      cullingBounds.height + padScene * 2,
    );

    // 투명 배경으로 클리어 — 그리드가 콘텐츠 아래(main canvas)에서 보이도록
    // 배경색은 present()에서 main canvas에 적용한다.
    this.contentCanvas.clear(this.ck.Color4f(0, 0, 0, 0));
    this.contentCanvas.save();
    this.contentCanvas.scale(this.dpr, this.dpr);
    this.contentCanvas.translate(padCss, padCss);
    this.contentCanvas.translate(camera.panX, camera.panY);
    this.contentCanvas.scale(camera.zoom, camera.zoom);
    this.contentNode.renderSkia(this.contentCanvas, paddedBounds);
    this.contentCanvas.restore();

    // 콘텐츠 스냅샷 생성 (이전 스냅샷 해제)
    this.contentSnapshot?.delete();
    this.contentSurface.flush();
    this.contentSnapshot = this.contentSurface.makeImageSnapshot();
    this.snapshotCamera = { ...camera }; // camera-only blit 델타 기준점 갱신
    this.contentDirty = false;

    recordWasmMetric('contentRenderTime', performance.now() - start);
  }

  /**
   * Content 스냅샷을 Main Surface에 블리팅한다 (flush는 호출자가 수행).
   */
  private blitToMainNoFlush(): void {
    if (!this.contentSnapshot) return;

    // clear는 present()에서 수행 (그리드가 콘텐츠 아래에 위치하도록)
    this.mainCanvas.drawImage(this.contentSnapshot, -this.contentPaddingDevicePx, -this.contentPaddingDevicePx);
  }

  /**
   * Phase 4: 카메라만 변경된 프레임에서 캐시된 스냅샷에 아핀 변환만 적용한다.
   *
   * content re-render 없이 이전 스냅샷을 카메라 델타만큼 이동/스케일하여
   * ~1ms 이내로 프레임을 완성한다.
   * 가장자리 아티팩트는 Cleanup Render(Phase 1)로 200ms 후 보정된다.
   */
  private blitWithCameraTransformNoFlush(camera: CameraState): void {
    if (!this.contentSnapshot) return;

    // clear는 present()에서 수행 (그리드가 콘텐츠 아래에 위치하도록)
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

    // zoom mismatch(스케일링) 시에는 cubic 보간을 사용해 선명도/계단 현상을 줄인다.
    // CanvasKit 타입 정의에 drawImageCubic이 없을 수 있어 런타임 존재 여부로 가드한다.
    const x = -this.contentPaddingDevicePx;
    const y = -this.contentPaddingDevicePx;
    const shouldUseCubic = Math.abs(zoomRatio - 1) > 1e-6;
    const anyCanvas = this.mainCanvas as unknown as {
      drawImageCubic?: (
        image: Image,
        x: number,
        y: number,
        b: number,
        c: number,
        paint?: unknown,
      ) => void;
    };

    if (shouldUseCubic && typeof anyCanvas.drawImageCubic === 'function') {
      const { b, c } = this.snapshotCubicResampler;
      anyCanvas.drawImageCubic(this.contentSnapshot, x, y, b, c);
    } else {
      this.mainCanvas.drawImage(this.contentSnapshot, x, y);
    }
    this.mainCanvas.restore();
  }

  /**
   * 씬 좌표계 오버레이를 렌더링한다 (카메라 변환 적용).
   *
   * 그리드 등 씬 좌표계에서 렌더링되는 요소를 그린다.
   * DPR 스케일 + 카메라 pan/zoom을 적용하여
   * 요소와 동일한 좌표계에서 동작하도록 한다.
   */
  private renderScreenOverlay(cullingBounds: DOMRect, camera: CameraState): void {
    if (!this.screenOverlayNode) return;
    this.mainCanvas.save();
    this.mainCanvas.scale(this.dpr, this.dpr);
    this.mainCanvas.translate(camera.panX, camera.panY);
    this.mainCanvas.scale(camera.zoom, camera.zoom);
    this.screenOverlayNode.renderSkia(this.mainCanvas, cullingBounds);
    this.mainCanvas.restore();
  }

  private renderOverlay(
    cullingBounds: DOMRect,
    camera: CameraState,
  ): void {
    if (!this.overlayNode) return;

    this.mainCanvas.save();
    this.mainCanvas.scale(this.dpr, this.dpr);
    this.mainCanvas.translate(camera.panX, camera.panY);
    this.mainCanvas.scale(camera.zoom, camera.zoom);
    this.overlayNode.renderSkia(this.mainCanvas, cullingBounds);
    this.mainCanvas.restore();
  }

  private present(
    cullingBounds: DOMRect,
    camera: CameraState,
  ): void {
    // 렌더링 순서: 배경 → 그리드 → 콘텐츠 → 오버레이
    // 그리드가 콘텐츠 아래에 위치하도록 content surface는 투명 배경을 사용하고,
    // main canvas에서 배경색 → 그리드(씬 좌표계) → 콘텐츠 블릿 순서로 합성한다.
    this.mainCanvas.clear(this.backgroundColor);
    this.renderScreenOverlay(cullingBounds, camera);

    const cameraMatchesSnapshot =
      camera.zoom === this.snapshotCamera.zoom &&
      camera.panX === this.snapshotCamera.panX &&
      camera.panY === this.snapshotCamera.panY;

    const blitStart = performance.now();
    if (cameraMatchesSnapshot) {
      this.blitToMainNoFlush();
    } else {
      this.blitWithCameraTransformNoFlush(camera);
    }
    recordWasmMetric('blitTime', performance.now() - blitStart);
    this.renderOverlay(cullingBounds, camera);
    this.mainSurface.flush();
  }

  /**
   * 이중 Surface 모드로 한 프레임을 렌더링한다.
   *
   * 프레임 분류에 따라 최소 작업만 수행:
   * - idle → 스킵
   * - present → 캐시 blit + 오버레이
   * - camera-only → 캐시 blit(아핀) + 오버레이
   * - content/full → 컨텐츠 재렌더 + 캐시 갱신
   */
  renderDualSurface(
    cullingBounds: DOMRect,
    registryVersion: number,
    camera: CameraState,
    overlayVersion: number,
    screenOverlayVersion = 0,
  ): void {
    if (this.disposed || !this.contentNode) return;

    this.tickDevMetrics(performance.now());

    if (process.env.NODE_ENV === 'development') {
      if (this.devFrameWindowStartMs <= 0) {
        this.devFrameWindowStartMs = performance.now();
        this.devFrameCount = 0;
        this.devIdleFrameCount = 0;
      }
      this.devFrameCount++;
    }

    // Lazy init content surface
    if (!this.contentSurface) {
      this.initContentSurface();
      // Content surface 실패 시 레거시 폴백
      if (!this.contentSurface) {
        this.renderLegacy(cullingBounds, camera);
        return;
      }
    }

    const frameStart = performance.now();
    const frameType = this.classifyFrame(registryVersion, camera, overlayVersion, screenOverlayVersion);

    switch (frameType) {
      case 'idle':
        if (process.env.NODE_ENV === 'development') {
          this.devIdleFrameCount++;
        }
        break;

      case 'present':
        this.present(cullingBounds, camera);
        break;

      case 'camera-only':
        this.present(cullingBounds, camera);
        break;

      case 'content':
        this.renderContent(cullingBounds, camera);
        this.present(cullingBounds, camera);
        break;

      case 'full':
        this.renderContent(cullingBounds, camera);
        this.present(cullingBounds, camera);
        break;
    }

    if (frameType !== 'idle') {
      recordWasmMetric('skiaFrameTime', performance.now() - frameStart);
    }

    if (process.env.NODE_ENV === 'development') {
      const now = performance.now();
      const elapsed = now - this.devFrameWindowStartMs;
      if (elapsed >= 1000 && this.devFrameCount > 0) {
        const ratio = this.devIdleFrameCount / this.devFrameCount;
        const nonIdle = this.devFrameCount - this.devIdleFrameCount;
        const presentsPerSec = nonIdle / (elapsed / 1000);
        recordWasmMetric('idleFrameRatio', ratio);
        recordWasmMetric('presentFramesPerSec', presentsPerSec);
        flushWasmMetrics();
        this.devFrameWindowStartMs = now;
        this.devFrameCount = 0;
        this.devIdleFrameCount = 0;
      }
    }

    this.lastRegistryVersion = registryVersion;
    this.lastOverlayVersion = overlayVersion;
    this.lastScreenOverlayVersion = screenOverlayVersion;
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
  renderLegacy(cullingBounds: DOMRect, camera: CameraState): void {
    if (this.disposed || !this.contentNode) return;

    const start = performance.now();

    this.mainCanvas.clear(this.backgroundColor);
    this.renderScreenOverlay(cullingBounds, camera);
    this.mainCanvas.save();
    this.mainCanvas.scale(this.dpr, this.dpr);
    this.mainCanvas.translate(camera.panX, camera.panY);
    this.mainCanvas.scale(camera.zoom, camera.zoom);
    this.contentNode.renderSkia(this.mainCanvas, cullingBounds);
    if (this.overlayNode) {
      this.overlayNode.renderSkia(this.mainCanvas, cullingBounds);
    }
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
    registryVersion: number,
    camera: CameraState,
    overlayVersion: number,
    screenOverlayVersion = 0,
  ): void {
    this.renderDualSurface(cullingBounds, registryVersion, camera, overlayVersion, screenOverlayVersion);
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
    this.contentPaddingDevicePx = Math.round(this.contentPaddingCssPx * this.dpr);

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
