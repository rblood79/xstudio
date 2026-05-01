/**
 * ComponentsPanel - 컴포넌트 라이브러리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 Components 컴포넌트를 사용하여 기존 로직 유지
 *
 * ⭐ Layout/Slot System: Page 모드와 Layout 모드 모두 지원
 *
 * 🛡️ Gateway 패턴 적용 (2025-12-11)
 * - isActive 체크를 최상단에서 수행
 * - Content 컴포넌트 분리로 비활성 시 훅 실행 방지
 */

import { useCallback } from "react";
import type { PanelProps } from "../core/types";
import ComponentList from "./ComponentList";
import { useStore } from "../../stores";
import { selectCanonicalDocument } from "../../stores/elements";
import { useEditModeStore } from "../../stores/editMode";
import {
  useLayoutsStore,
  useSelectedReusableFrameId,
} from "../../stores/layouts";
import { useElementCreator } from "@/builder/hooks";
import { belongsToLegacyLayout } from "../../../adapters/canonical";

/**
 * ComponentsPanel - Gateway 컴포넌트
 * 🛡️ isActive 체크 후 Content 렌더링
 */
export function ComponentsPanel({ isActive }: PanelProps) {
  // 🛡️ Gateway: 비활성 시 즉시 반환 (훅 실행 방지)
  if (!isActive) {
    return null;
  }

  return <ComponentsPanelContent />;
}

/**
 * ComponentsPanelContent - 실제 콘텐츠 컴포넌트
 * 훅은 여기서만 실행됨 (isActive=true일 때만)
 */
function ComponentsPanelContent() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const currentPageId = useStore((state) => state.currentPageId);
  // ⚠️ elements 구독 제거 - 콜백 내에서 직접 getState()로 가져옴 (불필요한 리렌더링 방지)
  const addElement = useStore((state) => state.addElement);

  // ⭐ Layout/Slot System: Edit Mode 상태
  const editMode = useEditModeStore((state) => state.mode);
  const selectedReusableFrameId = useSelectedReusableFrameId();

  const { handleAddElement: rawHandleAddElement } = useElementCreator();

  // handleAddElement wrapper - 필요한 모든 데이터 자동 전달
  // ⭐ Layout/Slot System: Page 모드와 Layout 모드 분기 처리
  const handleAddElement = useCallback(
    async (type: string, parentId?: string) => {
      // 🆕 콜백 실행 시점에 최신 값을 가져옴 (구독 대신 getState 사용)
      const state = useStore.getState();
      const elements = state.elements;
      const getPageElements = state.getPageElements;
      // ADR-903 P3-E E-6: layout 모드에서 body element 변환에 doc 필수.
      const layoutsState = useLayoutsStore.getState();
      const doc = selectCanonicalDocument(
        state,
        state.pages,
        layoutsState.layouts,
      );

      // Layout 모드인 경우
      if (editMode === "layout" && selectedReusableFrameId) {
        // 현재 Layout의 요소만 필터링
        // ADR-903 P3-E E-6 후속: write-through 활성화 후 element.layout_id 가 null
        // 이라 canonical reusable frame descendants 매칭 필수. legacy fallback 보존.
        const layoutElements = elements.filter((el) =>
          belongsToLegacyLayout(el, selectedReusableFrameId, doc),
        );

        // ⭐ Layout/Slot System: selectedElementId가 Layout 요소인지 검증
        // Page body나 다른 Layout 요소가 선택되어 있으면 무시하고 null 전달
        let validSelectedElementId: string | null = null;
        if (selectedElementId) {
          const isLayoutElement = layoutElements.some(
            (el) => el.id === selectedElementId,
          );
          if (isLayoutElement) {
            validSelectedElementId = selectedElementId;
          } else {
            console.log(
              `⚠️ [ComponentsPanel] selectedElementId(${selectedElementId?.slice(0, 8)})가 현재 Layout 요소가 아님 - 무시`,
            );
          }
        }

        console.log(
          `🏗️ [ComponentsPanel] Layout 모드: ${type}를 Layout ${selectedReusableFrameId?.slice(0, 8)}에 추가 (parent: ${(parentId || validSelectedElementId)?.slice(0, 8) || "auto"})`,
        );
        await rawHandleAddElement(
          type,
          "", // currentPageId - layout 모드에서는 사용 안함
          parentId || validSelectedElementId,
          layoutElements,
          addElement,
          selectedReusableFrameId, // layoutId 전달
          doc,
        );
        return;
      }

      // Page 모드인 경우
      if (!currentPageId) {
        console.error("현재 페이지가 없습니다");
        return;
      }

      // 🆕 O(1) 인덱스 기반 조회
      const pageElements = getPageElements(currentPageId);
      await rawHandleAddElement(
        type,
        currentPageId,
        parentId || selectedElementId,
        pageElements,
        addElement,
        null,
        doc,
      );
    },
    [
      currentPageId,
      editMode,
      selectedElementId,
      selectedReusableFrameId,
      addElement,
      rawHandleAddElement,
    ],
  );

  return (
    <ComponentList
      handleAddElement={handleAddElement}
      selectedElementId={selectedElementId}
    />
  );
}
