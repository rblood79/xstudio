import { useCallback } from 'react';
import { useStore } from '../stores';
import type { BatchPropsUpdate } from '../stores/utils/elementUpdate';

interface ChildPropSync {
  childTag: string;
  propKey: string;
  value: string;
}

/**
 * Child Composition Pattern에서 부모 prop 변경 시 자식 Element 동기화를 위한 BatchPropsUpdate 생성 훅.
 * childrenMap O(1) 탐색으로 직계 자식의 props를 빌드합니다.
 */
export function useSyncChildProp(elementId: string) {
  const buildChildUpdates = useCallback((syncs: ChildPropSync[]): BatchPropsUpdate[] => {
    const { childrenMap } = useStore.getState();
    const children = childrenMap.get(elementId);
    if (!children) return [];

    const updates: BatchPropsUpdate[] = [];
    for (const sync of syncs) {
      const child = children.find(c => c.tag === sync.childTag);
      if (child) {
        updates.push({
          elementId: child.id,
          props: { ...child.props, [sync.propKey]: sync.value },
        });
      }
    }
    return updates;
  }, [elementId]);

  return { buildChildUpdates };
}
