import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";
import type {
  StoredSelectItem,
  StoredComboBoxItem,
  StoredListBoxItem,
  StoredGridListItem,
} from "@composition/specs";

/**
 * Select 컴포넌트 정의 (ADR-073 P6)
 *
 * items prop 으로 SelectItem 데이터를 직렬화 가능한 StoredSelectItem[] 형태로 관리.
 * SelectItem 자식 element는 더 이상 생성하지 않는다.
 * Label / SelectTrigger (SelectValue + SelectIcon) sub-element 는 유지.
 */
export function createSelectDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System: layoutId가 있으면 layout_id 사용, 없으면 page_id 사용
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  const items: StoredSelectItem[] = [
    { id: crypto.randomUUID(), label: "Aardvark", value: "aardvark" },
    { id: crypto.randomUUID(), label: "Cat", value: "cat" },
    { id: crypto.randomUUID(), label: "Dog", value: "dog" },
    { id: crypto.randomUUID(), label: "Kangaroo", value: "kangaroo" },
  ];

  return {
    tag: "Select",
    parent: {
      tag: "Select",
      props: {
        label: "Select",
        name: "",
        placeholder: "Choose an option...",
        selectedKey: undefined,
        labelPosition: "top",
        isDisabled: false,
        isInvalid: false,
        isReadOnly: false,
        isRequired: false,
        items,
        style: {
          width: "100%",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Select",
          style: {
            width: "fit-content",
            height: "fit-content",
            fontWeight: 600,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "SelectTrigger",
        props: {
          style: {
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "SelectValue",
            props: {
              placeholder: "Choose an option...",
              style: { flex: 1 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "SelectIcon",
            props: {
              children: "",
              style: { width: 18, height: 18, flexShrink: 0 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
    ],
  };
}

/**
 * ComboBox 컴포넌트 정의 (ADR-073 P6)
 *
 * items prop 으로 ComboBoxItem 데이터를 직렬화 가능한 StoredComboBoxItem[] 형태로 관리.
 * ComboBoxItem 자식 element는 더 이상 생성하지 않는다.
 * Label / ComboBoxWrapper (ComboBoxInput + ComboBoxTrigger) sub-element 는 유지.
 */
export function createComboBoxDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  const items: StoredComboBoxItem[] = [
    { id: crypto.randomUUID(), label: "Aardvark", value: "aardvark" },
    { id: crypto.randomUUID(), label: "Cat", value: "cat" },
    { id: crypto.randomUUID(), label: "Dog", value: "dog" },
    { id: crypto.randomUUID(), label: "Kangaroo", value: "kangaroo" },
  ];

  return {
    tag: "ComboBox",
    parent: {
      tag: "ComboBox",
      props: {
        label: "Combo Box",
        name: "",
        placeholder: "Type or select...",
        inputValue: "",
        allowsCustomValue: true,
        selectedKey: undefined,
        labelPosition: "top",
        isDisabled: false,
        isInvalid: false,
        isReadOnly: false,
        isRequired: false,
        items,
        style: {
          width: "100%",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Combo Box",
          style: {
            width: "fit-content",
            height: "fit-content",
            fontWeight: 600,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "ComboBoxWrapper",
        props: {
          style: {
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "ComboBoxInput",
            props: {
              children: "",
              placeholder: "Type or select...",
              style: { flex: 1 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "ComboBoxTrigger",
            props: {
              children: "",
              style: { width: 18, height: 18, flexShrink: 0 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
    ],
  };
}

/**
 * ListBox 컴포넌트 정의 (ADR-076 P6)
 *
 * items prop 으로 ListBoxItem 데이터를 직렬화 가능한 StoredListBoxItem[] 형태로 관리.
 * 정적 모드 ListBoxItem 자식 element 는 더 이상 생성하지 않는다 (부모 단위 원자성).
 * 템플릿 모드(columnMapping/PropertyDataBinding + Field 자식) 는 별도 워크플로 —
 * APICollectionEditor 등이 명시적으로 ListBoxItem + Field 자식을 생성.
 */
export function createListBoxDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  const items: StoredListBoxItem[] = [
    {
      id: crypto.randomUUID(),
      label: "Aardvark",
      value: "aardvark",
      description: "A nocturnal burrowing mammal",
    },
    {
      id: crypto.randomUUID(),
      label: "Cat",
      value: "cat",
      description: "A small domesticated carnivore",
    },
    {
      id: crypto.randomUUID(),
      label: "Kangaroo",
      value: "kangaroo",
      description: "A large marsupial native to Australia",
    },
  ];

  return {
    tag: "ListBox",
    parent: {
      tag: "ListBox",
      props: {
        orientation: "vertical",
        selectionMode: "single",
        items,
        // ADR-079 P3: 중복 주입 해체 — display/flex-direction/gap/padding 은 Spec SSOT.
        //   Style Panel = useLayoutAuxiliary hook read-through (P2)
        //   Preview CSS = generated/ListBox.css (Generator)
        //   Canvas Skia = implicitStyles.listbox 분기 (layout engine 전용 경로)
        //   factory 는 사용자 커스터마이징 기본값 (width) 만 보유.
        style: {
          width: "100%",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [],
  };
}

/**
 * GridList 컴포넌트 정의
 *
 * ADR-099 Phase 5: 신규 GridList 는 `props.items` canonical 경로를 기본 사용한다.
 * legacy GridListItem child template 경로는 기존 프로젝트 호환용으로만 유지된다.
 */
export function createGridListDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  const items: StoredGridListItem[] = [
    {
      id: crypto.randomUUID(),
      label: "Desert Sunset",
      textValue: "Desert Sunset",
      description: "PNG • 2/3/2024",
    },
    {
      id: crypto.randomUUID(),
      label: "Hiking Trail",
      textValue: "Hiking Trail",
      description: "JPEG • 1/10/2022",
    },
    {
      id: crypto.randomUUID(),
      label: "Mountain Sunrise",
      textValue: "Mountain Sunrise",
      description: "PNG • 3/15/2015",
    },
  ];

  return {
    tag: "GridList",
    parent: {
      tag: "GridList",
      props: {
        layout: "stack",
        columns: 2,
        selectionMode: "none",
        items,
        style: {
          width: "100%",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [],
  };
}

/**
 * List 컴포넌트 정의
 */
export function createListDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "List",
    parent: {
      tag: "List",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 4,
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ListItem",
        props: {
          children: "Item 1",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "ListItem",
        props: {
          children: "Item 2",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "ListItem",
        props: {
          children: "Item 3",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}
