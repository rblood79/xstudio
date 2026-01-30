/**
 * ViewportController
 *
 * 🚀 Phase 12 B3.2: PixiJS Container 직접 조작으로 React 리렌더 최소화
 *
 * 기능:
 * - 드래그/줌 중 PixiJS Container 직접 조작
 * - 인터랙션 종료 시 React state 동기화
 * - 관성 스크롤 (Phase 3에서 추가)
 *
 * @since 2025-12-12 Phase 12 B3.2
 */

import type { Container } from 'pixi.js';

// ============================================
// Types
// ============================================

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface ViewportControllerOptions {
  /** 최소 줌 */
  minZoom?: number;
  /** 최대 줌 */
  maxZoom?: number;
  /** 상태 동기화 콜백 (인터랙션 종료 시 호출) */
  onStateSync?: (state: ViewportState) => void;
}

// ============================================
// ViewportController Class
// ============================================

/**
 * PixiJS Container를 직접 조작하는 뷰포트 컨트롤러
 *
 * React state 업데이트 없이 Container의 x, y, scale을 직접 조작하여
 * 드래그/줌 중 React 리렌더를 방지합니다.
 */
export class ViewportController {
  private container: Container | null = null;
  private options: Required<ViewportControllerOptions>;

  // 현재 상태 (Container에서 동기화)
  private currentState: ViewportState = { x: 0, y: 0, scale: 1 };

  // 드래그 상태
  private isPanning = false;
  private lastPanPoint: { x: number; y: number } | null = null;

  // 외부 리스너 (스크롤바 등이 pan/zoom 중 실시간 추적)
  private updateListeners: Set<(state: ViewportState) => void> = new Set();

  constructor(options: ViewportControllerOptions = {}) {
    this.options = {
      minZoom: options.minZoom ?? 0.1,
      maxZoom: options.maxZoom ?? 5,
      onStateSync: options.onStateSync ?? (() => {}),
    };
  }

  // ============================================
  // Container 연결
  // ============================================

  /**
   * PixiJS Container 연결
   */
  attach(container: Container): void {
    this.container = container;
    // 현재 Container 상태로 동기화
    this.currentState = {
      x: container.x,
      y: container.y,
      scale: container.scale.x,
    };
  }

  /**
   * Container 연결 해제
   */
  detach(): void {
    this.container = null;
  }

  /**
   * Container 연결 여부
   */
  isAttached(): boolean {
    return this.container !== null;
  }

  /**
   * onStateSync 콜백 업데이트 (싱글톤에서 지연 설정용)
   */
  setOnStateSync(callback: (state: ViewportState) => void): void {
    this.options.onStateSync = callback;
  }

  // ============================================
  // 직접 조작 API
  // ============================================

  /**
   * 팬 시작
   */
  startPan(clientX: number, clientY: number): void {
    this.isPanning = true;
    this.lastPanPoint = { x: clientX, y: clientY };
  }

  /**
   * 팬 업데이트 (드래그 중 호출)
   * React state 업데이트 없이 Container 직접 조작
   */
  updatePan(clientX: number, clientY: number): void {
    if (!this.isPanning || !this.lastPanPoint || !this.container) return;

    const deltaX = clientX - this.lastPanPoint.x;
    const deltaY = clientY - this.lastPanPoint.y;

    // Container 직접 조작 (React re-render 없음)
    this.container.x += deltaX;
    this.container.y += deltaY;

    // 내부 상태 업데이트
    this.currentState.x = this.container.x;
    this.currentState.y = this.container.y;

    this.lastPanPoint = { x: clientX, y: clientY };

    this.notifyUpdateListeners();
  }

  /**
   * 팬 종료 → React state 동기화
   */
  endPan(): void {
    if (!this.isPanning) return;

    this.isPanning = false;
    this.lastPanPoint = null;

    // React state로 동기화
    this.syncToReactState();
  }

  /**
   * 특정 위치 중심으로 줌
   * @param clientX 마우스 X 좌표 (화면 기준)
   * @param clientY 마우스 Y 좌표 (화면 기준)
   * @param containerRect 컨테이너의 bounding rect
   * @param delta 줌 변화량 (양수: 줌인, 음수: 줌아웃)
   * @param syncImmediately true면 즉시 React state 동기화
   */
  zoomAtPoint(
    clientX: number,
    clientY: number,
    containerRect: DOMRect,
    delta: number,
    syncImmediately = true
  ): void {
    if (!this.container) return;

    const { minZoom, maxZoom } = this.options;

    // 컨테이너 내 상대 좌표
    const relativeX = clientX - containerRect.left;
    const relativeY = clientY - containerRect.top;

    // 현재 스케일
    const currentScale = this.container.scale.x;

    // 새 스케일 계산 (클램핑)
    const newScale = Math.min(Math.max(currentScale * (1 + delta), minZoom), maxZoom);

    if (newScale === currentScale) return;

    // 줌 비율
    const zoomRatio = newScale / currentScale;

    // 커서 위치 유지를 위한 새 팬 오프셋
    const newX = relativeX - (relativeX - this.container.x) * zoomRatio;
    const newY = relativeY - (relativeY - this.container.y) * zoomRatio;

    // Container 직접 조작
    this.container.x = newX;
    this.container.y = newY;
    this.container.scale.set(newScale);

    // 내부 상태 업데이트
    this.currentState = { x: newX, y: newY, scale: newScale };

    this.notifyUpdateListeners();

    // 즉시 동기화 (휠 줌은 즉시 동기화)
    if (syncImmediately) {
      this.syncToReactState();
    }
  }

  /**
   * 절대 위치/스케일 설정 (외부에서 React state가 변경될 때)
   */
  setPosition(x: number, y: number, scale: number): void {
    if (!this.container) return;

    this.container.x = x;
    this.container.y = y;
    this.container.scale.set(scale);

    this.currentState = { x, y, scale };

    this.notifyUpdateListeners();
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): ViewportState {
    return { ...this.currentState };
  }

  /**
   * 팬 중인지 여부
   */
  isPanningActive(): boolean {
    return this.isPanning;
  }

  // ============================================
  // Update Listeners
  // ============================================

  /**
   * 뷰포트 상태 변경 리스너 등록
   * 스크롤바 등 외부 컴포넌트가 pan/zoom 중 실시간으로 상태를 추적할 수 있게 함
   *
   * @returns cleanup 함수 (리스너 해제)
   */
  addUpdateListener(listener: (state: ViewportState) => void): () => void {
    this.updateListeners.add(listener);
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  // ============================================
  // 내부 메서드
  // ============================================

  /**
   * 모든 등록된 리스너에게 현재 상태 전달
   */
  private notifyUpdateListeners(): void {
    const state = this.currentState;
    for (const listener of this.updateListeners) {
      listener(state);
    }
  }

  /**
   * React state로 동기화
   */
  private syncToReactState(): void {
    this.options.onStateSync(this.currentState);
  }
}

// ============================================
// Singleton Instance (선택적 사용)
// ============================================

let viewportControllerInstance: ViewportController | null = null;

/**
 * ViewportController 싱글톤 인스턴스 가져오기
 */
export function getViewportController(options?: ViewportControllerOptions): ViewportController {
  if (!viewportControllerInstance) {
    viewportControllerInstance = new ViewportController(options);
  }
  return viewportControllerInstance;
}

/**
 * ViewportController 인스턴스 초기화
 */
export function resetViewportController(): void {
  if (viewportControllerInstance) {
    viewportControllerInstance.detach();
    viewportControllerInstance = null;
  }
}

export default ViewportController;
