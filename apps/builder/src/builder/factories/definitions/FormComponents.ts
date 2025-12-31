import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * TextField 컴포넌트 정의
 * TextField는 단순 컴포넌트로, Label/Input/Description/FieldError를 내부적으로 렌더링합니다.
 * 따라서 children 없이 TextField 하나만 생성합니다.
 */
export function createTextFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "TextField",
    parent: {
      tag: "TextField",
      props: {
        label: "Text Field",
        description: "",
        errorMessage: "",
        placeholder: "Enter text...",
        value: "",
        type: "text",
        isRequired: false,
        isDisabled: false,
        isReadOnly: false,
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [], // TextField는 children이 없는 단순 컴포넌트
  };
}
