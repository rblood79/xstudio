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
  /** ⭐ Nested Routes & Slug System */
  addPageWithParams?: (params: import('../hooks/usePageManager').AddPageParams) => Promise<{ success: boolean; error?: Error }>;
  projectId?: string;
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
  requestAutoSelectAfterUpdate: (elementId: string) => void; // ⭐ ACK 기반 auto-select
  collapseAllTreeItems?: () => void;
}

export function PagesTab({
  pages,
  pageList,
  handleAddPage,
  addPageWithParams,
  projectId,
  renderTree,
  renderElementTree,
  fetchElements,
  elements,
  selectedElementId,
  setSelectedElement,
  sendElementSelectedMessage,
  requestAutoSelectAfterUpdate,
  collapseAllTreeItems,
}: PagesTabProps) {
  // 현재 페이지 ID 추적
  const currentPageId = useStore((state) => state.currentPageId);
  const prevPageIdRef = useRef<string | null>(null);

  // ⭐ 페이지 전환 시 body 자동 선택 (ACK 기반)
  useEffect(() => {
    const pageChanged = currentPageId !== prevPageIdRef.current;

    if (pageChanged && currentPageId) {
      prevPageIdRef.current = currentPageId;

      // body 요소 (order_num === 0) 자동 선택
      if (elements.length > 0) {
        const bodyElement = elements.find(el => el.order_num === 0) || elements.find(el => el.tag === 'body');
        if (bodyElement) {
          // ⭐ Store 업데이트
          setSelectedElement(bodyElement.id, bodyElement.props as ElementProps);
          // ⭐ ACK 기반 auto-select 등록 (iframe 렌더링 완료 후 overlay 표시)
          requestAutoSelectAfterUpdate(bodyElement.id);
        }
      }
    }
  }, [currentPageId, elements, setSelectedElement, requestAutoSelectAfterUpdate]);

  return (
    <div className="pages-tab" role="tabpanel" id="tabpanel-pages" aria-label="Pages">
      <Pages
        pages={pages}
        pageList={pageList}
        handleAddPage={handleAddPage}
        addPageWithParams={addPageWithParams}
        projectId={projectId}
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
