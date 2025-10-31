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
  // timeout의 고유 ID를 추적하여 레이스 컨디션 방지
  const timeoutIdRef = useRef<number>(0);

  useEffect(() => {
    console.log("🔄 useSyncWithBuilder useEffect 실행:", {
      hasSelectedElement: !!selectedElement,
      selectedElementId: selectedElement?.id,
      selectedElementStyle: selectedElement?.style,
    });

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
      console.log(
        "⚠️ useSyncWithBuilder - Builder에서 요소를 찾을 수 없음:",
        selectedElement.id
      );
      return;
    }

    // Inspector의 요소와 Builder store의 요소 비교
    // Note: computedStyle은 읽기 전용이므로 비교에서 제외
    // Store의 props에서 style과 computedStyle을 분리하여 비교
    const {
      style: storeStyle,
      computedStyle: _storeComputedStyle, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...storeProps
    } = currentElementInStore.props as Record<string, unknown>;

    const inspectorElementJson = JSON.stringify({
      customId: selectedElement.customId,
      properties: selectedElement.properties,
      style: selectedElement.style,
      dataBinding: selectedElement.dataBinding,
    });

    const storeElementJson = JSON.stringify({
      customId: currentElementInStore.customId,
      properties: storeProps,
      style: storeStyle,
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

    // timeout에 고유 ID 할당 (레이스 컨디션 방지)
    timeoutIdRef.current += 1;
    const currentTimeoutId = timeoutIdRef.current;

    // Inspector에서 변경된 내용을 Builder에 반영
    const elementUpdate = mapSelectedToElementUpdate(selectedElement);

    console.log("🔄 useSyncWithBuilder - 동기화 시작:", {
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      hasDataBinding: !!selectedElement.dataBinding,
      dataBinding: selectedElement.dataBinding,
      elementUpdate,
      timeoutId: currentTimeoutId,
    });

    // debounce를 통한 최적화 (100ms)
    pendingTimeoutRef.current = setTimeout(async () => {
      console.log("📤 useSyncWithBuilder - updateElement 호출:", {
        elementId: selectedElement.id,
        update: elementUpdate,
      });

      try {
        // Table 요소에 API Collection, Static Data, Supabase의 설정이 변경되면 기존 Column 자식 삭제
        // (Parameters, Headers, DataMapping 변경 시에는 삭제하지 않음)
        if (
          selectedElement.type === "Table" &&
          selectedElement.dataBinding?.type === "collection" &&
          (selectedElement.dataBinding?.source === "api" ||
            selectedElement.dataBinding?.source === "static" ||
            selectedElement.dataBinding?.source === "supabase")
        ) {
          // 현재 Store의 요소와 비교하여 Endpoint가 실제로 변경되었는지 확인
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

          // Endpoint 변경 또는 컬럼 매핑 변경 감지
          const endpointChanged = currentEndpoint !== newEndpoint;

          // Static Data/Supabase의 컬럼 매핑 변경 감지
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

          // Supabase의 테이블 또는 컬럼 변경 감지
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

          // API 컬럼 변경 감지
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

          // API Endpoint/컬럼 변경, Static Data 컬럼 매핑 변경, 또는 Supabase 테이블/컬럼 변경 시 컬럼 재설정
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
              console.log("🗑️ 컬럼 변경 감지 - 기존 Column 삭제:", {
                tableId: selectedElement.id,
                source: selectedElement.dataBinding?.source,
                oldEndpoint: currentEndpoint,
                newEndpoint: newEndpoint,
                columnMappingChanged,
                apiColumnsChanged:
                  selectedElement.dataBinding?.source === "api"
                    ? apiColumnsChanged
                    : undefined,
                currentApiColumns,
                newApiColumns,
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
              console.log("ℹ️ 컬럼 변경되었으나 삭제할 Column 없음:", {
                source: selectedElement.dataBinding?.source,
                oldEndpoint: currentEndpoint,
                newEndpoint: newEndpoint,
                columnMappingChanged,
                apiColumnsChanged:
                  selectedElement.dataBinding?.source === "api"
                    ? apiColumnsChanged
                    : undefined,
                currentApiColumns,
                newApiColumns,
              });
            }
          } else {
            console.log(
              "ℹ️ Parameters/Headers/DataMapping만 변경됨 - Column 유지",
              {
                apiColumnsChanged:
                  selectedElement.dataBinding?.source === "api"
                    ? apiColumnsChanged
                    : undefined,
                currentApiColumns,
                newApiColumns,
              }
            );
          }
        }

        await updateElement(selectedElement.id, elementUpdate);

        const payload: Record<string, unknown> = {};

        if (elementUpdate.props) {
          payload.props = elementUpdate.props;
        }

        // customId가 존재할 때 custom_id(snake_case)로 변환하여 전송
        if (Object.prototype.hasOwnProperty.call(elementUpdate, "customId")) {
          payload.custom_id = (elementUpdate as any).customId;
        }

        // dataBinding이 실제로 존재하고 null이 아닐 때만 data_binding(snake_case)으로 전송
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
      } finally {
        // 레이스 컨디션 방지: 이 timeout이 최신인 경우에만 ref와 플래그 정리
        // 다른 컴포넌트의 timeout이 이미 시작된 경우 무시
        if (currentTimeoutId === timeoutIdRef.current) {
          pendingTimeoutRef.current = null;
          // 동기화 완료 후 플래그 해제 (50ms 후 - Builder 상태 반영 대기)
          setTimeout(() => {
            // 플래그 해제 시에도 다시 한 번 확인 (50ms 사이에 새 timeout 시작 가능)
            if (currentTimeoutId === timeoutIdRef.current) {
              setSyncingToBuilder(false);
            }
          }, 50);
        }
      }
    }, 100);

    return () => {
      // ⚠️ IMPORTANT: timeout을 취소하지 않음 (대기 중인 변경사항 보존)
      // timeout은 클로저로 이전 selectedElement를 참조하므로 안전하게 완료됨
      // ref 정리는 finally 블록에서 timeoutId 체크 후 안전하게 처리됨

      // 새 컴포넌트 선택 시 추적 ref만 초기화 (다음 동기화가 이전 데이터 참조 방지)
      lastSyncedElementRef.current = null;

      // 플래그 해제하여 새로운 컴포넌트 선택이 차단되지 않도록 함
      setSyncingToBuilder(false);
    };
    // Note: elements를 의존성 배열에 포함하지 않음
    // - useStore는 항상 최신 상태를 반환하므로 useEffect 내에서 최신 elements 참조 가능
    // - elements 변경으로 인한 불필요한 재실행 방지 (무한 루프 방지)
    // - selectedElement가 변경될 때만 동기화 필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedElement,
    updateElement,
    setElements,
    setSyncingToBuilder,
    historyOperationInProgress,
  ]);
}
