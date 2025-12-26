import { useMemo, useCallback } from "react";
import type { Page } from "../../../../../types/builder/unified.types";
import type { PageTreeNode } from "./types";
import { useStore } from "../../../../stores";

export function usePageTreeData(pages: Page[]) {
  // 1. 페이지 → 트리 노드 변환
  const treeNodes = useMemo(() => convertToPageTreeNodes(pages), [pages]);

  // nodeMap: treeNodes 기반 O(1) 조회용 맵
  const nodeMap = useMemo(() => {
    const map = new Map<string, PageTreeNode>();
    const stack = [...treeNodes];
    while (stack.length > 0) {
      const node = stack.shift();
      if (!node) continue;
      map.set(node.id, node);
      if (node.children && node.children.length > 0) {
        stack.unshift(...node.children);
      }
    }
    return map;
  }, [treeNodes]);

  // useTreeData 대신 직접 tree 객체 생성
  // getItem은 nodeMap 기반으로 구현
  const tree = useMemo(() => ({
    getItem: (key: string | number) => {
      const node = nodeMap.get(String(key));
      return node ? { value: node } : undefined;
    },
  }), [nodeMap]);

  const setPages = useStore((state) => state.setPages);
  const currentPages = useStore((state) => state.pages);

  // Store 동기화 (Optimistic Update)
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
