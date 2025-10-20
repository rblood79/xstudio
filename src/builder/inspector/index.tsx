import "./index.css";
import { useEffect, useMemo } from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-aria-components";
import {
  PropertiesSection,
  StyleSection,
  DataSection,
  EventSection,
} from "./sections";
import { useInspectorState, useSyncWithBuilder } from "./hooks";
import { useStore } from "../stores";
import { mapElementToSelected } from "./utils/elementMapper";

function Inspector() {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const setSelectedElement = useInspectorState(
    (state) => state.setSelectedElement
  );
  const isSyncingToBuilder = useInspectorState(
    (state) => state.isSyncingToBuilder
  );

  // Builder의 전역 상태와 동기화
  const selectedElementId = useStore((state) => state.selectedElementId);
  const elements = useStore((state) => state.elements);

  // 선택된 요소만 메모이제이션 (전체 elements 배열 변경에 반응하지 않음)
  const selectedBuilderElement = useMemo(() => {
    return selectedElementId
      ? elements.find((el) => el.id === selectedElementId)
      : null;
  }, [selectedElementId, elements]);

  // Inspector → Builder 동기화
  useSyncWithBuilder();

  // Builder → Inspector 동기화
  useEffect(() => {
    // Inspector → Builder 동기화 중이면 건너뛰기 (무한 루프 방지)
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
      setSelectedElement(mappedElement);
      return;
    }

    // 같은 요소인 경우 props, dataBinding, style, computedStyle 비교 (무한 루프 방지)
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

    if (
      currentPropsJson !== newPropsJson ||
      currentDataBindingJson !== newDataBindingJson ||
      currentStyleJson !== newStyleJson ||
      currentComputedStyleJson !== newComputedStyleJson
    ) {
      // Builder에서 변경된 경우만 업데이트
      setSelectedElement(mappedElement);
    }
  }, [
    selectedBuilderElement,
    selectedElement,
    setSelectedElement,
    isSyncingToBuilder,
  ]);

  if (!selectedElement) {
    return (
      <div className="inspector-container empty">
        <div className="empty-state">
          <p className="empty-message">요소를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-container">
      {/*<div className="inspector-header">
        <span className="inspector-id">{selectedElement.id}</span>
      </div>*/}

      <Tabs className="react-aria-Tabs">
        <TabList className="react-aria-TabList">
          <Tab id="properties" className="react-aria-Tab">
            Props
          </Tab>
          <Tab id="style" className="react-aria-Tab">
            Style
          </Tab>
          <Tab id="data" className="react-aria-Tab">
            Data
          </Tab>
          <Tab id="events" className="react-aria-Tab">
            Events
          </Tab>
        </TabList>

        <TabPanel id="properties" className="inspector-tab-panel">
          <PropertiesSection element={selectedElement} />
        </TabPanel>

        <TabPanel id="style" className="inspector-tab-panel">
          <StyleSection element={selectedElement} />
        </TabPanel>

        <TabPanel id="data" className="inspector-tab-panel">
          <DataSection element={selectedElement} />
        </TabPanel>

        <TabPanel id="events" className="inspector-tab-panel">
          <EventSection element={selectedElement} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

export default Inspector;
