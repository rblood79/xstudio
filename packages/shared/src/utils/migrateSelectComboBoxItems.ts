/**
 * ADR-073 P5: Select/ComboBox element tree → items[] 런타임 마이그레이션
 *
 * 프로젝트 로드 시 호출되어 legacy SelectItem/ComboBoxItem child element 를
 * Select.items[] / ComboBox.items[] 배열로 흡수.
 *
 * 삭제는 `removeElements(childIds, { skipHistory: true })` 로 별도 수행 — undo 스택 보존.
 */

import type { StoredSelectItem } from "@composition/specs";
import type { StoredComboBoxItem } from "@composition/specs";

interface ElementLike {
  id: string;
  tag: string;
  parent_id?: string | null;
  order_num?: number;
  props: Record<string, unknown>;
}

export interface SelectComboBoxMigrationResult<T extends ElementLike> {
  migratedElements: T[];
  orphanIds: string[];
}

/**
 * 프로젝트 로드 시점에 호출되는 오케스트레이터.
 *
 * 입력 elements 로부터 Select/ComboBox 부모별 SelectItem/ComboBoxItem 자식을 수집하여
 * `items[]` 배열로 변환, 부모 props.items 에 주입한다. 자식 element 는 `orphanIds` 로 분리 반환.
 *
 * 호출 측(예: usePageManager.initializeProject)은:
 *  1. `migratedElements` 로 store hydrate (자식 제거 + 부모 props.items 병합)
 *  2. `orphanIds` 로 IDB `deleteMany` 수행 (영속 정리)
 *
 * 제네릭 T 로 호출 측의 실제 Element 타입을 보존 (추가 필드 유지).
 */
export function applySelectComboBoxMigration<T extends ElementLike>(
  elements: T[],
): SelectComboBoxMigrationResult<T> {
  const orphanIds: string[] = [];

  // parent_id 기준 인덱스: Select/ComboBox 부모별 자식 그룹화
  const childrenByParent = new Map<string, T[]>();
  for (const el of elements) {
    if (el.tag !== "SelectItem" && el.tag !== "ComboBoxItem") continue;
    if (!el.parent_id) continue;
    const arr = childrenByParent.get(el.parent_id);
    if (arr) arr.push(el);
    else childrenByParent.set(el.parent_id, [el]);
  }

  if (childrenByParent.size === 0) {
    // 마이그레이션 대상 없음 — 원본 그대로 반환
    return { migratedElements: elements, orphanIds: [] };
  }

  const migratedElements: T[] = [];
  for (const el of elements) {
    // SelectItem/ComboBoxItem 자식은 제외 + orphan 기록
    if (el.tag === "SelectItem" || el.tag === "ComboBoxItem") {
      orphanIds.push(el.id);
      continue;
    }

    // Select/ComboBox 부모는 items[] 주입 (자식이 있었던 경우에만)
    const children = childrenByParent.get(el.id);
    if (children && (el.tag === "Select" || el.tag === "ComboBox")) {
      const items =
        el.tag === "Select"
          ? selectItemChildrenToItemsArray(children)
          : comboBoxItemChildrenToItemsArray(children);
      migratedElements.push({
        ...el,
        props: { ...(el.props ?? {}), items },
      });
      continue;
    }

    migratedElements.push(el);
  }

  return { migratedElements, orphanIds };
}

export function selectItemChildrenToItemsArray(
  selectItemChildren: ElementLike[],
): StoredSelectItem[] {
  return [...selectItemChildren]
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((child) => {
      const p = child.props ?? {};
      return {
        id: child.id,
        label:
          typeof p.label === "string" && p.label.length > 0
            ? p.label
            : child.id,
        value: typeof p.value === "string" ? p.value : undefined,
        textValue:
          typeof p.textValue === "string" ? p.textValue : undefined,
        isDisabled: p.isDisabled === true || undefined,
        icon: typeof p.icon === "string" ? p.icon : undefined,
        description:
          typeof p.description === "string" ? p.description : undefined,
      };
    });
}

export function comboBoxItemChildrenToItemsArray(
  comboBoxItemChildren: ElementLike[],
): StoredComboBoxItem[] {
  return [...comboBoxItemChildren]
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((child) => {
      const p = child.props ?? {};
      return {
        id: child.id,
        label:
          typeof p.label === "string" && p.label.length > 0
            ? p.label
            : child.id,
        value: typeof p.value === "string" ? p.value : undefined,
        textValue:
          typeof p.textValue === "string" ? p.textValue : undefined,
        isDisabled: p.isDisabled === true || undefined,
        icon: typeof p.icon === "string" ? p.icon : undefined,
        description:
          typeof p.description === "string" ? p.description : undefined,
      };
    });
}
