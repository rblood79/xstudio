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
import { shallowEqual, shallowEqualStyle, shallowEqualEvents } from "./utils/shallowEqual";

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

  // ⭐ Preview에서 보낸 props 구독 (body 등 요소 선택 시 최신 props 사용)
  const selectedElementProps = useStore((state) => state.selectedElementProps);

  // ⭐ Performance: Get selected element without subscribing to elementsMap
  // - elementsMap 구독하면 모든 element 변경 시 불필요한 리렌더 발생
  // - selectedElementId 변경 시에만 요소를 다시 가져옴
  // - ⭐ FIX: selectedElementProps도 의존성에 추가 (Preview에서 보낸 최신 props 반영)
  const selectedBuilderElement = useMemo(() => {
    const elementsMap = useStore.getState().elementsMap;
    const element = selectedElementId
      ? elementsMap.get(selectedElementId) || null
      : null;

    // ⭐ FIX: Preview에서 보낸 props가 있으면 병합 (최신 style/computedStyle 포함)
    if (element && selectedElementProps && Object.keys(selectedElementProps).length > 0) {
      return {
        ...element,
        props: {
          ...element.props,
          ...selectedElementProps,
        },
      };
    }

    return element;
  }, [selectedElementId, selectedElementProps]);

  // Inspector → Builder 동기화
  useSyncWithBuilder();

  // Builder → Inspector 동기화
  useEffect(() => {
    const currentId = selectedBuilderElement?.id || null;
    const isSelectionChanged = currentId !== previousElementIdRef.current;

    // 🚀 Phase 12: isUpdatingFromBuilder 플래그로 useSyncWithBuilder 스킵
    // - JSON.stringify 비교 제거 (50-90ms 절약)
    // - 플래그 설정 → setSelectedElement → 마이크로태스크로 플래그 해제
    const updateWithFlag = (element: ReturnType<typeof mapElementToSelected> | null) => {
      useInspectorState.getState().setUpdatingFromBuilder(true);
      setSelectedElement(element);
      // 마이크로태스크로 플래그 해제 (useSyncWithBuilder가 플래그를 확인한 후)
      queueMicrotask(() => {
        useInspectorState.getState().setUpdatingFromBuilder(false);
      });
    };

    // ⭐ FIX: 1순위 - 선택된 요소 ID가 변경되었는지 먼저 검사
    // syncVersion, isSyncingToBuilder와 무관하게 새 요소 선택은 항상 처리
    if (isSelectionChanged) {
      previousElementIdRef.current = currentId;

      if (!selectedBuilderElement) {
        updateWithFlag(null);
        return;
      }

      const mappedElement = mapElementToSelected(selectedBuilderElement);
      updateWithFlag(mappedElement);
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
    if (syncVersion > lastProcessedSyncVersionRef.current) {
      lastProcessedSyncVersionRef.current = syncVersion;
      return;
    }

    // useEffect 내부에서 최신 selectedElement 가져오기 (stale closure 방지)
    const selectedElement = useInspectorState.getState().selectedElement;

    if (!selectedBuilderElement) {
      if (selectedElement) {
        updateWithFlag(null);
      }
      return;
    }

    // 🚀 통합 최적화: 참조 비교 → shallowEqual 비교 → 플래그 기반 업데이트
    // - Phase 12: isUpdatingFromBuilder 플래그로 useSyncWithBuilder 스킵
    // - Phase 16: shallowEqual로 빠른 비교 (JSON.stringify 제거)
    const mappedElement = mapElementToSelected(selectedBuilderElement);

    // 🚀 Performance: 참조 비교 우선 (가장 빠른 경로)
    const currentProps = selectedElement?.properties;
    const newProps = mappedElement.properties;
    const currentDataBinding = selectedElement?.dataBinding;
    const newDataBinding = mappedElement.dataBinding;
    const currentStyle = selectedElement?.style;
    const newStyle = mappedElement.style;
    const currentComputedStyle = selectedElement?.computedStyle;
    const newComputedStyle = mappedElement.computedStyle;
    const currentEvents = selectedElement?.events;
    const newEvents = mappedElement.events;

    // 참조가 모두 같으면 빠르게 스킵 (가장 빠른 경로)
    if (
      currentProps === newProps &&
      currentDataBinding === newDataBinding &&
      currentStyle === newStyle &&
      currentComputedStyle === newComputedStyle &&
      currentEvents === newEvents
    ) {
      return;
    }

    // 🚀 Phase 16: shallowEqual로 빠른 비교 (Intel Mac 최적화)
    // - JSON.stringify 대신 shallowEqual 사용 (10-50x 빠름)
    // - 키 개수 비교 → 값 비교 → 필요시 JSON 폴백
    let hasChanges = false;

    // props 비교 (가장 자주 변경됨)
    if (currentProps !== newProps && !shallowEqual(currentProps, newProps)) {
      hasChanges = true;
    }

    // style 비교 (CSS 속성은 프리미티브만)
    if (!hasChanges && currentStyle !== newStyle && !shallowEqualStyle(currentStyle, newStyle)) {
      hasChanges = true;
    }

    // dataBinding 비교
    if (!hasChanges && currentDataBinding !== newDataBinding && !shallowEqual(currentDataBinding, newDataBinding)) {
      hasChanges = true;
    }

    // computedStyle 비교 (CSS 속성은 프리미티브만)
    if (!hasChanges && currentComputedStyle !== newComputedStyle && !shallowEqualStyle(currentComputedStyle, newComputedStyle)) {
      hasChanges = true;
    }

    // events 비교 (ID와 타입만 비교)
    if (!hasChanges && currentEvents !== newEvents && !shallowEqualEvents(currentEvents, newEvents)) {
      hasChanges = true;
    }

    if (!hasChanges) {
      return; // 내용이 같으면 스킵
    }

    // 🚀 Phase 12: 실제 변경이 있을 때만 플래그 기반 업데이트
    // - 플래그 설정 → setSelectedElement → 마이크로태스크로 플래그 해제
    // - useSyncWithBuilder가 플래그를 확인하여 불필요한 동기화 스킵
    // (Builder에서 외부 변경 감지: undo/redo, 다른 사용자 등)
    updateWithFlag(mappedElement);
  }, [
    selectedBuilderElement,
    setSelectedElement,
    isSyncingToBuilder,
  ]);

  // 렌더링하지 않음 (상태 동기화만 수행)
  return null;
}
