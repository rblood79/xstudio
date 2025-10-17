import React from "react";
import {
  Tree,
  TreeItem,
  TagGroup,
  Tag,
  ToggleButtonGroup,
  ToggleButton,
} from "../../components/list";
import { PreviewElement, RenderContext } from "../types";
import { ElementUtils } from "../../../utils/elementUtils";

/**
 * Collection 관련 컴포넌트 렌더러
 * - Tree, TreeItem
 * - TagGroup, Tag
 * - ToggleButtonGroup, ToggleButton
 */

/**
 * Tree 렌더링
 */
export const renderTree = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  const treeItemChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "TreeItem")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const renderTreeItemsRecursively = (
    items: PreviewElement[]
  ): React.ReactNode => {
    return items.map((item) => {
      const childTreeItems = elements
        .filter((child) => child.parent_id === item.id && child.tag === "TreeItem")
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const otherChildren = elements
        .filter((child) => child.parent_id === item.id && child.tag !== "TreeItem")
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const displayTitle = String(
        item.props.title ||
          item.props.label ||
          item.props.value ||
          item.props.children ||
          `Item ${item.id}`
      );

      const hasChildren = childTreeItems.length > 0;

      return (
        <TreeItem
          key={item.id}
          data-element-id={item.id}
          id={item.id}
          title={displayTitle}
          hasChildren={hasChildren}
          showInfoButton={false}
          style={item.props.style}
          className={item.props.className}
          children={otherChildren.map((child) => context.renderElement(child))}
          childItems={
            hasChildren ? renderTreeItemsRecursively(childTreeItems) : undefined
          }
        />
      );
    });
  };

  return (
    <Tree
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      aria-label={String(element.props["aria-label"] || "Tree")}
      selectionMode={
        (element.props.selectionMode as "none" | "single" | "multiple") ||
        "single"
      }
      selectionBehavior={
        (element.props.selectionBehavior as "replace" | "toggle") || "replace"
      }
      expandedKeys={
        Array.isArray(element.props.expandedKeys)
          ? (element.props.expandedKeys as unknown as string[])
          : []
      }
      selectedKeys={
        Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : []
      }
      onSelectionChange={(selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);
      }}
      onExpandedChange={(expandedKeys) => {
        const updatedProps = {
          ...element.props,
          expandedKeys: Array.from(expandedKeys),
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {renderTreeItemsRecursively(treeItemChildren)}
    </Tree>
  );
};

/**
 * TreeItem 렌더링 (독립적으로 렌더링될 때)
 */
export const renderTreeItem = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements } = context;

  const childTreeItems = elements
    .filter((child) => child.parent_id === element.id && child.tag === "TreeItem")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const otherChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag !== "TreeItem")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const displayTitle = String(
    element.props.title ||
      element.props.label ||
      element.props.value ||
      element.props.children ||
      `Item ${element.id}`
  );

  const hasChildren = childTreeItems.length > 0;

  return (
    <TreeItem
      key={element.id}
      data-element-id={element.id}
      id={element.id}
      title={displayTitle}
      hasChildren={hasChildren}
      showInfoButton={true}
      children={otherChildren.map((child) => context.renderElement(child))}
      childItems={
        hasChildren
          ? childTreeItems.map((childItem) => context.renderElement(childItem))
          : undefined
      }
    />
  );
};

/**
 * TagGroup 렌더링
 */
export const renderTagGroup = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps, setElements } = context;

  const tagChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Tag")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <TagGroup
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      allowsRemoving={Boolean(element.props.allowsRemoving)}
      selectionMode={
        (element.props.selectionMode as "none" | "single" | "multiple") || "none"
      }
      selectionBehavior={
        (element.props.selectionBehavior as "toggle" | "replace") || "toggle"
      }
      selectedKeys={
        Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : []
      }
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "horizontal"
      }
      isDisabled={Boolean(element.props.isDisabled)}
      disallowEmptySelection={Boolean(element.props.disallowEmptySelection)}
      onSelectionChange={async (selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);

        try {
          await ElementUtils.updateElementProps(element.id, updatedProps);
          console.log("TagGroup selectedKeys updated successfully");
        } catch (err) {
          console.error("Error updating TagGroup selectedKeys:", err);
        }

        window.parent.postMessage(
          {
            type: "UPDATE_ELEMENT_PROPS",
            elementId: element.id,
            props: {
              selectedKeys: Array.from(selectedKeys),
            },
            merge: true,
          },
          window.location.origin
        );
      }}
      onRemove={async (keys) => {
        console.log("Removing tags:", Array.from(keys));

        const keysToRemove = Array.from(keys);
        const deletedTagIds: string[] = [];

        for (const key of keysToRemove) {
          let tagId = key;
          if (typeof key === "string" && key.startsWith("react-aria-")) {
            const index = parseInt(key.replace("react-aria-", "")) - 1;
            const tagToRemove = tagChildren[index];
            if (tagToRemove) {
              tagId = tagToRemove.id;
            }
          }

          try {
            await ElementUtils.deleteElement(String(tagId));
            deletedTagIds.push(String(tagId));
            console.log(`Tag ${tagId} deleted successfully`);
          } catch (err) {
            console.error(`Error deleting tag ${tagId}:`, err);
          }
        }

        const currentElements = elements;
        const updatedElements = currentElements.filter(
          (el) => !deletedTagIds.includes(el.id)
        );

        const currentSelectedKeys = Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : [];
        const updatedSelectedKeys = currentSelectedKeys.filter(
          (key) => !keysToRemove.includes(key)
        );

        const updatedProps = {
          ...element.props,
          selectedKeys: updatedSelectedKeys,
        };

        setElements(updatedElements);
        updateElementProps(element.id, updatedProps);

        try {
          await ElementUtils.updateElementProps(element.id, updatedProps);
          console.log("TagGroup selectedKeys updated after removal");
        } catch (err) {
          console.error(
            "Error updating TagGroup selectedKeys after removal:",
            err
          );
        }

        setTimeout(() => {
          window.parent.postMessage(
            {
              type: "UPDATE_ELEMENTS",
              elements: updatedElements,
            },
            window.location.origin
          );
        }, 0);
      }}
      items={tagChildren.map((tag) => ({
        id: tag.id,
        label: String(tag.props.children || ""),
        value: tag.id,
      }))}
    >
      {tagChildren.map((tag) => (
        <Tag
          key={tag.id}
          data-element-id={tag.id}
          isDisabled={Boolean(tag.props.isDisabled)}
          style={tag.props.style}
          className={tag.props.className}
        >
          {String(tag.props.children || "")}
        </Tag>
      ))}
    </TagGroup>
  );
};

/**
 * Tag 렌더링 (독립적으로 렌더링될 때)
 */
export const renderTag = (
  element: PreviewElement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  , _context: RenderContext
): React.ReactNode => {
  return (
    <Tag
      key={element.id}
      data-element-id={element.id}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      textValue={String(element.props.children || "")}
    >
      {String(element.props.children || "")}
    </Tag>
  );
};

/**
 * ToggleButtonGroup 렌더링
 */
export const renderToggleButtonGroup = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  const orientation = element.props.orientation as "horizontal" | "vertical";
  const indicator = Boolean(element.props.indicator);

  const toggleButtonChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "ToggleButton")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <ToggleButtonGroup
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      orientation={orientation}
      selectionMode={element.props.selectionMode as "single" | "multiple"}
      indicator={indicator}
      defaultSelectedKeys={
        Array.isArray(element.props.value) ? element.props.value : []
      }
      onSelectionChange={async (selectedKeys) => {
        const updatedProps = {
          ...element.props,
          value: Array.from(selectedKeys).map((key) => String(key)),
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {toggleButtonChildren.map((toggleButton) =>
        context.renderElement(toggleButton)
      )}
    </ToggleButtonGroup>
  );
};

/**
 * ToggleButton 렌더링
 */
export const renderToggleButton = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const isInGroup = elements.some(
    (parent) =>
      parent.id === element.parent_id && parent.tag === "ToggleButtonGroup"
  );

  const parentGroup = isInGroup
    ? elements.find((parent) => parent.id === element.parent_id)
    : null;

  return (
    <ToggleButton
      key={element.id}
      id={element.id}
      data-element-id={element.id}
      isSelected={
        isInGroup
          ? Array.isArray(parentGroup?.props.value) &&
            parentGroup.props.value.includes(element.id)
          : element.props.isSelected
      }
      defaultSelected={element.props.defaultSelected}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      onPress={() => {
        if (isInGroup && parentGroup) {
          const currentValue = Array.isArray(parentGroup.props.value)
            ? parentGroup.props.value
            : [];
          let newValue;

          if (parentGroup.props.selectionMode === "multiple") {
            newValue = currentValue.includes(element.id)
              ? currentValue.filter((id: string) => id !== element.id)
              : [...currentValue, element.id];
          } else {
            newValue = currentValue.includes(element.id) ? [] : [element.id];
          }

          updateElementProps(parentGroup.id, {
            ...parentGroup.props,
            value: newValue,
          } as Record<string, unknown>);
        } else {
          const updatedProps = {
            ...element.props,
            isSelected: !element.props.isSelected,
          };
          updateElementProps(element.id, updatedProps);
        }
      }}
    >
      {typeof element.props.children === "string" ? element.props.children : null}
      {children.map((child) => context.renderElement(child, child.id))}
    </ToggleButton>
  );
};
