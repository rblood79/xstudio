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

    // 🚀 Performance: 참조 비교 우선, JSON 비교는 참조가 다를 때만 수행
    // Zustand는 불변 업데이트를 사용하므로 참조가 같으면 내용도 동일
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

    // 참조가 모두 같으면 빠르게 스킵 (가장 흔한 케이스)
    if (
      currentProps === newProps &&
      currentDataBinding === newDataBinding &&
      currentStyle === newStyle &&
      currentComputedStyle === newComputedStyle &&
      currentEvents === newEvents
    ) {
      return; // 변경 없음 - JSON 비교 스킵
    }

    // 참조가 다른 경우에만 JSON 비교 수행 (실제 내용 변경 확인)
    let hasChanges = false;

    // props 비교 (참조가 다를 때만)
    if (currentProps !== newProps) {
      const currentPropsJson = JSON.stringify(
        currentProps,
        Object.keys(currentProps || {}).sort()
      );
      const newPropsJson = JSON.stringify(
        newProps,
        Object.keys(newProps || {}).sort()
      );
      if (currentPropsJson !== newPropsJson) hasChanges = true;
    }

    // dataBinding 비교 (참조가 다를 때만)
    if (!hasChanges && currentDataBinding !== newDataBinding) {
      if (JSON.stringify(currentDataBinding) !== JSON.stringify(newDataBinding)) {
        hasChanges = true;
      }
    }

    // style 비교 (참조가 다를 때만)
    if (!hasChanges && currentStyle !== newStyle) {
      const currentStyleJson = JSON.stringify(
        currentStyle,
        Object.keys(currentStyle || {}).sort()
      );
      const newStyleJson = JSON.stringify(
        newStyle,
        Object.keys(newStyle || {}).sort()
      );
      if (currentStyleJson !== newStyleJson) hasChanges = true;
    }

    // computedStyle 비교 (참조가 다를 때만)
    if (!hasChanges && currentComputedStyle !== newComputedStyle) {
      const currentComputedStyleJson = JSON.stringify(
        currentComputedStyle,
        Object.keys(currentComputedStyle || {}).sort()
      );
      const newComputedStyleJson = JSON.stringify(
        newComputedStyle,
        Object.keys(newComputedStyle || {}).sort()
      );
      if (currentComputedStyleJson !== newComputedStyleJson) hasChanges = true;
    }

    // events 비교 (참조가 다를 때만)
    if (!hasChanges && currentEvents !== newEvents) {
      if (JSON.stringify(currentEvents) !== JSON.stringify(newEvents)) {
        hasChanges = true;
      }
    }

    if (hasChanges) {
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
