/**
 * CanvasKitWebGLBackend (ADR-100)
 *
 * GPUBackend implementation wrapping CanvasKit's WebGL surface management.
 * Future WebGPU migration: create CanvasKitWebGPUBackend implementing same interface.
 */

import type { GPUBackend, GPUSurface } from "./GPUBackend";

// CanvasKit types (imported dynamically to avoid top-level dependency)
type CanvasKit = unknown;
type SkSurface = unknown;

interface CanvasKitSurface extends GPUSurface {
  _surface: SkSurface;
  _ck: CanvasKit;
}

export class CanvasKitWebGLBackend implements GPUBackend {
  private ck: CanvasKit | null = null;
  private contextLostCallbacks: Array<() => void> = [];
  private contextRestoredCallbacks: Array<() => void> = [];
  private _isContextLost = false;

  /**
   * Initialize with a CanvasKit instance.
   * Call after CanvasKit WASM is loaded.
   */
  init(canvasKit: CanvasKit): void {
    this.ck = canvasKit;
  }

  createSurface(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ): GPUSurface | null {
    if (!this.ck) return null;

    const ck = this.ck as Record<string, unknown>;
    const makeWebGL = ck["MakeWebGLCanvasSurface"] as
      | ((canvas: HTMLCanvasElement) => SkSurface | null)
      | undefined;

    if (!makeWebGL) return null;

    const surface = makeWebGL(canvas);
    if (!surface) return null;

    return this.wrapSurface(surface, width, height);
  }

  createOffscreenSurface(width: number, height: number): GPUSurface | null {
    if (!this.ck) return null;

    const ck = this.ck as Record<string, unknown>;
    const makeSurface = ck["MakeSurface"] as
      | ((width: number, height: number) => SkSurface | null)
      | undefined;

    if (!makeSurface) return null;

    const surface = makeSurface(width, height);
    if (!surface) return null;

    return this.wrapSurface(surface, width, height);
  }

  resizeSurface(
    surface: GPUSurface,
    _width: number,
    _height: number,
  ): GPUSurface | null {
    // CanvasKit doesn't support resize — dispose and recreate
    this.disposeSurface(surface);
    // Caller should recreate with new dimensions
    return null;
  }

  disposeSurface(surface: GPUSurface): void {
    surface.dispose();
  }

  beginFrame(_surface: GPUSurface): void {
    // CanvasKit: no explicit begin needed — getCanvas() returns current frame
  }

  endFrame(surface: GPUSurface): void {
    surface.flush();
  }

  isContextLost(): boolean {
    return this._isContextLost;
  }

  onContextLost(callback: () => void): void {
    this.contextLostCallbacks.push(callback);
  }

  onContextRestored(callback: () => void): void {
    this.contextRestoredCallbacks.push(callback);
  }

  getMaxTextureSize(): number {
    // WebGL typical max
    return 4096;
  }

  getDevicePixelRatio(): number {
    return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  }

  dispose(): void {
    this.ck = null;
    this.contextLostCallbacks = [];
    this.contextRestoredCallbacks = [];
  }

  // ─── Internal ───

  /**
   * Watch canvas for WebGL context loss/restore.
   */
  watchContextLoss(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this._isContextLost = true;
      for (const cb of this.contextLostCallbacks) cb();
    });

    canvas.addEventListener("webglcontextrestored", () => {
      this._isContextLost = false;
      for (const cb of this.contextRestoredCallbacks) cb();
    });
  }

  private wrapSurface(
    surface: SkSurface,
    width: number,
    height: number,
  ): CanvasKitSurface {
    const surf = surface as Record<string, unknown>;
    return {
      width,
      height,
      getCanvas: () => {
        const fn = surf["getCanvas"] as (() => unknown) | undefined;
        return fn ? fn.call(surf) : null;
      },
      makeImageSnapshot: () => {
        const fn = surf["makeImageSnapshot"] as (() => unknown) | undefined;
        return fn ? fn.call(surf) : null;
      },
      flush: () => {
        const fn = surf["flush"] as (() => void) | undefined;
        if (fn) fn.call(surf);
      },
      dispose: () => {
        const fn = surf["delete"] as (() => void) | undefined;
        if (fn) fn.call(surf);
      },
      _surface: surface,
      _ck: this.ck,
    };
  }
}
