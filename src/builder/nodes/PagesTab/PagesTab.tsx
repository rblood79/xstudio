/**
 * PagesTab
 *
 * Pages 탭의 메인 컨테이너.
 * Page 목록과 현재 Page의 Element 트리를 표시.
 * 기존 Pages, Layers 컴포넌트를 래핑.
 */

import React from "react";
import { Pages } from "../Pages";
import { Layers } from "../Layers";
import { ElementProps } from "../../../types/integrations/supabase.types";
import { Element, Page } from "../../../types/core/store.types";
import type { ElementTreeItem } from "../../../types/builder/stately.types";

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
