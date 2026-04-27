/**
 * Overlay RAF Scheduler
 *
 * 🚀 Phase 7.1: Multi-select 오버레이 업데이트 RAF 배치
 *
 * 문제:
 * - 다중 선택 시 N개 요소에 대해 getBoundingClientRect() N번 호출
 * - 스크롤/리사이즈 시 매 이벤트마다 DOM 쿼리 실행
 * - 대량 선택 (100+) 시 한 프레임에 모두 처리하여 프레임 드롭
 *
 * 해결:
 * - RAF 기반 코얼레싱 (중복 요청 병합)
 * - Chunk 처리 (50개씩 분할하여 프레임 양보)
 * - 쓰로틀링 (100ms 이하 간격 무시)
 *
 * @since 2025-12-18 Phase 7.1
 */

import { useRef, useCallback, useEffect } from 'react';

// ============================================
// Types
// ============================================

export interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface OverlayUpdateResult {
  rects: Map<string, OverlayRect>;
  tags: Map<string, string>;
  /**
   * true면 기존 결과를 버리고 새 배치로 시작 (Selection 변경 등)
   * SelectionOverlay에서 Map 초기화 용도로 사용
   */
  reset?: boolean;
  /** true면 현재 배치 처리 완료 */
  done?: boolean;
  /** 전체 대상 요소 수 (debug/telemetry 용) */
  total?: number;
  /** 현재까지 처리된 요소 수 (debug/telemetry 용) */
  processed?: number;
}

export type OverlayUpdateCallback = (result: OverlayUpdateResult) => void;

// ============================================
// Constants
// ============================================

/** 한 프레임에 처리할 최대 요소 수 */
const CHUNK_SIZE = 50;

/** 스크롤/리사이즈 쓰로틀 간격 (ms) */
const THROTTLE_INTERVAL = 100;

// ============================================
// OverlayUpdateScheduler Class
// ============================================

/**
 * RAF 기반 오버레이 업데이트 스케줄러
 *
 * 사용법:
 * ```typescript
 * const scheduler = new OverlayUpdateScheduler(
 *   (result) => setOverlays(result.rects),
 *   () => iframeRef.current?.contentDocument
 * );
 *
 * // 요소 선택 시
 * scheduler.schedule(['element-1', 'element-2']);
 *
 * // cleanup
 * scheduler.clear();
 * ```
 */
export class OverlayUpdateScheduler {
  private pendingIds = new Set<string>();
  private rafId: number | null = null;
  private lastUpdateTime = 0;
  private onUpdate: OverlayUpdateCallback;
  private getDocument: () => Document | null | undefined;
  /**
   * in-flight chunk 처리 취소용 토큰
   * schedule()이 호출될 때마다 증가하며, 진행 중인 chunk는 토큰 불일치 시 조기 종료합니다.
   */
  private runToken = 0;

  constructor(
    onUpdate: OverlayUpdateCallback,
    getDocument: () => Document | null | undefined
  ) {
    this.onUpdate = onUpdate;
    this.getDocument = getDocument;
  }

  /**
   * 요소 ID 목록을 스케줄에 추가
   * 같은 프레임 내 중복 요청은 병합됨
   */
  schedule(elementIds: string[], immediate = false): void {
    // 새 스케줄이 들어오면 진행 중인 chunk 처리 취소 (stale update 방지)
    this.runToken++;

    for (const id of elementIds) {
      this.pendingIds.add(id);
    }

    if (immediate) {
      // 즉시 실행 (초기 선택 시)
      this.cancelPending();
      this.flush();
    } else if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  /**
   * 쓰로틀된 스케줄 (스크롤/리사이즈용)
   * THROTTLE_INTERVAL 이내 재호출 시 무시
   */
  scheduleThrottled(elementIds: string[]): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < THROTTLE_INTERVAL) {
      // 쓰로틀 간격 내: 스킵
      return;
    }
    this.schedule(elementIds);
  }

  /**
   * 대기 중인 스케줄 취소
   */
  cancelPending(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 스케줄러 정리
   */
  clear(): void {
    this.cancelPending();
    this.pendingIds.clear();
  }

  /**
   * 대기 중인 요소들 처리 (RAF 콜백)
   */
  private flush(): void {
    this.rafId = null;
    this.lastUpdateTime = Date.now();

    const ids = Array.from(this.pendingIds);
    this.pendingIds.clear();

    if (ids.length === 0) return;

    const doc = this.getDocument();
    if (!doc) return;

    // Chunk 처리 시작
    const runToken = this.runToken;
    this.processChunk(doc, ids, 0, runToken);
  }

  /**
   * Chunk 단위로 요소 처리 (프레임 양보)
   */
  private processChunk(
    doc: Document,
    ids: string[],
    startIdx: number,
    runToken: number
  ): void {
    // schedule()이 호출되어 토큰이 바뀌었으면 중단
    if (runToken !== this.runToken) return;

    const rects = new Map<string, OverlayRect>();
    const tags = new Map<string, string>();
    const endIdx = Math.min(startIdx + CHUNK_SIZE, ids.length);

    for (let i = startIdx; i < endIdx; i++) {
      const id = ids[i];
      const element = this.findElement(doc, id);

      if (element) {
        const rect = element.getBoundingClientRect();
        rects.set(id, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        tags.set(id, element.tagName.toLowerCase());
      }
    }

    // schedule()이 호출되어 토큰이 바뀌었으면 결과 전달 없이 중단
    if (runToken !== this.runToken) return;

    // 결과 전달
    this.onUpdate({
      rects,
      tags,
      reset: startIdx === 0,
      done: endIdx >= ids.length,
      total: ids.length,
      processed: endIdx,
    });

    // 남은 chunk가 있으면 다음 프레임에 처리
    if (endIdx < ids.length) {
      requestAnimationFrame(() => this.processChunk(doc, ids, endIdx, runToken));
    }
  }

  /**
   * 요소 찾기 (body 특수 처리 포함)
   */
  private findElement(doc: Document, elementId: string): HTMLElement | null {
    // 일반 요소 찾기
    let element = doc.querySelector(
      `[data-element-id="${elementId}"]`
    ) as HTMLElement | null;

    // body 특수 처리: 실제 <body> 태그 확인
    if (!element && doc.body.getAttribute('data-element-id') === elementId) {
      element = doc.body;
    }

    return element;
  }
}

// ============================================
// React Hook
// ============================================

/**
 * 오버레이 RAF 스케줄링 훅
 *
 * @param onUpdate - 업데이트 결과 콜백
 * @param getDocument - iframe document getter
 * @returns schedule, scheduleThrottled 함수
 *
 * @example
 * ```tsx
 * const { schedule, scheduleThrottled } = useOverlayRAF(
 *   (result) => setMultiOverlays(result.rects),
 *   () => iframeRef.current?.contentDocument
 * );
 *
 * // 요소 선택 시
 * useEffect(() => {
 *   schedule(selectedElementIds, true); // immediate
 * }, [selectedElementIds]);
 *
 * // 스크롤/리사이즈 시
 * useEffect(() => {
 *   window.addEventListener('scroll', () => {
 *     scheduleThrottled(selectedElementIds);
 *   });
 * }, []);
 * ```
 */
export function useOverlayRAF(
  onUpdate: OverlayUpdateCallback,
  getDocument: () => Document | null | undefined
): {
  schedule: (elementIds: string[], immediate?: boolean) => void;
  scheduleThrottled: (elementIds: string[]) => void;
  clear: () => void;
} {
  const schedulerRef = useRef<OverlayUpdateScheduler | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const getDocumentRef = useRef(getDocument);

  // 레퍼런스 업데이트
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    getDocumentRef.current = getDocument;
  }, [getDocument]);

  // 스케줄러 초기화 (한 번만)
  useEffect(() => {
    schedulerRef.current = new OverlayUpdateScheduler(
      (result) => onUpdateRef.current(result),
      () => getDocumentRef.current()
    );

    return () => {
      schedulerRef.current?.clear();
      schedulerRef.current = null;
    };
  }, []);

  // 메모이즈된 함수들
  const schedule = useCallback((elementIds: string[], immediate = false) => {
    schedulerRef.current?.schedule(elementIds, immediate);
  }, []);

  const scheduleThrottled = useCallback((elementIds: string[]) => {
    schedulerRef.current?.scheduleThrottled(elementIds);
  }, []);

  const clear = useCallback(() => {
    schedulerRef.current?.clear();
  }, []);

  return { schedule, scheduleThrottled, clear };
}

// ============================================
// Utility: Body Element Check
// ============================================

/**
 * 🚀 Phase 7.2: Body element 조기 종료 체크
 *
 * Body 요소가 선택된 경우 오버레이 계산을 스킵할 수 있습니다.
 * (Body는 전체 페이지를 덮으므로 오버레이가 불필요할 수 있음)
 *
 * @param elementId - 선택된 요소 ID
 * @param elementsMap - 요소 Map
 * @returns true면 body 선택
 */
export function isBodyElement(
  elementId: string,
  elementsMap: Map<string, { type: string }>
): boolean {
  const element = elementsMap.get(elementId);
  return element?.type?.toLowerCase() === 'body';
}

/**
 * 선택된 요소들 중 body만 있는지 확인
 *
 * @param elementIds - 선택된 요소 ID 목록
 * @param elementsMap - 요소 Map
 * @returns true면 모든 선택이 body (오버레이 스킵 가능)
 */
export function isOnlyBodySelected(
  elementIds: string[],
  elementsMap: Map<string, { type: string }>
): boolean {
  if (elementIds.length === 0) return false;
  return elementIds.every((id) => isBodyElement(id, elementsMap));
}
