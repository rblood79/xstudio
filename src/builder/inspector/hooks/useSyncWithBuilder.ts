import { useEffect, useRef } from "react";
import { useInspectorState } from "./useInspectorState";
import { useStore } from "../../stores";
import { mapSelectedToElementUpdate } from "../utils/elementMapper";
import { saveService } from "../../../services/save";
import { elementsApi } from "../../../services/api"; // elementsApi import 추가 ⭐

/**
 * Inspector의 변경사항을 Builder store와 동기화하는 훅
 */
export function useSyncWithBuilder(): void {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const setSyncingToBuilder = useInspectorState(
    (state) => state.setSyncingToBuilder
  );
  const updateElement = useStore((state) => state.updateElement);
  const elements = useStore((state) => state.elements);
  const historyOperationInProgress = useStore(
    (state) => state.historyOperationInProgress
  );

  // 마지막으로 동기화한 element를 추적
  const lastSyncedElementRef = useRef<string | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 히스토리 작업 중이면 동기화 건너뛰기
    if (historyOperationInProgress) {
      console.log("⏸️ useSyncWithBuilder - 히스토리 작업 중, 동기화 건너뛰기");
      return;
    }

    if (!selectedElement) {
      lastSyncedElementRef.current = null;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      return;
    }

    // Builder store에서 현재 요소 찾기
    const currentElementInStore = elements.find(
      (el) => el.id === selectedElement.id
    );

    if (!currentElementInStore) {
      console.log("⚠️ useSyncWithBuilder - Builder에서 요소를 찾을 수 없음:", selectedElement.id);
      return;
    }

    // Inspector의 요소와 Builder store의 요소 비교
    const inspectorElementJson = JSON.stringify({
      properties: selectedElement.properties,
      dataBinding: selectedElement.dataBinding,
    });

    const storeElementJson = JSON.stringify({
      properties: currentElementInStore.props,
      dataBinding: currentElementInStore.dataBinding,
    });

    // 실제 변경사항이 있는지 확인
    if (inspectorElementJson === storeElementJson) {
      console.log("🔄 useSyncWithBuilder - 변경사항 없음, 동기화 건너뛰기");
      return;
    }

    // 마지막 동기화와 비교
    if (inspectorElementJson === lastSyncedElementRef.current) {
      console.log("🔄 useSyncWithBuilder - 이미 동기화됨, 건너뛰기");
      return;
    }

    // 즉시 추적 업데이트 (중복 실행 방지)
    lastSyncedElementRef.current = inspectorElementJson;

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
    pendingTimeoutRef.current = setTimeout(async () => {
      console.log("📤 useSyncWithBuilder - updateElement 호출:", {
        elementId: selectedElement.id,
        update: elementUpdate,
      });

      try {
        // Table 요소에 API Collection이 설정되면 기존 Column 자식 삭제
        if (
          selectedElement.type === "Table" &&
          selectedElement.dataBinding?.type === "collection" &&
          selectedElement.dataBinding?.source === "api"
        ) {
          const childColumns = elements.filter(
            (el) =>
              el.tag === "Column" &&
              el.parent_id &&
              elements.some(
                (parent) =>
                  parent.id === el.parent_id &&
                  parent.tag === "TableHeader" &&
                  parent.parent_id === selectedElement.id
              )
          );

          if (childColumns.length > 0) {
            console.log("🗑️ API Collection 설정 - 기존 Column 삭제:", {
              tableId: selectedElement.id,
              columnsToDelete: childColumns.map((c) => c.id),
            });

            // 1. Store에서 삭제 (UI 즉시 반영)
            for (const column of childColumns) {
              await updateElement(column.id, { deleted: true } as never);
            }

            // 2. 데이터베이스에서 실제 삭제 ⭐
            try {
              const columnIds = childColumns.map((c) => c.id);
              await elementsApi.deleteMultipleElements(columnIds);
              console.log("✅ Column 요소들 DB에서 삭제 완료:", columnIds);
            } catch (error) {
              console.error("❌ Column 삭제 실패:", error);
            }
          }
        }

        await updateElement(selectedElement.id, elementUpdate);

        const payload: Record<string, unknown> = {};

        if (elementUpdate.props) {
          payload.props = elementUpdate.props;
        }

        // dataBinding이 실제로 존재하고 null이 아닐 때만 data_binding(snake_case)으로 전송
        if (
          Object.prototype.hasOwnProperty.call(elementUpdate, "dataBinding") &&
          elementUpdate.dataBinding !== null
        ) {
          payload.data_binding = elementUpdate.dataBinding;
        }

        if (Object.keys(payload).length > 0) {
          await saveService.savePropertyChange({
            table: "elements",
            id: selectedElement.id,
            data: payload,
          }, {
            source: 'inspector',
            allowPreviewSaves: true,
            validateSerialization: true
          });
        }
      } catch (error) {
        console.error("❌ useSyncWithBuilder - 저장 실패:", error);
      } finally {
        pendingTimeoutRef.current = null;
        // 동기화 완료 후 플래그 해제 (50ms 후 - Builder 상태 반영 대기)
        setTimeout(() => {
          setSyncingToBuilder(false);
        }, 50);
      }
    }, 100);

    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, [selectedElement, updateElement, setSyncingToBuilder, historyOperationInProgress, elements]);
}
