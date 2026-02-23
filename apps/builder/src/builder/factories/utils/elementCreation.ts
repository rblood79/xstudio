import { Element } from "../../../types/core/store.types";
import { ElementUtils } from "../../../utils/element/elementUtils";
import { useStore } from "../../stores";
import { ComponentDefinition, ChildDefinition } from "../types";
import { generateCustomId } from "../../utils/idGeneration";
import { getDB } from "../../../lib/db";
import { sanitizeElement } from "../../stores/utils/elementSanitizer";

/**
 * 컴포넌트 정의로부터 실제 Element 데이터 생성
 * 재귀적 중첩 children 지원 (TagGroup → TagList → Tag 등 3레벨 이상)
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

  // 자식 요소들 재귀 생성 (중첩 children 지원)
  const allElementsSoFar = [...currentElements, parent];
  const allChildren: Element[] = [];

  function processChildren(childDefs: ChildDefinition[], parentId: string): void {
    childDefs.forEach((childDef) => {
      const { children: nestedChildren, ...elementDef } = childDef;
      const child: Element = {
        ...elementDef,
        id: ElementUtils.generateId(),
        customId: generateCustomId(elementDef.tag, allElementsSoFar),
        parent_id: parentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      allChildren.push(child);
      allElementsSoFar.push(child);

      // 중첩 children 재귀 처리
      if (nestedChildren && nestedChildren.length > 0) {
        processChildren(nestedChildren, child.id);
      }
    });
  }

  processChildren(definition.children, parent.id);

  return { parent, children: allChildren };
}

/**
 * 생성된 요소들을 스토어와 IndexedDB에 추가
 * ⭐ ComponentFactory에서 사용되며, IndexedDB 저장도 함께 처리
 */
export function addElementsToStore(
  parent: Element,
  children: Element[]
): Element[] {
  const store = useStore.getState();
  const currentElements = store.elements;
  const newElements = [...currentElements, parent, ...children];

  // 1. 메모리 스토어 업데이트 (UI 즉시 반영)
  store.setElements(newElements);

  // 2. 히스토리 기록
  const { saveSnapshot } = store as unknown as {
    saveSnapshot: (elements: Element[], description: string) => void;
  };
  if (saveSnapshot) {
    saveSnapshot(newElements, "복합 컴포넌트 생성");
  }

  // 3. IndexedDB에 저장 (백그라운드, 에러 발생 시에도 UI는 정상 동작)
  const allElements = [parent, ...children];
  setTimeout(async () => {
    try {
      const db = await getDB();
      await db.elements.insertMany(
        allElements.map((el) => sanitizeElement(el))
      );
      console.log(
        `✅ [IndexedDB] 복합 컴포넌트 저장 완료: ${parent.tag} + 자식 ${children.length}개`
      );
    } catch (error) {
      console.warn(
        "⚠️ [IndexedDB] 저장 중 오류 (메모리는 정상):",
        error
      );
    }
  }, 0);

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
