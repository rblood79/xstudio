/**
 * PageTreeRenderer - 페이지 트리 렌더링 컴포넌트
 *
 * 🚀 Performance Optimization:
 * - React.memo로 불필요한 재렌더 방지
 * - useMemo로 메모이제이션
 * - TreeNodeItem으로 개별 노드 최적화
 */

import React, { memo, useMemo } from "react";
import { TreeNodeItem } from "./TreeNodeItem";
import type { Page } from "../../../types/builder/unified.types";
import { sortByOrderNum } from "../../utils/treeUtils";

interface PageTreeRendererProps {
  /** 페이지 목록 */
  pages: Page[];
  /** 현재 선택된 페이지 ID */
  selectedPageId: string | null;
  /** 펼쳐진 노드 ID Set */
  expandedKeys: Set<string | number>;
  /** 페이지 선택 핸들러 */
  onSelect: (page: Page) => void;
  /** 페이지 삭제 핸들러 */
  onDelete: (page: Page) => Promise<void>;
  /** 노드 펼치기/접기 핸들러 */
  onToggle: (id: string) => void;
}

/**
 * 페이지가 삭제 가능한지 확인
 * - order_num이 0인 Home 페이지는 삭제 불가
 * - parent_id가 null인 루트 Home 페이지는 삭제 불가
 */
function canDeletePage(page: Page): boolean {
  return !(page.order_num === 0 && page.parent_id === null);
}

/**
 * 페이지에 자식이 있는지 확인
 */
function hasChildren(pages: Page[], pageId: string): boolean {
  return pages.some((page) => page.parent_id === pageId);
}

/**
 * 메모이제이션된 페이지 트리 렌더러
 */
export const PageTreeRenderer = memo(function PageTreeRenderer({
  pages,
  selectedPageId,
  expandedKeys,
  onSelect,
  onDelete,
  onToggle,
}: PageTreeRendererProps) {
  /**
   * 재귀적 페이지 트리 렌더링
   * ⚡ useMemo + 내부 함수 패턴으로 변경 (useCallback 재귀 참조 문제 해결)
   */
  const renderPageTree = useMemo(() => {
    const render = (parentId: string | null = null, depth: number = 0): React.ReactNode => {
      // 부모 ID에 해당하는 자식 페이지들 필터링
      const childPages = pages.filter((page) => {
        if (parentId === null) {
          return page.parent_id === null || page.parent_id === undefined;
        }
        return page.parent_id === parentId;
      });

      // order_num 기준 정렬
      const sortedPages = sortByOrderNum(childPages);

      if (sortedPages.length === 0) return null;

      return (
        <>
          {sortedPages.map((page) => {
            const pageHasChildren = hasChildren(pages, page.id);
            const isExpanded = expandedKeys.has(page.id);
            const isSelected = selectedPageId === page.id;
            const deletable = canDeletePage(page);

            return (
              <TreeNodeItem
                key={page.id}
                id={page.id}
                label={page.title || page.name || "Untitled"}
                depth={depth}
                hasChildren={pageHasChildren}
                isExpanded={isExpanded}
                isSelected={isSelected}
                canDelete={deletable}
                onClick={() => onSelect(page)}
                onToggle={() => onToggle(page.id)}
                onDelete={async () => onDelete(page)}
              >
                {/* 펼쳐진 경우 자식 페이지들 렌더링 */}
                {isExpanded && pageHasChildren && render(page.id, depth + 1)}
              </TreeNodeItem>
            );
          })}
        </>
      );
    };
    return render;
  }, [pages, selectedPageId, expandedKeys, onSelect, onDelete, onToggle]);

  return <>{renderPageTree(null, 0)}</>;
});

PageTreeRenderer.displayName = "PageTreeRenderer";

export default PageTreeRenderer;
