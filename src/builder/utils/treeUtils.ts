/**
 * Tree Utility Functions
 *
 * flat Element[] 배열을 hierarchical ElementTreeItem[] 구조로 변환
 */

import type { Element } from '../../types/core/store.types';
import type { ElementTreeItem } from '../../types/builder/stately.types';
import type { ElementProps } from '../../types/integrations/supabase.types';
import type { DataBinding } from '../../types/builder/unified.types';

/**
 * flat Element 배열을 hierarchical ElementTreeItem 구조로 변환
 *
 * @param elements - flat Element 배열
 * @param parentId - 부모 ID (null이면 루트 요소들만 반환)
 * @returns hierarchical ElementTreeItem 배열
 *
 * @example
 * ```tsx
 * const elements = [
 *   { id: '1', tag: 'body', parent_id: null, order_num: 0 },
 *   { id: '2', tag: 'div', parent_id: '1', order_num: 1 },
 *   { id: '3', tag: 'span', parent_id: '2', order_num: 2 },
 * ];
 *
 * const tree = buildTreeFromElements(elements);
 * // [
 * //   {
 * //     id: '1',
 * //     tag: 'body',
 * //     children: [
 * //       {
 * //         id: '2',
 * //         tag: 'div',
 * //         children: [
 * //           { id: '3', tag: 'span', children: [] }
 * //         ]
 * //       }
 * //     ]
 * //   }
 * // ]
 * ```
 */
export function buildTreeFromElements(
  elements: Element[],
  parentId: string | null = null
): ElementTreeItem[] {
  // Phase 1.3 최적화: Map 기반 조회로 O(n²) → O(n)
  // 첫 호출에서만 Map 생성 (한 번만 실행)
  const isRootCall = parentId === null;

  if (isRootCall) {
    // O(n): childrenMap과 elementsMap 생성
    const childrenMap = new Map<string, Element[]>();
    const elementsMap = new Map<string, Element>();

    elements.forEach((el) => {
      if (el.deleted === true) return; // 삭제된 요소 제외

      elementsMap.set(el.id, el);

      const key = el.parent_id || 'root';
      if (!childrenMap.has(key)) {
        childrenMap.set(key, []);
      }
      childrenMap.get(key)!.push(el);
    });

    // 내부 재귀 함수 (Map을 재사용)
    const buildTree = (parentKey: string): ElementTreeItem[] => {
      let children = childrenMap.get(parentKey) || [];

      // 부모가 root가 아니면 특수 정렬 로직 적용
      if (parentKey !== 'root') {
        const parentElement = elementsMap.get(parentKey);

        // Tabs 특수 정렬: Tab과 Panel을 tabId 기준으로 쌍으로 그룹화
        if (parentElement && parentElement.tag === 'Tabs') {
          children = sortTabsChildren(children);
        }
        // Table 특수 정렬은 보류 (기존 로직 유지)
        else if (parentElement && parentElement.tag === 'Table') {
          children = [...children].sort(
            (a, b) => (a.order_num || 0) - (b.order_num || 0)
          );
        }
        // 일반 정렬: order_num 기준
        else {
          children = [...children].sort(
            (a, b) => (a.order_num || 0) - (b.order_num || 0)
          );
        }
      } else {
        // 루트 레벨은 order_num 기준 정렬
        children = [...children].sort(
          (a, b) => (a.order_num || 0) - (b.order_num || 0)
        );
      }

      // hierarchical 구조 생성
      return children.map((el) => {
        const treeItem: ElementTreeItem = {
          id: el.id,
          tag: el.tag,
          parent_id: el.parent_id,
          order_num: el.order_num,
          props: el.props as Record<string, unknown>,
          deleted: el.deleted,
          dataBinding: el.dataBinding as Record<string, unknown> | undefined,
          children: buildTree(el.id), // O(1) Map 조회로 재귀
        };

        return treeItem;
      });
    };

    return buildTree('root');
  }

  // 이 경로는 실행되지 않음 (deprecated - 하위 호환성만 유지)
  console.warn('buildTreeFromElements: 비권장 경로 실행 (parentId 전달)');
  return [];
}

/**
 * Tabs 하위의 Tab과 Panel을 tabId 기준으로 쌍으로 그룹화
 *
 * @param items - Tabs의 자식 요소들
 * @returns 정렬된 요소 배열 (Tab → Panel 순서)
 */
function sortTabsChildren(items: Element[]): Element[] {
  const tabs = items
    .filter((item) => item.tag === 'Tab')
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const panels = items
    .filter((item) => item.tag === 'Panel')
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const pairedItems: Element[] = [];
  const usedPanelIds = new Set<string>();

  tabs.forEach((tab) => {
    pairedItems.push(tab);

    // Tab의 tabId와 일치하는 Panel 찾기
    const tabProps = tab.props as ElementProps;
    const tabId = tabProps?.tabId;

    if (tabId) {
      const matchingPanel = panels.find((panel) => {
        const panelProps = panel.props as ElementProps;
        return panelProps?.tabId === tabId;
      });

      if (matchingPanel && !usedPanelIds.has(matchingPanel.id)) {
        pairedItems.push(matchingPanel);
        usedPanelIds.add(matchingPanel.id);
      }
    } else {
      // tabId가 없는 경우 fallback: order_num 기반 매칭 (레거시)
      console.warn('⚠️ Tab에 tabId가 없음, order_num 기반 fallback 사용:', tab.id);
      const fallbackPanel = panels.find(
        (panel) =>
          !usedPanelIds.has(panel.id) &&
          Math.abs((panel.order_num || 0) - (tab.order_num || 0)) <= 1
      );

      if (fallbackPanel) {
        pairedItems.push(fallbackPanel);
        usedPanelIds.add(fallbackPanel.id);
      }
    }
  });

  // 매칭되지 않은 Panel들 추가 (orphaned panels)
  panels.forEach((panel) => {
    if (!usedPanelIds.has(panel.id)) {
      console.warn('⚠️ 매칭되지 않은 Panel:', panel.id);
      pairedItems.push(panel);
    }
  });

  return pairedItems;
}

/**
 * ElementTreeItem 트리를 flat Element 배열로 변환 (역변환)
 *
 * @param tree - hierarchical ElementTreeItem 배열
 * @returns flat Element 배열
 */
export function flattenTreeToElements(tree: ElementTreeItem[]): Element[] {
  const result: Element[] = [];

  function traverse(items: ElementTreeItem[]) {
    items.forEach((item) => {
      const element: Element = {
        id: item.id,
        tag: item.tag,
        parent_id: item.parent_id || null,
        order_num: item.order_num,
        props: item.props as ElementProps,
        deleted: item.deleted,
        dataBinding: item.dataBinding as DataBinding | undefined,
        page_id: '', // 필요 시 추가
        created_at: '', // 필요 시 추가
        updated_at: '', // 필요 시 추가
      };

      result.push(element);

      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(tree);
  return result;
}

/**
 * ElementTreeItem 트리에서 특정 ID를 가진 노드 찾기
 *
 * @param tree - hierarchical ElementTreeItem 배열
 * @param id - 찾을 요소 ID
 * @returns 찾은 요소 또는 undefined
 */
export function findTreeItemById(
  tree: ElementTreeItem[],
  id: string
): ElementTreeItem | undefined {
  for (const item of tree) {
    if (item.id === id) {
      return item;
    }

    if (item.children && item.children.length > 0) {
      const found = findTreeItemById(item.children, id);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * ElementTreeItem 트리의 모든 노드 ID 추출
 *
 * @param tree - hierarchical ElementTreeItem 배열
 * @returns 모든 노드 ID 배열
 */
export function getAllTreeItemIds(tree: ElementTreeItem[]): string[] {
  const ids: string[] = [];

  function traverse(items: ElementTreeItem[]) {
    items.forEach((item) => {
      ids.push(item.id);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(tree);
  return ids;
}
