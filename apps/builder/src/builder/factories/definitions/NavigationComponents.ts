import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Menu 컴포넌트 정의
 *
 * CSS DOM 구조 대응:
 *   Menu (parent, tag="Menu")
 *     ├─ MenuItem (tag="MenuItem", children="Menu Item 1")
 *     ├─ MenuItem (tag="MenuItem", children="Menu Item 2")
 *     └─ MenuItem (tag="MenuItem", children="Menu Item 3")
 */
export function createMenuDefinition(
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
    tag: "Menu",
    parent: {
      tag: "Menu",
      props: {
        "aria-label": "Menu",
        selectionMode: "none",
        style: {
          display: "block",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "MenuItem",
        props: {
          children: "Menu Item 1",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "MenuItem",
        props: {
          children: "Menu Item 2",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "MenuItem",
        props: {
          children: "Menu Item 3",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}

/**
 * Pagination 컴포넌트 정의
 *
 * CSS DOM 구조 대응:
 *   Pagination (parent, tag="Pagination", flex row)
 *     ├─ Button ("←", Prev)
 *     ├─ Button ("1")
 *     ├─ Button ("2")
 *     ├─ Button ("3")
 *     └─ Button ("→", Next)
 */
export function createPaginationDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Pagination",
    parent: {
      tag: "Pagination",
      props: {
        totalPages: 5,
        currentPage: 1,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Button",
        props: {
          children: "←",
          variant: "outline",
          size: "sm",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Button",
        props: {
          children: "1",
          variant: "default",
          size: "sm",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "Button",
        props: {
          children: "2",
          variant: "outline",
          size: "sm",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "Button",
        props: {
          children: "3",
          variant: "outline",
          size: "sm",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
      {
        tag: "Button",
        props: {
          children: "→",
          variant: "outline",
          size: "sm",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 5,
      },
    ],
  };
}

/**
 * Disclosure 컴포넌트 정의
 *
 * CSS DOM 구조 대응:
 *   Disclosure (parent, tag="Disclosure")
 *     ├─ DisclosureHeader (tag="DisclosureHeader", children="Section Title")
 *     └─ DisclosureContent (tag="DisclosureContent", children="Section content goes here.")
 */
export function createDisclosureDefinition(
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
    tag: "Disclosure",
    parent: {
      tag: "Disclosure",
      props: {
        style: {
          display: "block",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "DisclosureHeader",
        props: {
          children: "Section Title",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "DisclosureContent",
        props: {
          children: "Section content goes here.",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * DisclosureGroup 컴포넌트 정의
 *
 * CSS DOM 구조 대응 (3-level 중첩):
 *   DisclosureGroup (parent, tag="DisclosureGroup")
 *     ├─ Disclosure (tag="Disclosure", style: display block)
 *     │    ├─ DisclosureHeader (tag="DisclosureHeader", children="Section 1")
 *     │    └─ DisclosureContent (tag="DisclosureContent", children="Content 1")
 *     └─ Disclosure (tag="Disclosure", style: display block)
 *          ├─ DisclosureHeader (tag="DisclosureHeader", children="Section 2")
 *          └─ DisclosureContent (tag="DisclosureContent", children="Content 2")
 *
 * ChildDefinition.children 재귀 필드로 3레벨 중첩 표현
 */
export function createDisclosureGroupDefinition(
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
    tag: "DisclosureGroup",
    parent: {
      tag: "DisclosureGroup",
      props: {
        style: {
          display: "block",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Disclosure",
        props: {
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "DisclosureHeader",
            props: {
              children: "Section 1",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "DisclosureContent",
            props: {
              children: "Content 1",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 2,
          },
        ],
      },
      {
        tag: "Disclosure",
        props: {
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "DisclosureHeader",
            props: {
              children: "Section 2",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "DisclosureContent",
            props: {
              children: "Content 2",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 2,
          },
        ],
      },
    ],
  };
}
