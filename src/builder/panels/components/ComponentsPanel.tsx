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
  // ⚠️ elements 구독 제거 - 콜백 내에서 직접 getState()로 가져옴 (불필요한 리렌더링 방지)
  const addElement = useStore((state) => state.addElement);

  const { handleAddElement: rawHandleAddElement } = useElementCreator();
  const { sendElementsToIframe } = useIframeMessenger();

  // handleAddElement wrapper - 필요한 모든 데이터 자동 전달
  const handleAddElement = useCallback(async (tag: string, parentId?: string) => {
    if (!currentPageId) {
      console.error('현재 페이지가 없습니다');
      return;
    }

    // elements는 콜백 실행 시점에 최신 값을 가져옴 (구독 대신 getState 사용)
    const elements = useStore.getState().elements;

    await rawHandleAddElement(
      tag,
      currentPageId,
      parentId || selectedElementId,
      elements,
      addElement,
      sendElementsToIframe
    );
  }, [currentPageId, selectedElementId, addElement, rawHandleAddElement, sendElementsToIframe]);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return (
    <Components
      handleAddElement={handleAddElement}
      selectedElementId={selectedElementId}
    />
  );
}
