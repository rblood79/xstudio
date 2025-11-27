/**
 * ComponentsPanel - 컴포넌트 라이브러리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 Components 컴포넌트를 사용하여 기존 로직 유지
 *
 * ⭐ Layout/Slot System: Page 모드와 Layout 모드 모두 지원
 */

import { useCallback } from "react";
import type { PanelProps } from "../core/types";
import Components from "../../../shared/components";
import { useStore } from "../../stores";
import { useEditModeStore } from "../../stores/editMode";
import { useLayoutsStore } from "../../stores/layouts";
import { useElementCreator } from "../../hooks/useElementCreator";
import { useIframeMessenger } from "../../hooks/useIframeMessenger";

export function ComponentsPanel({ isActive }: PanelProps) {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const currentPageId = useStore((state) => state.currentPageId);
  // ⚠️ elements 구독 제거 - 콜백 내에서 직접 getState()로 가져옴 (불필요한 리렌더링 방지)
  const addElement = useStore((state) => state.addElement);

  // ⭐ Layout/Slot System: Edit Mode 상태
  const editMode = useEditModeStore((state) => state.mode);
  const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);

  const { handleAddElement: rawHandleAddElement } = useElementCreator();
  const { sendElementsToIframe } = useIframeMessenger();

  // handleAddElement wrapper - 필요한 모든 데이터 자동 전달
  // ⭐ Layout/Slot System: Page 모드와 Layout 모드 분기 처리
  const handleAddElement = useCallback(async (tag: string, parentId?: string) => {
    // elements는 콜백 실행 시점에 최신 값을 가져옴 (구독 대신 getState 사용)
    const elements = useStore.getState().elements;

    // Layout 모드인 경우
    if (editMode === "layout" && currentLayoutId) {
      // 현재 Layout의 요소만 필터링
      const layoutElements = elements.filter((el) => el.layout_id === currentLayoutId);

      // ⭐ Layout/Slot System: selectedElementId가 Layout 요소인지 검증
      // Page body나 다른 Layout 요소가 선택되어 있으면 무시하고 null 전달
      let validSelectedElementId: string | null = null;
      if (selectedElementId) {
        const isLayoutElement = layoutElements.some((el) => el.id === selectedElementId);
        if (isLayoutElement) {
          validSelectedElementId = selectedElementId;
        } else {
          console.log(`⚠️ [ComponentsPanel] selectedElementId(${selectedElementId?.slice(0, 8)})가 현재 Layout 요소가 아님 - 무시`);
        }
      }

      console.log(`🏗️ [ComponentsPanel] Layout 모드: ${tag}를 Layout ${currentLayoutId?.slice(0, 8)}에 추가 (parent: ${(parentId || validSelectedElementId)?.slice(0, 8) || 'auto'})`);
      await rawHandleAddElement(
        tag,
        "", // currentPageId - layout 모드에서는 사용 안함
        parentId || validSelectedElementId,
        layoutElements,
        addElement,
        sendElementsToIframe,
        currentLayoutId // layoutId 전달
      );
      return;
    }

    // Page 모드인 경우
    if (!currentPageId) {
      console.error("현재 페이지가 없습니다");
      return;
    }

    await rawHandleAddElement(
      tag,
      currentPageId,
      parentId || selectedElementId,
      elements.filter((el) => el.page_id === currentPageId), // 현재 페이지의 elements만
      addElement,
      sendElementsToIframe
    );
  }, [currentPageId, currentLayoutId, editMode, selectedElementId, addElement, rawHandleAddElement, sendElementsToIframe]);

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
