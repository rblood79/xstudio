/**
 * InspectorSync - Builder와 Inspector 상태 동기화
 *
 * Builder의 selectedElementId → Inspector의 selectedElement 동기화
 * 패널 시스템에서 이 컴포넌트를 항상 마운트하여 동기화 유지
 */

import { useEffect, useMemo } from "react";
import { useInspectorState, useSyncWithBuilder } from "./hooks";
import { useStore } from "../stores";
import { mapElementToSelected } from "./utils/elementMapper";

export function InspectorSync() {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const setSelectedElement = useInspectorState(
    (state) => state.setSelectedElement
  );
  const isSyncingToBuilder = useInspectorState(
    (state) => state.isSyncingToBuilder
  );
  const setSyncingToBuilder = useInspectorState(
    (state) => state.setSyncingToBuilder
  );

  // Builder의 전역 상태
  const selectedElementId = useStore((state) => state.selectedElementId);
  const elements = useStore((state) => state.elements);

  // 선택된 요소만 메모이제이션
  const selectedBuilderElement = useMemo(() => {
    return selectedElementId
      ? elements.find((el) => el.id === selectedElementId)
      : null;
  }, [selectedElementId, elements]);

  // Inspector → Builder 동기화
  useSyncWithBuilder();

  // Builder → Inspector 동기화
  useEffect(() => {
    // Inspector → Builder 동기화 중이면 건너뛰기
    if (isSyncingToBuilder) {
      return;
    }

    if (!selectedBuilderElement) {
      if (selectedElement) {
        setSelectedElement(null);
      }
      return;
    }

    const mappedElement = mapElementToSelected(selectedBuilderElement);

    // 최초 선택이거나 ID가 변경된 경우
    if (!selectedElement || selectedElement.id !== selectedBuilderElement.id) {
      setSyncingToBuilder(false);
      setSelectedElement(mappedElement);
      return;
    }

    // 같은 요소인 경우 props 비교
    const currentPropsJson = JSON.stringify(
      selectedElement.properties,
      Object.keys(selectedElement.properties || {}).sort()
    );
    const newPropsJson = JSON.stringify(
      mappedElement.properties,
      Object.keys(mappedElement.properties || {}).sort()
    );

    const currentDataBindingJson = JSON.stringify(selectedElement.dataBinding);
    const newDataBindingJson = JSON.stringify(mappedElement.dataBinding);

    const currentStyleJson = JSON.stringify(
      selectedElement.style,
      Object.keys(selectedElement.style || {}).sort()
    );
    const newStyleJson = JSON.stringify(
      mappedElement.style,
      Object.keys(mappedElement.style || {}).sort()
    );

    const currentComputedStyleJson = JSON.stringify(
      selectedElement.computedStyle,
      Object.keys(selectedElement.computedStyle || {}).sort()
    );
    const newComputedStyleJson = JSON.stringify(
      mappedElement.computedStyle,
      Object.keys(mappedElement.computedStyle || {}).sort()
    );

    const currentEventsJson = JSON.stringify(selectedElement.events);
    const newEventsJson = JSON.stringify(mappedElement.events);

    if (
      currentPropsJson !== newPropsJson ||
      currentDataBindingJson !== newDataBindingJson ||
      currentStyleJson !== newStyleJson ||
      currentComputedStyleJson !== newComputedStyleJson ||
      currentEventsJson !== newEventsJson
    ) {
      setSelectedElement(mappedElement);
    }
  }, [
    selectedBuilderElement,
    selectedElement,
    setSelectedElement,
    isSyncingToBuilder,
    setSyncingToBuilder,
  ]);

  // 렌더링하지 않음 (상태 동기화만 수행)
  return null;
}
