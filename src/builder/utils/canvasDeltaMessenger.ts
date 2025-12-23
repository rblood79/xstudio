/**
 * Canvas Delta Messenger
 *
 * 🚀 Phase 4: Canvas에 Delta 업데이트를 전송하는 유틸리티
 *
 * 성능 비교:
 * - Before: 전체 elements 배열 전송 → O(n) 직렬화 + 전송
 * - After: 변경된 요소만 전송 → O(1) 직렬화 + 전송
 *
 * 🚀 Phase 11: WebGL-only 모드에서는 postMessage 스킵
 *
 * @since 2025-12-10 Phase 4 Canvas Delta Updates
 */

import type { Element } from "../../types/core/store.types";
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";

// ============================================
// Delta Message Types
// ============================================

export interface DeltaElementAddedMessage {
  type: "DELTA_ELEMENT_ADDED";
  element: Element;
  childElements?: Element[];
}

export interface DeltaElementUpdatedMessage {
  type: "DELTA_ELEMENT_UPDATED";
  elementId: string;
  propsChanges: Record<string, unknown>;
  parentId?: string | null;
  orderNum?: number;
}

export interface DeltaElementRemovedMessage {
  type: "DELTA_ELEMENT_REMOVED";
  elementId: string;
  childElementIds?: string[];
}

export interface DeltaBatchUpdateMessage {
  type: "DELTA_BATCH_UPDATE";
  updates: Array<{
    elementId: string;
    propsChanges?: Record<string, unknown>;
    parentId?: string | null;
    orderNum?: number;
  }>;
}

export type DeltaMessage =
  | DeltaElementAddedMessage
  | DeltaElementUpdatedMessage
  | DeltaElementRemovedMessage
  | DeltaBatchUpdateMessage;

// ============================================
// Delta Messenger Class
// ============================================

/**
 * Canvas iframe에 Delta 메시지를 전송하는 유틸리티
 *
 * @example
 * ```ts
 * const messenger = new CanvasDeltaMessenger();
 *
 * // 요소 추가
 * messenger.sendElementAdded(newElement, childElements);
 *
 * // 요소 업데이트
 * messenger.sendElementUpdated(elementId, { title: "New Title" });
 *
 * // 요소 삭제
 * messenger.sendElementRemoved(elementId, childIds);
 * ```
 */
export class CanvasDeltaMessenger {
  private iframe: HTMLIFrameElement | null = null;
  private targetOrigin: string = "*";
  private enabled: boolean = true;

  /**
   * Delta 메신저 초기화
   */
  constructor(options?: { targetOrigin?: string; enabled?: boolean }) {
    this.targetOrigin = options?.targetOrigin || "*";
    this.enabled = options?.enabled !== false;
  }

  /**
   * iframe 참조 설정
   */
  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
  }

  /**
   * Delta 전송 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * iframe이 준비되었는지 확인
   * 🚀 Phase 11: WebGL-only 모드에서는 항상 false 반환
   */
  isReady(): boolean {
    // 🚀 Phase 11: WebGL-only 모드에서는 iframe 통신 불필요
    const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();
    if (isWebGLOnly) return false;

    return this.enabled && !!this.iframe?.contentWindow;
  }

  /**
   * 요소 추가 Delta 전송
   */
  sendElementAdded(element: Element, childElements?: Element[]): boolean {
    if (!this.isReady()) return false;

    const message: DeltaElementAddedMessage = {
      type: "DELTA_ELEMENT_ADDED",
      element: this.sanitizeElement(element),
      childElements: childElements?.map((el) => this.sanitizeElement(el)),
    };

    return this.send(message);
  }

  /**
   * 요소 업데이트 Delta 전송
   */
  sendElementUpdated(
    elementId: string,
    propsChanges: Record<string, unknown>,
    options?: { parentId?: string | null; orderNum?: number }
  ): boolean {
    if (!this.isReady()) return false;

    const message: DeltaElementUpdatedMessage = {
      type: "DELTA_ELEMENT_UPDATED",
      elementId,
      propsChanges: this.sanitizeProps(propsChanges),
      ...(options?.parentId !== undefined && { parentId: options.parentId }),
      ...(options?.orderNum !== undefined && { orderNum: options.orderNum }),
    };

    return this.send(message);
  }

  /**
   * 요소 삭제 Delta 전송
   */
  sendElementRemoved(elementId: string, childElementIds?: string[]): boolean {
    if (!this.isReady()) return false;

    const message: DeltaElementRemovedMessage = {
      type: "DELTA_ELEMENT_REMOVED",
      elementId,
      childElementIds,
    };

    return this.send(message);
  }

  /**
   * 배치 업데이트 Delta 전송
   */
  sendBatchUpdate(
    updates: Array<{
      elementId: string;
      propsChanges?: Record<string, unknown>;
      parentId?: string | null;
      orderNum?: number;
    }>
  ): boolean {
    if (!this.isReady()) return false;

    const message: DeltaBatchUpdateMessage = {
      type: "DELTA_BATCH_UPDATE",
      updates: updates.map((u) => ({
        ...u,
        propsChanges: u.propsChanges
          ? this.sanitizeProps(u.propsChanges)
          : undefined,
      })),
    };

    return this.send(message);
  }

  /**
   * 전체 요소 배열 전송 (fallback)
   * - Delta가 불가능한 경우 (예: 초기 로드) 사용
   */
  sendFullElements(
    elements: Element[],
    pageInfo?: { pageId: string | null; layoutId: string | null }
  ): boolean {
    if (!this.isReady()) return false;

    const message = {
      type: "UPDATE_ELEMENTS",
      elements: elements.map((el) => this.sanitizeElement(el)),
      pageInfo,
    };

    return this.send(message);
  }

  // ============================================
  // Private Methods
  // ============================================

  private send(message: DeltaMessage | Record<string, unknown>): boolean {
    try {
      if (!this.iframe?.contentWindow) {
        return false;
      }

      this.iframe.contentWindow.postMessage(message, this.targetOrigin);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Element 직렬화 (Immer proxy 제거)
   */
  private sanitizeElement(element: Element): Element {
    try {
      return JSON.parse(JSON.stringify(element));
    } catch {
      // Proxy 오류 시 수동 복사
      return {
        id: element.id,
        tag: element.tag,
        props: this.sanitizeProps(element.props as Record<string, unknown>),
        parent_id: element.parent_id,
        page_id: element.page_id,
        order_num: element.order_num,
        customId: element.customId,
        events: element.events,
        dataBinding: element.dataBinding,
        layout_id: element.layout_id,
      };
    }
  }

  /**
   * Props 직렬화
   */
  private sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
    try {
      return JSON.parse(JSON.stringify(props));
    } catch {
      return { ...props };
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * 전역 Delta 메신저 인스턴스
 *
 * @example
 * ```ts
 * import { canvasDeltaMessenger } from './utils/canvasDeltaMessenger';
 *
 * // 초기화 (BuilderCore에서)
 * canvasDeltaMessenger.setIframe(iframeRef.current);
 *
 * // 사용 (Store에서)
 * canvasDeltaMessenger.sendElementAdded(newElement);
 * ```
 */
export const canvasDeltaMessenger = new CanvasDeltaMessenger();

// ============================================
// Utility Functions
// ============================================

/**
 * 두 props 객체의 차이점만 추출
 */
export function extractPropsChanges(
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  // 변경/추가된 값
  for (const key of Object.keys(nextProps)) {
    if (!deepEqual(prevProps[key], nextProps[key])) {
      changes[key] = nextProps[key];
    }
  }

  // 삭제된 값 (undefined로 설정)
  for (const key of Object.keys(prevProps)) {
    if (!(key in nextProps)) {
      changes[key] = undefined;
    }
  }

  return changes;
}

/**
 * 깊은 비교
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Delta 전송이 유리한지 판단
 *
 * - 변경이 적을 때: Delta
 * - 변경이 많을 때: Full Update
 */
export function shouldUseDelta(
  totalElements: number,
  changedCount: number
): boolean {
  // 요소가 적으면 Full Update가 더 간단
  if (totalElements < 50) return false;

  // 변경이 전체의 30% 미만이면 Delta 사용
  return changedCount < totalElements * 0.3;
}
