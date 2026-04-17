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
  parent_id: string | null;
  order_num: number;
  props: Record<string, unknown>;
}

export function selectItemChildrenToItemsArray(
  selectItemChildren: ElementLike[],
): StoredSelectItem[] {
  return [...selectItemChildren]
    .sort((a, b) => a.order_num - b.order_num)
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
    .sort((a, b) => a.order_num - b.order_num)
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
