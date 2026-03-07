/**
 * useResolvedElement Hook
 *
 * Element의 Master-Instance resolution을 수행.
 *
 * 기존 요소(componentRole 없음)에는
 * 원본 element 참조를 그대로 반환하여 성능 영향 제로.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.1
 */

import { useMemo } from "react";
import type { Element } from "../../../../types/builder/unified.types";
import { isInstanceElement } from "../../../../types/builder/unified.types";
import { useStore } from "../../../stores";
import { resolveInstanceElement } from "../../../../utils/component/instanceResolver";

/**
 * Element의 instance resolution을 수행
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

  return useMemo(() => {
    if (isInstanceElement(element) && masterElement) {
      return resolveInstanceElement(element, masterElement);
    }
    return element;
  }, [element, masterElement]);
}
