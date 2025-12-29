/**
 * LayersSection - Layers 섹션 (메모이제이션 적용)
 *
 * NodesPanel에서 분리하여 elements 변경 시에만 리렌더링되도록 최적화
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import type { Key } from "react-stately";
import { Button } from "react-aria-components";
import { CopyMinus } from "lucide-react";
import { useStore } from "../../stores";
import { PanelHeader } from "../../components";
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

  // 사용자가 직접 조작한 expandedKeys (collapse all, 수동 토글)
  const [userExpandedKeys, setUserExpandedKeys] = useState<Set<Key>>(new Set());
  // 사용자가 명시적으로 닫은 키 (자동 펼침을 오버라이드)
  const [userCollapsedKeys, setUserCollapsedKeys] = useState<Set<Key>>(new Set());

  // 🚀 선택된 요소의 부모 체인 계산 (파생 상태)
  const autoExpandedParents = useMemo(() => {
    if (!selectedElementId) return new Set<Key>();

    const selectedElement = currentPageElements.find(
      (el) => el.id === selectedElementId
    );
    if (!selectedElement) return new Set<Key>();

    const parents = new Set<Key>();
    let currentParentId = selectedElement.parent_id;

    while (currentParentId) {
      parents.add(currentParentId);
      const parentElement = currentPageElements.find(
        (el) => el.id === currentParentId
      );
      currentParentId = parentElement?.parent_id ?? null;
    }
    return parents;
  }, [selectedElementId, currentPageElements]);

  // 🚀 최종 expandedKeys = (사용자 조작 + 자동 펼침) - 사용자가 닫은 키
  const expandedKeys = useMemo(() => {
    const merged = new Set(userExpandedKeys);
    autoExpandedParents.forEach((key) => {
      // 사용자가 명시적으로 닫지 않은 경우에만 자동 펼침
      if (!userCollapsedKeys.has(key)) {
        merged.add(key);
      }
    });
    return merged;
  }, [userExpandedKeys, autoExpandedParents, userCollapsedKeys]);

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
    setUserExpandedKeys(new Set());
    // 모든 자동 펼침 키를 사용자가 닫은 것으로 처리
    setUserCollapsedKeys(new Set(autoExpandedParents));
  }, [autoExpandedParents]);

  // 사용자가 펼침/닫음 토글 시 처리
  const handleExpandedChange = useCallback(
    (newKeys: Set<Key>) => {
      // 이전에 펼쳐져 있었는데 새로 닫힌 키 찾기
      const closedKeys = new Set<Key>();
      expandedKeys.forEach((key) => {
        if (!newKeys.has(key)) {
          closedKeys.add(key);
        }
      });

      // 새로 열린 키 찾기
      const openedKeys = new Set<Key>();
      newKeys.forEach((key) => {
        if (!expandedKeys.has(key)) {
          openedKeys.add(key);
        }
      });

      // userCollapsedKeys 업데이트
      setUserCollapsedKeys((prev) => {
        const next = new Set(prev);
        // 닫힌 키 추가
        closedKeys.forEach((key) => next.add(key));
        // 열린 키 제거 (사용자가 다시 열었으므로)
        openedKeys.forEach((key) => next.delete(key));
        return next;
      });

      // userExpandedKeys 업데이트
      setUserExpandedKeys(newKeys);
    },
    [expandedKeys]
  );

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
          onExpandedChange={handleExpandedChange}
          onItemClick={handleItemClick}
          onItemDelete={handleItemDelete}
        />
      </div>
    </div>
  );
});
