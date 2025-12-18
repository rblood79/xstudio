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
  // ⭐ 최적화: syncVersion, confirmSync는 getState()로 가져옴 (구독하지 않음)
  const updateElement = useStore((state) => state.updateElement);
  const setElements = useStore((state) => state.setElements);
  // ⭐ 최적화: elements는 getState()로 가져옴 (구독하지 않음)
  const historyOperationInProgress = useStore(
    (state) => state.historyOperationInProgress
  );

  // 마지막으로 동기화한 element ID 추적
  const lastSyncedElementIdRef = useRef<string | null>(null);
  // 🚀 Phase 15: 선택 변경 감지 - 선택만 했을 때는 동기화 스킵
  const previousElementIdRef = useRef<string | null>(null);
  // 🚀 Phase 15: 이전 상태 참조 저장 (실제 변경 감지용)
  const previousStateRef = useRef<{
    customId: string | undefined;
    properties: Record<string, unknown> | undefined;
    style: React.CSSProperties | undefined;
    dataBinding: unknown;
    events: unknown;
  } | null>(null);

  useEffect(() => {
    // 히스토리 작업 중이면 동기화 건너뛰기
    if (historyOperationInProgress) {
      return;
    }

    if (!selectedElement) {
      lastSyncedElementIdRef.current = null;
      previousElementIdRef.current = null;
      previousStateRef.current = null;
      return;
    }

    // 🚀 Phase 15: 선택 변경 감지 - 다른 요소를 선택했으면 동기화 스킵
    // Inspector에서 속성을 편집한 것이 아니라 단순히 다른 요소를 선택한 것
    const isSelectionChange = previousElementIdRef.current !== selectedElement.id;
    if (isSelectionChange) {
      previousElementIdRef.current = selectedElement.id;
      // 새 요소의 현재 상태 저장 (이후 변경 감지 기준점)
      previousStateRef.current = {
        customId: selectedElement.customId,
        properties: selectedElement.properties,
        style: selectedElement.style,
        dataBinding: selectedElement.dataBinding,
        events: selectedElement.events,
      };
      lastSyncedElementIdRef.current = null; // 새 요소이므로 초기화
      return; // 선택 변경 시에는 동기화하지 않음
    }

    // ⭐ getState()로 elements, elementsMap 가져오기 (구독하지 않음)
    const { elements, elementsMap } = useStore.getState();

    // 🚀 Phase 4: elementsMap O(1) 조회 활용
    const currentElementInStore = elementsMap.get(selectedElement.id);

    if (!currentElementInStore) {
      return;
    }

    // 🚀 Phase 15: 이전 Inspector 상태와 비교 (spread로 인한 참조 문제 해결)
    // 기존: store와 비교 → spread로 항상 새 객체 → 항상 다름
    // 개선: 이전 Inspector 상태와 비교 → 실제 변경만 감지
    const prev = previousStateRef.current;
    if (!prev) {
      // 이전 상태가 없으면 저장만 하고 스킵 (첫 렌더링)
      previousStateRef.current = {
        customId: selectedElement.customId,
        properties: selectedElement.properties,
        style: selectedElement.style,
        dataBinding: selectedElement.dataBinding,
        events: selectedElement.events,
      };
      return;
    }

    // 🚀 Phase 15: 이전 Inspector 상태와 참조 비교 (실제 변경 감지)
    const hasCustomIdChange = selectedElement.customId !== prev.customId;
    const hasPropertiesChange = selectedElement.properties !== prev.properties;
    const hasStyleChange = selectedElement.style !== prev.style;
    const hasDataBindingChange = selectedElement.dataBinding !== prev.dataBinding;
    const hasEventsChange = selectedElement.events !== prev.events;

    // 참조가 모두 같으면 동기화 스킵 (실제 변경 없음)
    if (
      !hasCustomIdChange &&
      !hasPropertiesChange &&
      !hasStyleChange &&
      !hasDataBindingChange &&
      !hasEventsChange
    ) {
      return;
    }

    // 현재 상태를 이전 상태로 저장 (다음 비교를 위해)
    previousStateRef.current = {
      customId: selectedElement.customId,
      properties: selectedElement.properties,
      style: selectedElement.style,
      dataBinding: selectedElement.dataBinding,
      events: selectedElement.events,
    };

    lastSyncedElementIdRef.current = selectedElement.id;

    // ⭐ getState()로 syncVersion 가져오기 (구독하지 않음)
    const currentSyncVersion = useInspectorState.getState().syncVersion;

    // Inspector에서 변경된 내용을 Builder에 반영
    const elementUpdate = mapSelectedToElementUpdate(selectedElement);

    // 🚀 Phase 13: 즉시 동기화 (requestIdleCallback 제거)
    (async () => {
      try {
        // Table 요소에 API Collection, Static Data, Supabase의 설정이 변경되면 기존 Column 자식 삭제
        if (
          selectedElement.type === "Table" &&
          selectedElement.dataBinding?.type === "collection" &&
          (selectedElement.dataBinding?.source === "api" ||
            selectedElement.dataBinding?.source === "static" ||
            selectedElement.dataBinding?.source === "supabase")
        ) {
          const currentConfig = currentElementInStore?.dataBinding?.config;
          const newConfig = selectedElement.dataBinding?.config;

          const currentEndpoint =
            currentConfig && "endpoint" in currentConfig
              ? currentConfig.endpoint
              : undefined;
          const newEndpoint =
            newConfig && "endpoint" in newConfig
              ? newConfig.endpoint
              : undefined;

          const endpointChanged = currentEndpoint !== newEndpoint;

          const currentColumnMapping =
            currentConfig && "columnMapping" in currentConfig
              ? currentConfig.columnMapping
              : undefined;
          const newColumnMapping =
            newConfig && "columnMapping" in newConfig
              ? newConfig.columnMapping
              : undefined;
          const columnMappingChanged =
            JSON.stringify(currentColumnMapping) !==
            JSON.stringify(newColumnMapping);

          const currentTable =
            currentConfig && "table" in currentConfig
              ? currentConfig.table
              : undefined;
          const newTable =
            newConfig && "table" in newConfig ? newConfig.table : undefined;
          const currentColumns =
            currentConfig && "columns" in currentConfig
              ? currentConfig.columns
              : undefined;
          const newColumns =
            newConfig && "columns" in newConfig ? newConfig.columns : undefined;
          const supabaseTableChanged = currentTable !== newTable;
          const supabaseColumnsChanged =
            JSON.stringify(currentColumns) !== JSON.stringify(newColumns);

          const currentApiColumns =
            selectedElement.dataBinding?.source === "api" &&
            currentConfig &&
            "columns" in currentConfig
              ? currentConfig.columns
              : undefined;
          const newApiColumns =
            selectedElement.dataBinding?.source === "api" &&
            newConfig &&
            "columns" in newConfig
              ? newConfig.columns
              : undefined;
          const apiColumnsChanged =
            selectedElement.dataBinding?.source === "api" &&
            JSON.stringify(currentApiColumns) !== JSON.stringify(newApiColumns);

          if (
            endpointChanged ||
            apiColumnsChanged ||
            (selectedElement.dataBinding?.source === "static" &&
              columnMappingChanged) ||
            (selectedElement.dataBinding?.source === "supabase" &&
              (supabaseTableChanged ||
                supabaseColumnsChanged ||
                columnMappingChanged))
          ) {
            const tableHeaderIds = new Set(
              elements
                .filter(
                  (el) =>
                    el.tag === "TableHeader" &&
                    el.parent_id === selectedElement.id
                )
                .map((el) => el.id)
            );

            const childColumns = elements.filter(
              (el) =>
                el.tag === "Column" &&
                el.parent_id &&
                tableHeaderIds.has(el.parent_id)
            );

            if (childColumns.length > 0) {
              const columnIdsToDelete = new Set(childColumns.map((c) => c.id));

              try {
                await elementsApi.deleteMultipleElements([...columnIdsToDelete]);
              } catch (error) {
                console.error("❌ DB Column 삭제 실패:", error);
              }

              const newElements = elements.filter(
                (el) => !columnIdsToDelete.has(el.id)
              );
              setElements(newElements);
            }
          }
        }

        await updateElement(selectedElement.id, elementUpdate);

        const payload: Record<string, unknown> = {};

        if (elementUpdate.props) {
          payload.props = elementUpdate.props;
        }

        if (Object.prototype.hasOwnProperty.call(elementUpdate, "customId")) {
          payload.custom_id = (elementUpdate as { customId?: string }).customId;
        }

        if (
          Object.prototype.hasOwnProperty.call(elementUpdate, "dataBinding") &&
          elementUpdate.dataBinding !== null
        ) {
          payload.data_binding = elementUpdate.dataBinding;
        }

        if (Object.keys(payload).length > 0) {
          await saveService.savePropertyChange(
            {
              table: "elements",
              id: selectedElement.id,
              data: payload,
            },
            {
              source: "inspector",
              allowPreviewSaves: true,
              validateSerialization: true,
            }
          );
        }
      } catch (error) {
        console.error("❌ useSyncWithBuilder - 저장 실패:", error);
        lastSyncedElementIdRef.current = null;
        useInspectorState.getState().confirmSync(currentSyncVersion);
      } finally {
        useInspectorState.getState().confirmSync(currentSyncVersion);
      }
    })();

    return () => {
      // 새 컴포넌트 선택 시 추적 ref만 초기화
      lastSyncedElementIdRef.current = null;
    };
    // ⭐ 최적화: elements, syncVersion, confirmSync를 의존성에서 제거
    // - getState()로 가져오므로 구독하지 않음 (불필요한 재실행 방지)
    // - selectedElement 변경 시에만 동기화 실행
    // - useStore.getState()는 항상 최신 상태를 반환하므로 안전함
     
  }, [
    selectedElement,
    // syncVersion 제거 (getState()로 가져옴)
    updateElement,
    setElements,
    // confirmSync 제거 (getState()로 가져옴)
    // elements 제거 (getState()로 가져옴)
    historyOperationInProgress,
  ]);
}
