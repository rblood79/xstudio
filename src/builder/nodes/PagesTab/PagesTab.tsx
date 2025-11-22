/**
 * PagesTab
 *
 * Pages 탭의 메인 컨테이너.
 * Page 목록과 현재 Page의 Element 트리를 표시.
 * 기존 Pages, Layers 컴포넌트를 래핑.
 */

import React, { useEffect, useRef } from "react";
import { Pages } from "../Pages";
import { Layers } from "../Layers";
import { ElementProps } from "../../../types/integrations/supabase.types";
import { Element, Page } from "../../../types/core/store.types";
import type { ElementTreeItem } from "../../../types/builder/stately.types";
import { useStore } from "../../stores";

interface PagesTabProps {
  pages: Page[];
  pageList: { remove: (...keys: string[]) => void };
  handleAddPage: () => Promise<void>;
  renderTree: <
    T extends { id: string; parent_id?: string | null; order_num?: number }
  >(
    items: T[],
    getLabel: (item: T) => string,
    onClick: (item: T) => void,
    onDelete: (item: T) => Promise<void>,
    parentId?: string | null,
    depth?: number
  ) => React.ReactNode;
  renderElementTree: (
    tree: ElementTreeItem[],
    onClick: (item: Element) => void,
    onDelete: (item: Element) => Promise<void>,
    depth?: number
  ) => React.ReactNode;
  fetchElements: (pageId: string) => Promise<void>;
  elements: Element[];
  selectedElementId: string | null;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
  collapseAllTreeItems?: () => void;
}

export function PagesTab({
  pages,
  pageList,
  handleAddPage,
  renderTree,
  renderElementTree,
  fetchElements,
  elements,
  selectedElementId,
  setSelectedElement,
  sendElementSelectedMessage,
  collapseAllTreeItems,
}: PagesTabProps) {
  // 현재 페이지 ID 추적
  const currentPageId = useStore((state) => state.currentPageId);
  const prevPageIdRef = useRef<string | null>(null);

  // ⭐ 페이지 전환 시 body 자동 선택 (Layouts 탭과 동일 패턴)
  useEffect(() => {
    const pageChanged = currentPageId !== prevPageIdRef.current;

    if (pageChanged && currentPageId) {
      prevPageIdRef.current = currentPageId;

      // body 요소 (order_num === 0) 자동 선택
      if (elements.length > 0) {
        const bodyElement = elements.find(el => el.order_num === 0) || elements.find(el => el.tag === 'body');
        if (bodyElement) {
          // 약간의 딜레이로 elements 업데이트 후 선택 보장
          const timeoutId = setTimeout(() => {
            setSelectedElement(bodyElement.id, bodyElement.props as ElementProps);
          }, 0);
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [currentPageId, elements, setSelectedElement]);

  return (
    <div className="pages-tab" role="tabpanel" id="tabpanel-pages" aria-label="Pages">
      <Pages
        pages={pages}
        pageList={pageList}
        handleAddPage={handleAddPage}
        renderTree={renderTree}
        fetchElements={fetchElements}
      />
      <Layers
        elements={elements}
        selectedElementId={selectedElementId}
        setSelectedElement={setSelectedElement}
        renderElementTree={renderElementTree}
        sendElementSelectedMessage={sendElementSelectedMessage}
        collapseAllTreeItems={collapseAllTreeItems}
      />
    </div>
  );
}

export default PagesTab;
