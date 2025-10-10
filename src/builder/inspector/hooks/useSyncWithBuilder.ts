import { useEffect, useRef } from "react";
import { useInspectorState } from "./useInspectorState";
import { useStore } from "../../stores";
import { mapSelectedToElementUpdate } from "../utils/elementMapper";
import { saveService } from "../../../services/save";
import { elementsApi } from "../../../services/api";

/**
 * Inspector의 변경사항을 Builder store와 동기화하는 훅
 */
export function useSyncWithBuilder(): void {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const setSyncingToBuilder = useInspectorState(
    (state) => state.setSyncingToBuilder
  );
  const updateElement = useStore((state) => state.updateElement);
  const setElements = useStore((state) => state.setElements);
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
        // Table 요소에 API Collection의 Endpoint가 변경되면 기존 Column 자식 삭제
        // (Parameters, Headers, DataMapping 변경 시에는 삭제하지 않음)
        if (
          selectedElement.type === "Table" &&
          selectedElement.dataBinding?.type === "collection" &&
          selectedElement.dataBinding?.source === "api"
        ) {
          // 현재 Store의 요소와 비교하여 Endpoint가 실제로 변경되었는지 확인
          const currentConfig = currentElementInStore?.dataBinding?.config;
          const newConfig = selectedElement.dataBinding?.config;
          
          const currentEndpoint = 
            currentConfig && 'endpoint' in currentConfig ? currentConfig.endpoint : undefined;
          const newEndpoint = 
            newConfig && 'endpoint' in newConfig ? newConfig.endpoint : undefined;
          
          const endpointChanged = currentEndpoint !== newEndpoint;

          if (endpointChanged) {
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
              console.log("🗑️ Endpoint 변경 감지 - 기존 Column 삭제:", {
                tableId: selectedElement.id,
                oldEndpoint: currentEndpoint,
                newEndpoint: newEndpoint,
                columnsToDelete: childColumns.map((c) => c.id),
              });

              // 한 번에 모든 Column ID 수집
              const columnIdsToDelete = childColumns.map((c) => c.id);

              // 1. DB에서 일괄 삭제
              try {
                await elementsApi.deleteMultipleElements(columnIdsToDelete);
                console.log("✅ DB에서 Column 삭제 완료:", columnIdsToDelete);
              } catch (error) {
                console.error("❌ DB Column 삭제 실패:", error);
              }

              // 2. Store에서 일괄 제거 (새 배열 참조 생성)
              const newElements = elements.filter(
                (el) => !columnIdsToDelete.includes(el.id)
              );
              setElements(newElements);
              console.log("✅ Store에서 Column 제거 완료:", {
                삭제전: elements.length,
                삭제후: newElements.length,
                삭제된개수: elements.length - newElements.length,
              });
            } else {
              console.log("ℹ️ Endpoint 변경되었으나 삭제할 Column 없음:", {
                oldEndpoint: currentEndpoint,
                newEndpoint: newEndpoint,
              });
            }
          } else {
            console.log("ℹ️ Parameters/Headers/DataMapping만 변경됨 - Column 유지");
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
  }, [selectedElement, updateElement, setElements, setSyncingToBuilder, historyOperationInProgress, elements]);
}
