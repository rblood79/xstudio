/**
 * LayersSection - Layers 섹션 (메모이제이션 적용)
 *
 * NodesPanel에서 분리하여 elements 변경 시에만 리렌더링되도록 최적화
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "react-stately";
import { Button } from "react-aria-components";
import { CopyMinus } from "lucide-react";
import { useStore } from "../../stores";
import { PanelHeader } from "../common/PanelHeader";
import { LayerTree } from "./tree/LayerTree";
import { iconProps } from "../../../utils/ui/uiConstants";

interface LayersSectionProps {
  currentPageId: string;
}

export const LayersSection = memo(function LayersSection({
  currentPageId,
}: LayersSectionProps) {
  // 🚀 elements 전체 구독 후 useMemo로 필터링 (useCallback in useStore는 무한루프 유발)
  const elements = useStore((state) => state.elements);
  const currentPageElements = useMemo(
    () => elements.filter((el) => el.page_id === currentPageId),
    [elements, currentPageId]
  );

  // 🚀 selectedElementId만 구독 - pages 변경 시 리렌더링 안됨
  const selectedElementId = useStore((state) => state.selectedElementId);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const removeElement = useStore((state) => state.removeElement);

  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set());

  // 🚀 WebGL에서 element 선택 시 부모 노드들 자동 펼침
  useEffect(() => {
    if (!selectedElementId) return;

    // 선택된 요소 찾기
    const selectedElement = currentPageElements.find(
      (el) => el.id === selectedElementId
    );
    if (!selectedElement) return;

    // 부모 체인 수집
    const parentsToExpand: Key[] = [];
    let currentParentId = selectedElement.parent_id;

    while (currentParentId) {
      parentsToExpand.push(currentParentId);
      const parentElement = currentPageElements.find(
        (el) => el.id === currentParentId
      );
      currentParentId = parentElement?.parent_id ?? null;
    }

    // 펼쳐야 할 부모가 있으면 expandedKeys에 추가
    if (parentsToExpand.length > 0) {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        parentsToExpand.forEach((key) => next.add(key));
        return next;
      });
    }
  }, [selectedElementId, currentPageElements]);

  // 🚀 useCallback으로 메모이제이션 - 매 렌더링마다 새 함수 생성 방지
  const handleItemClick = useCallback(
    (element: { id: string }) => {
      setSelectedElement(element.id);
    },
    [setSelectedElement]
  );

  const handleItemDelete = useCallback(
    async (element: { id: string }) => {
      await removeElement(element.id);
    },
    [removeElement]
  );

  // Collapse All 기능
  const handleCollapseAll = useCallback(() => {
    setExpandedKeys(new Set());
  }, []);

  return (
    <div className="section">
      <PanelHeader
        title="Layers"
        actions={
          <Button
            className="iconButton"
            aria-label="Collapse All"
            onPress={handleCollapseAll}
          >
            <CopyMinus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </Button>
        }
      />
      <div className="section-content">
        <LayerTree
          elements={currentPageElements}
          selectedElementId={selectedElementId}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
          onItemClick={handleItemClick}
          onItemDelete={handleItemDelete}
        />
      </div>
    </div>
  );
});
