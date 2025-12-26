import { useMemo, useCallback, useEffect } from "react";
import { useTreeData } from "react-stately";
import type { Page } from "../../../../../types/builder/unified.types";
import type { PageTreeNode } from "./types";
import { useStore } from "../../../../stores";

export function usePageTreeData(pages: Page[]) {
  // 1. 페이지 → 트리 노드 변환
  const treeNodes = useMemo(() => convertToPageTreeNodes(pages), [pages]);

  // 2. react-stately useTreeData
  const tree = useTreeData<PageTreeNode>({
    initialItems: treeNodes,
    getKey: (item) => item.id,
    getChildren: (item) => item.children ?? [],
  });

  // 3. treeNodes 변경 시 tree 동기화
  useEffect(() => {
    syncTreeData(tree, treeNodes);
  }, [tree, treeNodes]);

  const setPages = useStore((state) => state.setPages);
  const currentPages = useStore((state) => state.pages);

  // 4. Store 동기화 (Optimistic Update)
  const syncToStore = useCallback(
    (
      updates: Array<{
        id: string;
        parentId?: string | null;
        orderNum?: number;
      }>
    ) => {
      if (updates.length === 0) return;

      // 메모리 상태 즉시 반영
      const updatedPages = currentPages.map((page) => {
        const update = updates.find((u) => u.id === page.id);
        if (!update) return page;
        return {
          ...page,
          ...(update.parentId !== undefined && { parent_id: update.parentId }),
          ...(update.orderNum !== undefined && { order_num: update.orderNum }),
        };
      });
      setPages(updatedPages);

      // TODO: IndexedDB/Supabase 저장 구현 시 아래 코드 활성화
      // try {
      //   await db.pages.bulkPut(updates);
      // } catch (error) {
      //   console.warn('⚠️ 페이지 저장 실패:', error);
      //   showToast('error', '저장에 실패했습니다. Ctrl+Z로 되돌릴 수 있습니다.');
      // }
    },
    [currentPages, setPages]
  );

  return { tree, treeNodes, syncToStore };
}

function syncTreeData(tree: unknown, items: PageTreeNode[]) {
  const treeData = tree as {
    setItems?: (nextItems: PageTreeNode[]) => void;
  };
  if (!treeData.setItems) return;
  treeData.setItems(items);
}

function convertToPageTreeNodes(
  pages: Page[],
  parentId: string | null = null,
  depth = 0
): PageTreeNode[] {
  return pages
    .filter((p) => (p.parent_id ?? null) === parentId)
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((page) => {
      const children = convertToPageTreeNodes(pages, page.id, depth + 1);
      const isRoot = page.parent_id === null && (page.order_num ?? 0) === 0;

      return {
        id: page.id,
        name: page.title || "Untitled",
        slug: page.slug ?? null,
        parentId: page.parent_id ?? null,
        orderNum: page.order_num ?? 0,
        depth,
        hasChildren: children.length > 0,
        isLeaf: children.length === 0,
        children,
        page,
        isRoot,
        isDraggable: !isRoot,
        isDroppable: true,
      };
    });
}
