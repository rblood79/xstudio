/**
 * ComponentsPanel - 컴포넌트 라이브러리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 Components 컴포넌트를 사용하여 기존 로직 유지
 */

import { useCallback } from "react";
import type { PanelProps } from "../core/types";
import Components from "../../components";
import { useStore } from "../../stores";
import { useElementCreator } from "../../hooks/useElementCreator";
import { useIframeMessenger } from "../../hooks/useIframeMessenger";

export function ComponentsPanel({ isActive }: PanelProps) {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const currentPageId = useStore((state) => state.currentPageId);
  const elements = useStore((state) => state.elements);
  const addElement = useStore((state) => state.addElement);

  const { handleAddElement: rawHandleAddElement } = useElementCreator();
  const { sendElementsToIframe } = useIframeMessenger();

  // handleAddElement wrapper - 필요한 모든 데이터 자동 전달
  const handleAddElement = useCallback(async (tag: string, parentId?: string) => {
    if (!currentPageId) {
      console.error('현재 페이지가 없습니다');
      return;
    }

    await rawHandleAddElement(
      tag,
      currentPageId,
      parentId || selectedElementId,
      elements,
      addElement,
      sendElementsToIframe
    );
  }, [currentPageId, selectedElementId, elements, addElement, rawHandleAddElement, sendElementsToIframe]);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return (
    <div className="components-panel sidebar-section components">
      <Components
        handleAddElement={handleAddElement}
        selectedElementId={selectedElementId}
      />
    </div>
  );
}
