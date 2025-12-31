/**
 * useInitialMountDetection Hook
 *
 * 컴포넌트 초기 마운트 시 데이터 업데이트를 방지하고,
 * 실제 데이터 변경이 발생했을 때만 업데이트를 트리거하는 hook
 *
 * 사용 사례:
 * - EventsPanel: DB에서 로드된 handlers/actions를 덮어쓰지 않기 위해
 * - 초기 렌더링 시 기본값이 DB 데이터를 덮어쓰는 것을 방지
 *
 * @example
 * ```tsx
 * useInitialMountDetection(handlers, (data) => {
 *   updateEvents(data);
 * });
 * ```
 */

import { useEffect, useRef } from "react";

interface UseInitialMountDetectionOptions<T> {
  /**
   * 추적할 데이터
   */
  data: T;

  /**
   * 데이터 변경 시 호출할 콜백
   */
  onUpdate: (data: T) => void;

  /**
   * 추가 의존성 배열 (선택사항)
   * data 외에 추가로 감지할 의존성들
   */
  dependencies?: readonly unknown[];

  /**
   * 초기 마운트 감지 키 (선택사항)
   * 이 키가 변경되면 초기 마운트 상태를 리셋
   * 예: 선택된 요소 ID 변경 시
   */
  resetKey?: string | number | null;
}

/**
 * 초기 마운트 감지 및 데이터 변경 추적 hook
 *
 * - 첫 번째 렌더링에서는 onUpdate를 호출하지 않음
 * - 이후 data의 내용이 실제로 변경되었을 때만 onUpdate 호출
 * - JSON.stringify를 사용한 deep comparison
 */
export function useInitialMountDetection<T>({
  data,
  onUpdate,
  dependencies = [],
  resetKey,
}: UseInitialMountDetectionOptions<T>): void {
  // 데이터의 JSON 표현 저장 (deep comparison용)
  const dataJsonRef = useRef<string>("");

  // 초기 마운트 플래그
  const isInitialMountRef = useRef(true);

  // 마지막 resetKey 저장
  const lastResetKeyRef = useRef<string | number | null>(resetKey ?? null);

  // resetKey 변경 감지
  useEffect(() => {
    const currentResetKey = resetKey ?? null;
    if (currentResetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = currentResetKey;
      isInitialMountRef.current = true;

      // resetKey 변경 시 현재 데이터를 초기 상태로 저장
      dataJsonRef.current = JSON.stringify(data);
    }
  }, [resetKey, data]);

  // 데이터 변경 감지 및 업데이트
  useEffect(() => {
    const currentJson = JSON.stringify(data);

    // 초기 마운트 시에는 onUpdate 호출하지 않음 (DB 데이터 보존)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      dataJsonRef.current = currentJson;
      return;
    }

    // 실제 내용이 변경되었을 때만 onUpdate 호출
    if (currentJson !== dataJsonRef.current) {
      dataJsonRef.current = currentJson;
      onUpdate(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, onUpdate, ...dependencies]);
}

/**
 * 간소화된 버전 - dependencies와 resetKey 없이 사용
 */
export function useInitialMountDetectionSimple<T>(
  data: T,
  onUpdate: (data: T) => void
): void {
  useInitialMountDetection({ data, onUpdate });
}
