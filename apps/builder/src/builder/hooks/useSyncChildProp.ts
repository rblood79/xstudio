import { useCallback } from "react";
import { useStore } from "../stores";
import type { BatchPropsUpdate } from "../stores/utils/elementUpdate";

interface ChildPropSync {
  childTag: string;
  propKey: string;
  value: string;
}

/**
 * Child Composition Pattern에서 부모 prop 변경 시 자식 Element 동기화를 위한 BatchPropsUpdate 생성 훅.
 * childrenMap O(1) 탐색으로 직계 자식의 id를 찾고, elementsMap으로 최신 props를 조회합니다.
 *
 * childrenMap은 구조 변경 시에만 갱신되므로 child.props가 stale할 수 있습니다.
 * 반드시 elementsMap에서 최신 props를 조회하여 merge해야 합니다.
 */
export function useSyncChildProp(elementId: string) {
  const buildChildUpdates = useCallback(
    (syncs: ChildPropSync[]): BatchPropsUpdate[] => {
      const { childrenMap, elementsMap } = useStore.getState();
      const children = childrenMap.get(elementId);
      if (!children) return [];

      const updates: BatchPropsUpdate[] = [];
      for (const sync of syncs) {
        const child = children.find((c) => c.type === sync.childTag);
        if (child) {
          // childrenMap의 child.props는 stale할 수 있으므로 elementsMap에서 최신 props 조회
          const freshChild = elementsMap.get(child.id);
          const freshProps = freshChild?.props ?? child.props;
          updates.push({
            elementId: child.id,
            props: { ...freshProps, [sync.propKey]: sync.value },
          });
        }
      }
      return updates;
    },
    [elementId],
  );

  return { buildChildUpdates };
}
