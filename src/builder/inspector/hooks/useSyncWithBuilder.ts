import { useEffect, useRef } from "react";
import { useInspectorState } from "./useInspectorState";
import { useStore } from "../../stores";
import { mapSelectedToElementUpdate } from "../utils/elementMapper";

/**
 * Inspector의 변경사항을 Builder store와 동기화하는 훅
 */
export function useSyncWithBuilder() {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const setSyncingToBuilder = useInspectorState(
    (state) => state.setSyncingToBuilder
  );
  const updateElement = useStore((state) => state.updateElement);

  // 마지막으로 동기화한 element를 추적
  const lastSyncedElementRef = useRef<string | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedElement) {
      lastSyncedElementRef.current = null;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      return;
    }

    // properties와 dataBinding을 포함한 전체 element 비교
    const currentElementJson = JSON.stringify({
      properties: selectedElement.properties,
      dataBinding: selectedElement.dataBinding,
    });

    if (currentElementJson === lastSyncedElementRef.current) {
      // 변경사항 없음 - 동기화 건너뛰기
      return;
    }

    // 즉시 추적 업데이트 (중복 실행 방지)
    lastSyncedElementRef.current = currentElementJson;

    // 이전 대기 중인 timeout 취소
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    // Inspector에서 변경된 내용을 Builder에 반영
    const elementUpdate = mapSelectedToElementUpdate(selectedElement);

    console.log("🔄 useSyncWithBuilder - 동기화 시작:", {
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      hasDataBinding: !!selectedElement.dataBinding,
      dataBinding: selectedElement.dataBinding,
      elementUpdate,
    });

    // debounce를 통한 최적화 (100ms)
    pendingTimeoutRef.current = setTimeout(() => {
      console.log("📤 useSyncWithBuilder - updateElement 호출:", {
        elementId: selectedElement.id,
        update: elementUpdate,
      });
      updateElement(selectedElement.id, elementUpdate);
      pendingTimeoutRef.current = null;
      // 동기화 완료 후 플래그 해제 (50ms 후 - Builder 상태 반영 대기)
      setTimeout(() => {
        setSyncingToBuilder(false);
      }, 50);
    }, 100);

    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, [selectedElement, updateElement, setSyncingToBuilder]);
}
