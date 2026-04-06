/**
 * Camera (ADR-100)
 *
 * PixiJS Container (x/y/scale) 대체. 순수 상태 객체.
 * ViewportController에서 직접 조작, SkiaRenderer에서 읽기.
 */

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  private listeners: Array<() => void> = [];

  /**
   * Screen (DOM) 좌표를 canvas (scene) 좌표로 변환.
   */
  screenToCanvas(
    screenX: number,
    screenY: number,
    canvasRect: DOMRect,
  ): { x: number; y: number } {
    return {
      x: (screenX - canvasRect.left - this.x) / this.zoom,
      y: (screenY - canvasRect.top - this.y) / this.zoom,
    };
  }

  /**
   * Canvas (scene) 좌표를 screen (DOM) 좌표로 변환.
   */
  canvasToScreen(
    canvasX: number,
    canvasY: number,
    canvasRect: DOMRect,
  ): { x: number; y: number } {
    return {
      x: canvasX * this.zoom + this.x + canvasRect.left,
      y: canvasY * this.zoom + this.y + canvasRect.top,
    };
  }

  /**
   * Pan by delta pixels (screen coordinates).
   */
  pan(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
    this.notify();
  }

  /**
   * Zoom at a focal point (screen coordinates).
   */
  zoomAt(
    newZoom: number,
    focalScreenX: number,
    focalScreenY: number,
    canvasRect: DOMRect,
  ): void {
    const clampedZoom = Math.max(0.1, Math.min(10, newZoom));
    if (clampedZoom === this.zoom) return;

    const fx = focalScreenX - canvasRect.left;
    const fy = focalScreenY - canvasRect.top;

    this.x = fx - (fx - this.x) * (clampedZoom / this.zoom);
    this.y = fy - (fy - this.y) * (clampedZoom / this.zoom);
    this.zoom = clampedZoom;
    this.notify();
  }

  /**
   * Set absolute position (for zoom-to-fit, etc.).
   */
  setPosition(x: number, y: number, zoom: number): void {
    this.x = x;
    this.y = y;
    this.zoom = Math.max(0.1, Math.min(10, zoom));
    this.notify();
  }

  /**
   * Get current state snapshot.
   */
  getState(): CameraState {
    return { x: this.x, y: this.y, zoom: this.zoom };
  }

  /**
   * Subscribe to camera changes.
   */
  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
