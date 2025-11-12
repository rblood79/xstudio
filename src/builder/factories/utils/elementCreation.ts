import { Element } from "../../../types/core/store.types";
import { ElementUtils } from "../../../utils/element/elementUtils";
import { useStore } from "../../stores";
import { ComponentDefinition } from "../types";
import { generateCustomId } from "../../utils/idGeneration";

/**
 * 컴포넌트 정의로부터 실제 Element 데이터 생성
 */
export function createElementsFromDefinition(
  definition: ComponentDefinition
): { parent: Element; children: Element[] } {
  // 현재 페이지의 모든 요소 가져오기 (customId 생성용)
  const store = useStore.getState();
  const currentElements = store.elements;

  // 부모 요소 생성
  const parent: Element = {
    ...definition.parent,
    id: ElementUtils.generateId(),
    customId: generateCustomId(definition.parent.tag, currentElements),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 자식 요소들 생성
  const allElementsSoFar = [...currentElements, parent]; // 부모를 포함한 임시 배열
  const children: Element[] = definition.children.map((childDef, index) => {
    const child: Element = {
      ...childDef,
      id: ElementUtils.generateId(),
      customId: generateCustomId(childDef.tag, allElementsSoFar),
      parent_id: parent.id,
      order_num: index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // 다음 자식 생성 시 이미 생성된 자식도 고려
    allElementsSoFar.push(child);
    return child;
  });

  return { parent, children };
}

/**
 * 생성된 요소들을 스토어에 추가 (UI 업데이트)
 */
export function addElementsToStore(
  parent: Element,
  children: Element[]
): Element[] {
  const store = useStore.getState();
  const currentElements = store.elements;
  const newElements = [...currentElements, parent, ...children];

  // 스토어 업데이트
  store.setElements(newElements);

  // 히스토리 기록
  const { saveSnapshot } = store as unknown as {
    saveSnapshot: (elements: Element[], description: string) => void;
  };
  if (saveSnapshot) {
    saveSnapshot(newElements, "복합 컴포넌트 생성");
  }

  return newElements;
}

/**
 * 스토어에서 요소 ID 업데이트 (임시 ID → 실제 DB ID)
 */
export function updateElementId(oldId: string, newId: string): void {
  const store = useStore.getState();
  const updatedElements = store.elements.map((el) =>
    el.id === oldId ? { ...el, id: newId } : el
  );
  store.setElements(updatedElements);
}
