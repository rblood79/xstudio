/**
 * Delta Messenger Hook
 *
 * @deprecated 🚀 Phase 10 B2.4: WebGL Canvas로 마이그레이션으로 인해 폐기됨
 *
 * 🚀 Phase 4: Canvas에 Delta 업데이트를 전송하는 훅
 *
 * 성능 비교:
 * - Before: 전체 elements 배열 전송 → O(n) 직렬화 + 전송
 * - After: 변경된 요소만 전송 → O(1) 직렬화 + 전송
 *
 * WebGL Canvas는 Zustand 스토어에서 직접 읽으므로 Delta 전송이 필요 없습니다.
 *
 * @since 2025-12-10 Phase 4 Canvas Delta Updates
 * @deprecated 2025-12-11 Phase 10 B2.4 - WebGL Canvas로 대체
 * @see src/builder/workspace/canvas/store/canvasStore.ts
 */

import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../stores';
import { MessageService } from '../../utils/messaging';
import {
  canvasDeltaMessenger,
  extractPropsChanges,
  shouldUseDelta,
} from '../utils/canvasDeltaMessenger';
import type { Element } from '../../types/core/store.types';

// Delta 전송 통계
interface DeltaStats {
  deltaSent: number;
  fullUpdateSent: number;
  bytessSaved: number;
}

export interface UseDeltaMessengerReturn {
  /**
   * Delta 메신저 초기화 (BuilderCore에서 호출)
   */
  initializeDeltaMessenger: (iframe: HTMLIFrameElement | null) => void;

  /**
   * 요소 추가 Delta 전송
   */
  sendDeltaElementAdded: (element: Element, childElements?: Element[]) => boolean;

  /**
   * 요소 업데이트 Delta 전송
   */
  sendDeltaElementUpdated: (
    elementId: string,
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>,
    options?: { parentId?: string | null; orderNum?: number }
  ) => boolean;

  /**
   * 요소 삭제 Delta 전송
   */
  sendDeltaElementRemoved: (elementId: string, childElementIds?: string[]) => boolean;

  /**
   * 배치 업데이트 Delta 전송
   */
  sendDeltaBatchUpdate: (
    updates: Array<{
      elementId: string;
      prevProps?: Record<string, unknown>;
      nextProps?: Record<string, unknown>;
      parentId?: string | null;
      orderNum?: number;
    }>
  ) => boolean;

  /**
   * Delta 사용 여부 판단 후 최적 전송 방식 선택
   */
  sendOptimalUpdate: (
    prevElements: Element[],
    nextElements: Element[],
    changedIds: string[]
  ) => void;

  /**
   * Delta 통계 조회
   */
  getDeltaStats: () => DeltaStats;
}

export const useDeltaMessenger = (): UseDeltaMessengerReturn => {
  const statsRef = useRef<DeltaStats>({
    deltaSent: 0,
    fullUpdateSent: 0,
    bytessSaved: 0,
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isReadyRef = useRef(false);

  // Store에서 요소 개수 가져오기 (Delta 사용 여부 판단용)
  const elementsCount = useStore((state) => state.elements.length);

  /**
   * Delta 메신저 초기화
   */
  const initializeDeltaMessenger = useCallback(
    (iframe: HTMLIFrameElement | null) => {
      iframeRef.current = iframe;
      canvasDeltaMessenger.setIframe(iframe);

      if (iframe) {
        isReadyRef.current = true;
        console.log('🚀 [Delta] Messenger initialized');
      } else {
        isReadyRef.current = false;
      }
    },
    []
  );

  /**
   * Canvas Ready 이벤트 리스닝
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'PREVIEW_READY') {
        isReadyRef.current = true;

        // iframe 재확인
        const iframe = MessageService.getIframe();
        if (iframe) {
          canvasDeltaMessenger.setIframe(iframe);
        }
      }

      // Delta ACK 처리
      if (event.data.type === 'DELTA_ACK') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 [Delta] ACK received:', event.data.operation);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * 요소 추가 Delta 전송
   */
  const sendDeltaElementAdded = useCallback(
    (element: Element, childElements?: Element[]): boolean => {
      if (!isReadyRef.current) {
        console.warn('🚀 [Delta] Not ready, skipping element add');
        return false;
      }

      const success = canvasDeltaMessenger.sendElementAdded(element, childElements);

      if (success) {
        statsRef.current.deltaSent++;
        // 예상 바이트 절약: 전체 elements 배열 대신 단일 요소 전송
        statsRef.current.bytessSaved += elementsCount * 100; // 대략적인 추정
      }

      return success;
    },
    [elementsCount]
  );

  /**
   * 요소 업데이트 Delta 전송
   */
  const sendDeltaElementUpdated = useCallback(
    (
      elementId: string,
      prevProps: Record<string, unknown>,
      nextProps: Record<string, unknown>,
      options?: { parentId?: string | null; orderNum?: number }
    ): boolean => {
      if (!isReadyRef.current) {
        console.warn('🚀 [Delta] Not ready, skipping element update');
        return false;
      }

      // Props 변경사항만 추출
      const propsChanges = extractPropsChanges(prevProps, nextProps);

      // 변경사항이 없으면 스킵
      if (Object.keys(propsChanges).length === 0 && !options?.parentId && !options?.orderNum) {
        return false;
      }

      const success = canvasDeltaMessenger.sendElementUpdated(
        elementId,
        propsChanges,
        options
      );

      if (success) {
        statsRef.current.deltaSent++;
        // 예상 바이트 절약
        statsRef.current.bytessSaved += elementsCount * 100;
      }

      return success;
    },
    [elementsCount]
  );

  /**
   * 요소 삭제 Delta 전송
   */
  const sendDeltaElementRemoved = useCallback(
    (elementId: string, childElementIds?: string[]): boolean => {
      if (!isReadyRef.current) {
        console.warn('🚀 [Delta] Not ready, skipping element remove');
        return false;
      }

      const success = canvasDeltaMessenger.sendElementRemoved(elementId, childElementIds);

      if (success) {
        statsRef.current.deltaSent++;
        statsRef.current.bytessSaved += elementsCount * 100;
      }

      return success;
    },
    [elementsCount]
  );

  /**
   * 배치 업데이트 Delta 전송
   */
  const sendDeltaBatchUpdate = useCallback(
    (
      updates: Array<{
        elementId: string;
        prevProps?: Record<string, unknown>;
        nextProps?: Record<string, unknown>;
        parentId?: string | null;
        orderNum?: number;
      }>
    ): boolean => {
      if (!isReadyRef.current) {
        console.warn('🚀 [Delta] Not ready, skipping batch update');
        return false;
      }

      // Props 변경사항 추출
      const deltaUpdates = updates.map((u) => {
        const propsChanges =
          u.prevProps && u.nextProps
            ? extractPropsChanges(u.prevProps, u.nextProps)
            : undefined;

        return {
          elementId: u.elementId,
          propsChanges,
          parentId: u.parentId,
          orderNum: u.orderNum,
        };
      });

      const success = canvasDeltaMessenger.sendBatchUpdate(deltaUpdates);

      if (success) {
        statsRef.current.deltaSent++;
        statsRef.current.bytessSaved += elementsCount * 100 * updates.length;
      }

      return success;
    },
    [elementsCount]
  );

  /**
   * Delta 사용 여부 판단 후 최적 전송 방식 선택
   */
  const sendOptimalUpdate = useCallback(
    (prevElements: Element[], nextElements: Element[], changedIds: string[]) => {
      const iframe = MessageService.getIframe();
      if (!iframe?.contentWindow) return;

      // Delta 사용 여부 판단
      const useDelta = shouldUseDelta(nextElements.length, changedIds.length);

      if (useDelta && isReadyRef.current) {
        // Delta 전송
        changedIds.forEach((id) => {
          const prevEl = prevElements.find((el) => el.id === id);
          const nextEl = nextElements.find((el) => el.id === id);

          if (!prevEl && nextEl) {
            // 추가된 요소
            sendDeltaElementAdded(nextEl);
          } else if (prevEl && !nextEl) {
            // 삭제된 요소
            sendDeltaElementRemoved(id);
          } else if (prevEl && nextEl) {
            // 업데이트된 요소
            sendDeltaElementUpdated(
              id,
              prevEl.props as Record<string, unknown>,
              nextEl.props as Record<string, unknown>,
              {
                parentId:
                  prevEl.parent_id !== nextEl.parent_id ? nextEl.parent_id : undefined,
                orderNum:
                  prevEl.order_num !== nextEl.order_num ? nextEl.order_num : undefined,
              }
            );
          }
        });

        console.log(`🚀 [Delta] Sent ${changedIds.length} delta updates`);
      } else {
        // 전체 전송 (기존 방식)
        const message = {
          type: 'UPDATE_ELEMENTS',
          elements: nextElements,
        };
        iframe.contentWindow.postMessage(message, window.location.origin);

        statsRef.current.fullUpdateSent++;
        console.log(`🚀 [Delta] Sent full update (${nextElements.length} elements)`);
      }
    },
    [sendDeltaElementAdded, sendDeltaElementRemoved, sendDeltaElementUpdated]
  );

  /**
   * Delta 통계 조회
   */
  const getDeltaStats = useCallback((): DeltaStats => {
    return { ...statsRef.current };
  }, []);

  return {
    initializeDeltaMessenger,
    sendDeltaElementAdded,
    sendDeltaElementUpdated,
    sendDeltaElementRemoved,
    sendDeltaBatchUpdate,
    sendOptimalUpdate,
    getDeltaStats,
  };
};
