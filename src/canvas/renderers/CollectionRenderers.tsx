import React from "react";
import {
  Tree,
  TreeItem,
  TagGroup,
  Tag,
  ToggleButtonGroup,
  ToggleButton,
  MenuButton,
  MenuItem,
  Toolbar,
} from "../../shared/components/list";
import { DataField } from "../../shared/components/Field";
import { PreviewElement, RenderContext } from "../types";
import { getDB } from "../../lib/db";
import { getVisibleColumns } from "../../utils/element/columnTypeInference";
import type { ColumnMapping } from "../../types/builder/unified.types";

/**
 * Collection 관련 컴포넌트 렌더러
 * - Tree, TreeItem
 * - TagGroup, Tag
 * - ToggleButtonGroup, ToggleButton
 * - Menu, Toolbar
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
      id={element.customId}
      data-element-id={element.id}
      dataBinding={element.dataBinding || element.props.dataBinding}
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
      id={element.customId}
      data-element-id={element.id}
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

  // ColumnMapping 추출
  const columnMapping = (element.props as { columnMapping?: ColumnMapping })
    .columnMapping;

  // PropertyDataBinding 형식 감지 (source: 'dataTable' 또는 'apiEndpoint', name: 'xxx')
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding = dataBinding &&
    'source' in dataBinding &&
    'name' in dataBinding &&
    !('type' in dataBinding);

  // Tag 템플릿에 Field children이 있는지 미리 확인
  const tagTemplate = tagChildren.length > 0 ? tagChildren[0] : null;
  const fieldChildrenInTemplate = tagTemplate
    ? elements.filter((child) => child.parent_id === tagTemplate.id && child.tag === "Field")
    : [];
  const hasFieldChildren = fieldChildrenInTemplate.length > 0;

  // columnMapping이 있거나, (PropertyDataBinding + Field children) 있으면 Field 렌더링 모드 사용
  const hasValidTemplate = (columnMapping || (isPropertyBinding && hasFieldChildren)) && tagChildren.length > 0;

  // 제거된 항목 ID 추적 (columnMapping 모드에서 동적 데이터 항목 제거용)
  const removedItemIds = Array.isArray(element.props.removedItemIds)
    ? (element.props.removedItemIds as unknown as string[])
    : [];

  const renderChildren = hasValidTemplate
    ? (item: Record<string, unknown>) => {
        const tagTemplate = tagChildren[0];
        const fieldChildren = context.elements
          .filter(
            (child) =>
              child.parent_id === tagTemplate.id && child.tag === "Field"
          )
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <Tag
            key={String(item.id)}
            data-element-id={tagTemplate.id}
            isDisabled={Boolean(tagTemplate.props.isDisabled)}
            style={tagTemplate.props.style}
            className={tagTemplate.props.className}
          >
            {fieldChildren.length > 0
              ? fieldChildren.map((field) => {
                  // fieldKey 또는 key 속성 모두 지원 (fieldKey 우선)
                  const fieldKey = (field.props as { fieldKey?: string; key?: string }).fieldKey ||
                    (field.props as { key?: string }).key;
                  const fieldValue = fieldKey ? item[fieldKey] : undefined;

                  return (
                    <DataField
                      key={field.id}
                      fieldKey={fieldKey || ""}
                      label={(field.props as { label?: string }).label}
                      type={
                        (field.props as { type?: string }).type as
                          | "string"
                          | "number"
                          | "boolean"
                          | "date"
                          | "image"
                          | "url"
                          | "email"
                      }
                      value={fieldValue}
                      visible={(field.props as { visible?: boolean }).visible !== false}
                      style={field.props.style}
                      className={field.props.className}
                    />
                  );
                })
              : String(tagTemplate.props.children || "")}
          </Tag>
        );
      }
    : tagChildren.map((tag) => (
        <Tag
          key={tag.id}
          data-element-id={tag.id}
          isDisabled={Boolean(tag.props.isDisabled)}
          style={tag.props.style}
          className={tag.props.className}
        >
          {String(tag.props.children || "")}
        </Tag>
      ));

  return (
    <TagGroup
      key={element.id}
      id={element.customId}
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
      variant={
        (element.props.variant as "default" | "primary" | "secondary" | "surface") || "default"
      }
      size={
        (element.props.size as "sm" | "md" | "lg") || "md"
      }
      dataBinding={element.dataBinding || element.props.dataBinding}
      columnMapping={columnMapping}
      removedItemIds={removedItemIds}
      onSelectionChange={async (selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);

        try {
          const db = await getDB();
          await db.elements.update(element.id, { props: updatedProps });
          console.log("✅ [IndexedDB] TagGroup selectedKeys updated successfully");
        } catch (err) {
          console.error("❌ [IndexedDB] Error updating TagGroup selectedKeys:", err);
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

        const keysToRemove = Array.from(keys).map(String);

        // ColumnMapping 모드: 동적 데이터 항목 제거 (removedItemIds에 추가)
        if (hasValidTemplate) {
          const currentRemovedIds = Array.isArray(element.props.removedItemIds)
            ? (element.props.removedItemIds as unknown as string[])
            : [];

          const updatedRemovedIds = [...currentRemovedIds, ...keysToRemove];

          const currentSelectedKeys = Array.isArray(element.props.selectedKeys)
            ? (element.props.selectedKeys as unknown as string[])
            : [];
          const updatedSelectedKeys = currentSelectedKeys.filter(
            (key) => !keysToRemove.includes(String(key))
          );

          const updatedProps = {
            ...element.props,
            removedItemIds: updatedRemovedIds,
            selectedKeys: updatedSelectedKeys,
          };

          updateElementProps(element.id, updatedProps);

          try {
            const db = await getDB();
            await db.elements.update(element.id, { props: updatedProps });
            console.log("✅ [IndexedDB] TagGroup removedItemIds updated:", updatedRemovedIds);
          } catch (err) {
            console.error("❌ [IndexedDB] Error updating TagGroup removedItemIds:", err);
          }

          window.parent.postMessage(
            {
              type: "UPDATE_ELEMENT_PROPS",
              elementId: element.id,
              props: {
                removedItemIds: updatedRemovedIds,
                selectedKeys: updatedSelectedKeys,
              },
              merge: true,
            },
            window.location.origin
          );

          return;
        }

        // Static 모드: Element 삭제
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
            const db = await getDB();
            await db.elements.delete(String(tagId));
            deletedTagIds.push(String(tagId));
            console.log(`✅ [IndexedDB] Tag ${tagId} deleted successfully`);
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
          (key) => !keysToRemove.includes(String(key))
        );

        const updatedProps = {
          ...element.props,
          selectedKeys: updatedSelectedKeys,
        };

        setElements(updatedElements);
        updateElementProps(element.id, updatedProps);

        try {
          const db = await getDB();
          await db.elements.update(element.id, { props: updatedProps });
          console.log("✅ [IndexedDB] TagGroup selectedKeys updated after removal");
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
    >
      {renderChildren}
    </TagGroup>
  );
};

/**
 * Tag 렌더링 (독립적으로 렌더링될 때)
 * - Static children 또는 Field children 지원
 */
export const renderTag = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements } = context;

  // Field 자식 요소 찾기
  const fieldChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Field")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // Field children이 있으면 DataField 렌더링 (단, 데이터는 없으므로 라벨만 표시)
  if (fieldChildren.length > 0) {
    return (
      <Tag
        key={element.id}
        id={element.customId}
        data-element-id={element.id}
        isDisabled={Boolean(element.props.isDisabled)}
        style={element.props.style}
        className={element.props.className}
        textValue={String(element.props.textValue || element.props.children || "")}
      >
        {fieldChildren.map((field) => {
          const fieldKey = (field.props as { fieldKey?: string; key?: string }).fieldKey ||
            (field.props as { key?: string }).key;
          return (
            <DataField
              key={field.id}
              fieldKey={fieldKey || ""}
              label={(field.props as { label?: string }).label}
              type={
                (field.props as { type?: string }).type as
                  | "string"
                  | "number"
                  | "boolean"
                  | "date"
                  | "image"
                  | "url"
                  | "email"
              }
              value={`{${fieldKey}}`} // 템플릿 모드에서 fieldKey 표시
              showLabel={(field.props as { showLabel?: boolean }).showLabel !== false}
              visible={(field.props as { visible?: boolean }).visible !== false}
              style={field.props.style}
              className={field.props.className}
            />
          );
        })}
      </Tag>
    );
  }

  // Field children이 없으면 기존 static 렌더링
  return (
    <Tag
      key={element.id}
      id={element.customId}
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
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      orientation={orientation}
      selectionMode={element.props.selectionMode as "single" | "multiple"}
      indicator={indicator}
      variant={
        (element.props.variant as "default" | "primary" | "secondary" | "surface") || "default"
      }
      size={
        (element.props.size as "sm" | "md" | "lg") || "md"
      }
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
      id={element.customId}
      data-element-id={element.id}
      isSelected={
        isInGroup
          ? Array.isArray(parentGroup?.props.value) &&
            parentGroup.props.value.includes(element.id)
          : element.props.isSelected
      }
      defaultSelected={element.props.defaultSelected}
      isDisabled={Boolean(element.props.isDisabled)}
      variant={
        !isInGroup
          ? (element.props.variant as "default" | "primary" | "secondary" | "surface") || "default"
          : undefined
      }
      size={
        !isInGroup
          ? (element.props.size as "sm" | "md" | "lg") || "md"
          : undefined
      }
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

/**
 * Menu 렌더링
 * Static 방법: MenuItem 자식을 직접 추가
 * Dynamic 방법: dataBinding을 통해 동적으로 MenuItem 생성 (MenuButton 컴포넌트에서 처리)
 */
export const renderMenu = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  // Static 방법: 직접 추가된 MenuItem 자식 요소들 찾기
  const menuItemChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "MenuItem")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <MenuButton
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      label={String(element.props.label || "Menu")}
      style={element.props.style}
      className={element.props.className}
      dataBinding={element.dataBinding || element.props.dataBinding}
    >
      {/* Static 방법: MenuItem 자식 렌더링 (dataBinding이 없을 때만) */}
      {menuItemChildren.map((child) => renderElement(child, child.id))}
    </MenuButton>
  );
};

/**
 * MenuItem 렌더링
 */
export const renderMenuItem = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <MenuItem
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      textValue={String(element.props.textValue || element.props.children || "")}
      isDisabled={Boolean(element.props.isDisabled)}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </MenuItem>
  );
};

/**
 * Toolbar 렌더링
 */
export const renderToolbar = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Toolbar
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      aria-label={String(element.props["aria-label"] || "Toolbar")}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Toolbar>
  );
};
