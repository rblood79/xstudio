import { ComponentElementProps } from "../../../types/store";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * TextField 컴포넌트 정의
 */
export function createTextFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "TextField",
    parent: {
      tag: "TextField",
      props: {
        label: "Text Field",
        placeholder: "Enter text...",
        value: "",
        type: "text",
        isRequired: false,
        isDisabled: false,
        isReadOnly: false,
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: { children: "Label" } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "Input",
        props: {
          type: "text",
          placeholder: "Enter text...",
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
      {
        tag: "Description",
        props: { children: "Description" } as ComponentElementProps,
        page_id: pageId,
        order_num: 3,
      },
      {
        tag: "FieldError",
        props: { children: "Error message" } as ComponentElementProps,
        page_id: pageId,
        order_num: 4,
      },
    ],
  };
}
