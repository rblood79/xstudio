import { useCallback } from 'react';
import { useStore } from '../stores';
import type { BatchPropsUpdate } from '../stores/utils/elementUpdate';

interface GrandchildPropSync {
  parentTag: string;
  childTag: string;
  propKey: string;
  value: string;
}

/**
 * 2단계 childrenMap 탐색으로 손자 Element의 BatchPropsUpdate를 생성합니다.
 * Select(SelectTrigger→SelectValue), ComboBox(ComboBoxWrapper→ComboBoxInput) 등에서 사용.
 */
export function useSyncGrandchildProp(elementId: string) {
  const buildGrandchildUpdates = useCallback((syncs: GrandchildPropSync[]): BatchPropsUpdate[] => {
    const { childrenMap } = useStore.getState();
    const directChildren = childrenMap.get(elementId);
    if (!directChildren) return [];

    const updates: BatchPropsUpdate[] = [];
    for (const sync of syncs) {
      const parent = directChildren.find(c => c.tag === sync.parentTag);
      if (!parent) continue;
      const grandchildren = childrenMap.get(parent.id);
      if (!grandchildren) continue;
      const grandchild = grandchildren.find(c => c.tag === sync.childTag);
      if (grandchild) {
        updates.push({
          elementId: grandchild.id,
          props: { ...grandchild.props, [sync.propKey]: sync.value },
        });
      }
    }
    return updates;
  }, [elementId]);

  return { buildGrandchildUpdates };
}
