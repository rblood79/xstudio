/**
 * useResolvedElement Hook
 *
 * Element의 Master-Instance resolution + Design Variable resolution을 수행.
 *
 * 기존 요소(componentRole 없고, variableBindings 없음)에는
 * 원본 element 참조를 그대로 반환하여 성능 영향 제로.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.1, §G.2
 */

import { useMemo } from 'react';
import type { Element } from '../../../../types/builder/unified.types';
import { isInstanceElement } from '../../../../types/builder/unified.types';
import { useStore } from '../../../stores';
import { useUnifiedThemeStore } from '../../../../stores/themeStore';
import { resolveInstanceElement } from '../../../../utils/component/instanceResolver';
import { resolveElementVariables } from '../../../../utils/variable/variableResolver';

/**
 * Element의 instance resolution + variable resolution을 수행
 *
 * 반환값이 useMemo로 안정화되어 있어 하위 렌더링 최적화에 유리.
 * 변경이 없으면 원본 element 참조를 그대로 반환.
 */
export function useResolvedElement(element: Element): Element {
  // Instance resolution: master 조회 (instance인 경우만)
  const masterElement = useStore((state) => {
    if (!isInstanceElement(element) || !element.masterId) return undefined;
    return state.elementsMap.get(element.masterId);
  });

  // Variable resolution: 디자인 변수 + 활성 테마
  const designVariables = useUnifiedThemeStore((s) => s.designVariables);
  const activeThemeId = useUnifiedThemeStore((s) => s.activeThemeId);

  return useMemo(() => {
    let resolved = element;

    // Step 1: Instance resolution
    if (isInstanceElement(element) && masterElement) {
      resolved = resolveInstanceElement(element, masterElement);
    }

    // Step 2: Variable resolution (designVariables가 비어있으면 건너뜀)
    if (designVariables.length > 0 && resolved.variableBindings?.length) {
      const resolvedProps = resolveElementVariables(
        resolved.props,
        designVariables,
        { activeThemeId },
      );
      if (resolvedProps !== resolved.props) {
        resolved = { ...resolved, props: resolvedProps };
      }
    }

    return resolved;
  }, [element, masterElement, designVariables, activeThemeId]);
}
