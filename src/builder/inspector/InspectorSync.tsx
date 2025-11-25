/**
 * InspectorSync - Builder와 Inspector 상태 동기화
 *
 * Builder의 selectedElementId → Inspector의 selectedElement 동기화
 * 패널 시스템에서 이 컴포넌트를 항상 마운트하여 동기화 유지
 */

import { useEffect, useMemo, useRef } from "react";
import { useInspectorState, useSyncWithBuilder } from "./hooks";
import { useStore } from "../stores";
import { mapElementToSelected } from "./utils/elementMapper";

export function InspectorSync() {
  const setSelectedElement = useInspectorState(
    (state) => state.setSelectedElement
  );
  const isSyncingToBuilder = useInspectorState(
    (state) => state.isSyncingToBuilder
  );

  // Builder의 전역 상태 (selectedElementId만 구독)
  const selectedElementId = useStore((state) => state.selectedElementId);

  // 마지막으로 처리한 syncVersion 추적 (Inspector → Builder 변경 무시)
  const lastProcessedSyncVersionRef = useRef<number>(0);

  // ⭐ FIX: 이전 선택 ID 추적 (선택 변경 우선 처리용)
  const previousElementIdRef = useRef<string | null>(null);

  // ⭐ Performance: Get selected element without subscribing to elementsMap
  // - elementsMap 구독하면 모든 element 변경 시 불필요한 리렌더 발생
  // - selectedElementId 변경 시에만 요소를 다시 가져옴
  const selectedBuilderElement = useMemo(() => {
    const elementsMap = useStore.getState().elementsMap;
    return selectedElementId
      ? elementsMap.get(selectedElementId) || null
      : null;
  }, [selectedElementId]);

  // Inspector → Builder 동기화
  useSyncWithBuilder();

  // Builder → Inspector 동기화
  useEffect(() => {
    const currentId = selectedBuilderElement?.id || null;
    const isSelectionChanged = currentId !== previousElementIdRef.current;

    // ⭐ FIX: 1순위 - 선택된 요소 ID가 변경되었는지 먼저 검사
    // syncVersion, isSyncingToBuilder와 무관하게 새 요소 선택은 항상 처리
    if (isSelectionChanged) {
      previousElementIdRef.current = currentId;

      if (!selectedBuilderElement) {
        setSelectedElement(null);
        return;
      }

      const mappedElement = mapElementToSelected(selectedBuilderElement);
      setSelectedElement(mappedElement);
      return; // 선택 변경 처리 완료
    }

    // ⭐ 2순위: 같은 요소의 속성 변경일 때만 syncVersion/isSyncingToBuilder 체크
    // Inspector → Builder 동기화 중이면 건너뛰기
    if (isSyncingToBuilder) {
      return;
    }

    // ⭐ getState()로 syncVersion 가져오기 (구독하지 않음)
    const syncVersion = useInspectorState.getState().syncVersion;

    // syncVersion이 증가했으면 Inspector가 변경한 것이므로 건너뛰기
    // (useSyncWithBuilder가 Builder 업데이트 완료 후 confirmSync를 호출하면
    // isSyncingToBuilder=false가 되지만, 이는 Inspector가 시작한 변경이므로 무시)
    if (syncVersion > lastProcessedSyncVersionRef.current) {
      lastProcessedSyncVersionRef.current = syncVersion;
      return;
    }

    // useEffect 내부에서 최신 selectedElement 가져오기 (stale closure 방지)
    const selectedElement = useInspectorState.getState().selectedElement;

    if (!selectedBuilderElement) {
      if (selectedElement) {
        setSelectedElement(null);
      }
      return;
    }

    const mappedElement = mapElementToSelected(selectedBuilderElement);

    // 같은 요소인 경우 props 비교 (Builder에서 외부 변경 감지용)
    const currentPropsJson = JSON.stringify(
      selectedElement?.properties,
      Object.keys(selectedElement?.properties || {}).sort()
    );
    const newPropsJson = JSON.stringify(
      mappedElement.properties,
      Object.keys(mappedElement.properties || {}).sort()
    );

    const currentDataBindingJson = JSON.stringify(selectedElement?.dataBinding);
    const newDataBindingJson = JSON.stringify(mappedElement.dataBinding);

    const currentStyleJson = JSON.stringify(
      selectedElement?.style,
      Object.keys(selectedElement?.style || {}).sort()
    );
    const newStyleJson = JSON.stringify(
      mappedElement.style,
      Object.keys(mappedElement.style || {}).sort()
    );

    const currentComputedStyleJson = JSON.stringify(
      selectedElement?.computedStyle,
      Object.keys(selectedElement?.computedStyle || {}).sort()
    );
    const newComputedStyleJson = JSON.stringify(
      mappedElement.computedStyle,
      Object.keys(mappedElement.computedStyle || {}).sort()
    );

    const currentEventsJson = JSON.stringify(selectedElement?.events);
    const newEventsJson = JSON.stringify(mappedElement.events);

    if (
      currentPropsJson !== newPropsJson ||
      currentDataBindingJson !== newDataBindingJson ||
      currentStyleJson !== newStyleJson ||
      currentComputedStyleJson !== newComputedStyleJson ||
      currentEventsJson !== newEventsJson
    ) {
      // 🔧 Builder에서 외부 변경 감지 (undo/redo, 다른 사용자 등)
      setSelectedElement(mappedElement);
    }
    // 🚨 IMPORTANT: selectedElement를 의존성에서 제거
    // - Inspector에서 selectedElement를 변경하면 이 useEffect가 다시 실행됨
    // - 하지만 syncVersion 체크로 이미 차단되므로 중복 업데이트 방지
    // - selectedBuilderElement 변경 시에만 동기화 (Builder → Inspector)
    // - getState()로 최신 selectedElement와 syncVersion을 가져와 stale closure 방지
  }, [
    selectedBuilderElement,
    // selectedElement 제거 (Inspector → Builder 변경 시 중복 실행 방지)
    setSelectedElement,
    isSyncingToBuilder,
    // syncVersion 제거 (getState()로 가져옴 - 구독 없음)
  ]);

  // 렌더링하지 않음 (상태 동기화만 수행)
  return null;
}
