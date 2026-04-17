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
} from "../components/list";
import { DataField } from "../components/Field";
import type {
  PreviewElement,
  RenderContext,
  ColumnMapping,
  DataBinding,
} from "../types";
import type { StoredMenuItem, RuntimeMenuItem } from "@composition/specs/types";
import { getSelectedChildIds } from "./selection";

/**
 * Stored → Runtime 변환 (Q11=나: EVENT_REGISTRY에 직접 의존 금지)
 * resolveActionId는 RenderContext를 통해 주입받음
 */
function toRuntimeMenuItem(
  item: StoredMenuItem,
  resolve?: (id: string) => (() => void) | undefined,
): RuntimeMenuItem {
  return {
    ...item,
    onAction: item.onActionId ? resolve?.(item.onActionId) : undefined,
    children: item.children?.map((c) => toRuntimeMenuItem(c, resolve)),
  };
}

/**
 * Collection 관련 컴포넌트 렌더러
 * - Tree, TreeItem
 * - TagGroup, Tag
 * - ToggleButtonGroup, ToggleButton
 * - Menu, Toolbar
 */

/** srcdoc iframe에서 origin이 'null'이 되므로 '*' fallback */
function getTargetOrigin(): string {
  const origin = window.location.origin;
  if (!origin || origin === "null") return "*";
  return origin;
}

/**
 * Tree 렌더링
 */
export const renderTree = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  const treeItemChildren = (context.childrenMap.get(element.id) ?? []).filter(
    (child) => child.tag === "TreeItem",
  );

  const renderTreeItemsRecursively = (
    items: PreviewElement[],
  ): React.ReactNode => {
    return items.map((item) => {
      const itemChildren = context.childrenMap.get(item.id) ?? [];
      const childTreeItems = itemChildren.filter(
        (child) => child.tag === "TreeItem",
      );
      const otherChildren = itemChildren.filter(
        (child) => child.tag !== "TreeItem",
      );

      const displayTitle = String(
        item.props.title ||
          item.props.label ||
          item.props.value ||
          item.props.children ||
          `Item ${item.id}`,
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
      dataBinding={
        (element.dataBinding || element.props.dataBinding) as
          | DataBinding
          | undefined
      }
      style={element.props.style}
      className={element.props.className}
      aria-label={String(
        element.props["aria-label"] || element.props.label || "Tree",
      )}
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
      defaultExpandedKeys={
        Array.isArray(element.props.defaultExpandedKeys)
          ? (element.props.defaultExpandedKeys as unknown as string[])
          : []
      }
      selectedKeys={
        Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : []
      }
      defaultSelectedKeys={
        Array.isArray(element.props.defaultSelectedKeys)
          ? (element.props.defaultSelectedKeys as unknown as string[])
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
  context: RenderContext,
): React.ReactNode => {
  const ownChildren = context.childrenMap.get(element.id) ?? [];
  const childTreeItems = ownChildren.filter(
    (child) => child.tag === "TreeItem",
  );
  const otherChildren = ownChildren.filter((child) => child.tag !== "TreeItem");

  const displayTitle = String(
    element.props.title ||
      element.props.label ||
      element.props.value ||
      element.props.children ||
      `Item ${element.id}`,
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
  context: RenderContext,
): React.ReactNode => {
  const { elements, childrenMap, updateElementProps, setElements } = context;

  // Tag 자식 검색: TagGroup 직접 자식 또는 TagList 중간 레이어 하위 모두 지원
  const tagListChild = childrenMap
    .get(element.id)
    ?.find((child) => child.tag === "TagList");
  const tagParentId = tagListChild ? tagListChild.id : element.id;
  const tagChildren =
    childrenMap.get(tagParentId)?.filter((child) => child.tag === "Tag") ?? [];

  // ColumnMapping 추출
  const columnMapping = (element.props as { columnMapping?: ColumnMapping })
    .columnMapping;

  // PropertyDataBinding 형식 감지 (source: 'dataTable' 또는 'apiEndpoint', name: 'xxx')
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding =
    dataBinding &&
    typeof dataBinding === "object" &&
    "source" in (dataBinding as object) &&
    "name" in (dataBinding as object) &&
    !("type" in (dataBinding as object));

  // Tag 템플릿에 Field children이 있는지 미리 확인
  const tagTemplate = tagChildren.length > 0 ? tagChildren[0] : null;
  const fieldChildrenInTemplate = tagTemplate
    ? (childrenMap.get(tagTemplate.id)?.filter((c) => c.tag === "Field") ?? [])
    : [];
  const hasFieldChildren = fieldChildrenInTemplate.length > 0;

  // columnMapping이 있거나, (PropertyDataBinding + Field children) 있으면 Field 렌더링 모드 사용
  const hasValidTemplate =
    (columnMapping || (isPropertyBinding && hasFieldChildren)) &&
    tagChildren.length > 0;

  // 제거된 항목 ID 추적 (columnMapping 모드에서 동적 데이터 항목 제거용)
  const removedItemIds = Array.isArray(element.props.removedItemIds)
    ? (element.props.removedItemIds as unknown as string[])
    : [];

  const renderChildren = hasValidTemplate
    ? (item: Record<string, unknown>) => {
        const tagTemplate = tagChildren[0];
        const fieldChildren =
          context.childrenMap
            .get(tagTemplate.id)
            ?.filter((child) => child.tag === "Field") ?? [];

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
                  const fieldKey =
                    (field.props as { fieldKey?: string; key?: string })
                      .fieldKey || (field.props as { key?: string }).key;
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
                      visible={
                        (field.props as { visible?: boolean }).visible !== false
                      }
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
      className={element.props.className}
      variant={String(element.props.variant || "default")}
      label={String(element.props.label || "")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      allowsRemoving={Boolean(element.props.allowsRemoving)}
      selectionMode={
        (element.props.selectionMode as "none" | "single" | "multiple") ||
        "none"
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
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      labelPosition={(element.props.labelPosition as "top" | "side") || "top"}
      maxRows={
        typeof element.props.maxRows === "number"
          ? element.props.maxRows
          : undefined
      }
      dataBinding={
        (element.dataBinding || element.props.dataBinding) as
          | DataBinding
          | undefined
      }
      columnMapping={columnMapping}
      removedItemIds={removedItemIds}
      onSelectionChange={async (selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);

        try {
          const db = (await context.services?.getDB?.()) as
            | {
                elements: {
                  update: (
                    id: string,
                    data: Record<string, unknown>,
                  ) => Promise<void>;
                };
              }
            | undefined;
          if (db) {
            await db.elements.update(element.id, { props: updatedProps });
            console.log(
              "✅ [IndexedDB] TagGroup selectedKeys updated successfully",
            );
          }
        } catch (err) {
          console.error(
            "❌ [IndexedDB] Error updating TagGroup selectedKeys:",
            err,
          );
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
          getTargetOrigin(),
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
            (key) => !keysToRemove.includes(String(key)),
          );

          const updatedProps = {
            ...element.props,
            removedItemIds: updatedRemovedIds,
            selectedKeys: updatedSelectedKeys,
          };

          updateElementProps(element.id, updatedProps);

          try {
            const db = (await context.services?.getDB?.()) as
              | {
                  elements: {
                    update: (
                      id: string,
                      data: Record<string, unknown>,
                    ) => Promise<void>;
                  };
                }
              | undefined;
            if (db) {
              await db.elements.update(element.id, { props: updatedProps });
              console.log(
                "✅ [IndexedDB] TagGroup removedItemIds updated:",
                updatedRemovedIds,
              );
            }
          } catch (err) {
            console.error(
              "❌ [IndexedDB] Error updating TagGroup removedItemIds:",
              err,
            );
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
            getTargetOrigin(),
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
            const db = (await context.services?.getDB?.()) as
              | { elements: { delete: (id: string) => Promise<void> } }
              | undefined;
            if (db) {
              await db.elements.delete(String(tagId));
              deletedTagIds.push(String(tagId));
              console.log(`✅ [IndexedDB] Tag ${tagId} deleted successfully`);
            }
          } catch (err) {
            console.error(`Error deleting tag ${tagId}:`, err);
          }
        }

        const currentElements = elements;
        const updatedElements = currentElements.filter(
          (el) => !deletedTagIds.includes(el.id),
        );

        const currentSelectedKeys = Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : [];
        const updatedSelectedKeys = currentSelectedKeys.filter(
          (key) => !keysToRemove.includes(String(key)),
        );

        const updatedProps = {
          ...element.props,
          selectedKeys: updatedSelectedKeys,
        };

        setElements(updatedElements);
        updateElementProps(element.id, updatedProps);

        try {
          const db = (await context.services?.getDB?.()) as
            | {
                elements: {
                  update: (
                    id: string,
                    data: Record<string, unknown>,
                  ) => Promise<void>;
                };
              }
            | undefined;
          if (db) {
            await db.elements.update(element.id, { props: updatedProps });
            console.log(
              "✅ [IndexedDB] TagGroup selectedKeys updated after removal",
            );
          }
        } catch (err) {
          console.error(
            "Error updating TagGroup selectedKeys after removal:",
            err,
          );
        }

        setTimeout(() => {
          window.parent.postMessage(
            {
              type: "UPDATE_ELEMENTS",
              elements: updatedElements,
            },
            getTargetOrigin(),
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
  context: RenderContext,
): React.ReactNode => {
  // Field 자식 요소 찾기
  const fieldChildren = (context.childrenMap.get(element.id) ?? []).filter(
    (child) => child.tag === "Field",
  );

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
        textValue={String(
          element.props.textValue || element.props.children || "",
        )}
      >
        {fieldChildren.map((field) => {
          const fieldKey =
            (field.props as { fieldKey?: string; key?: string }).fieldKey ||
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
              showLabel={
                (field.props as { showLabel?: boolean }).showLabel !== false
              }
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
  context: RenderContext,
): React.ReactNode => {
  const { elements, batchUpdateElementProps } = context;

  const orientation = element.props.orientation as "horizontal" | "vertical";
  const indicator = Boolean(element.props.indicator);

  const toggleButtonChildren = (
    context.childrenMap.get(element.id) ?? []
  ).filter((child) => child.tag === "ToggleButton");

  const selectedKeys = new Set<string>(
    getSelectedChildIds(toggleButtonChildren),
  );

  return (
    <ToggleButtonGroup
      key={element.id}
      data-custom-id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      orientation={orientation}
      selectionMode={element.props.selectionMode as "single" | "multiple"}
      indicator={indicator}
      isEmphasized={Boolean(element.props.isEmphasized)}
      isQuiet={Boolean(element.props.isQuiet)}
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        const nextKeys = new Set(Array.from(keys).map((k) => String(k)));
        const batch: Array<{ id: string; props: Record<string, unknown> }> = [];
        toggleButtonChildren.forEach((child) => {
          const shouldBeSelected = nextKeys.has(child.id);
          if (Boolean(child.props.isSelected) !== shouldBeSelected) {
            batch.push({
              id: child.id,
              props: { ...child.props, isSelected: shouldBeSelected },
            });
          }
        });
        if (batch.length > 0) batchUpdateElementProps(batch);
      }}
    >
      {toggleButtonChildren.map((toggleButton) =>
        context.renderElement(toggleButton),
      )}
    </ToggleButtonGroup>
  );
};

/**
 * ToggleButton 렌더링
 */
export const renderToggleButton = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elementsMap, updateElementProps } = context;

  const children = context.childrenMap.get(element.id) ?? [];

  const isInGroup = element.parent_id
    ? elementsMap.get(element.parent_id)?.tag === "ToggleButtonGroup"
    : false;

  // id는 element.id — group의 selectedKeys Set과 키 일치 필수.
  return (
    <ToggleButton
      key={element.id}
      id={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      isSelected={Boolean(element.props.isSelected)}
      defaultSelected={
        typeof element.props.defaultSelected === "boolean"
          ? element.props.defaultSelected
          : undefined
      }
      isDisabled={Boolean(element.props.isDisabled)}
      isEmphasized={Boolean(element.props.isEmphasized)}
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      style={element.props.style}
      className={element.props.className}
      onPress={
        isInGroup
          ? undefined
          : () => {
              updateElementProps(element.id, {
                ...element.props,
                isSelected: !element.props.isSelected,
              });
            }
      }
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => context.renderElement(child, child.id))}
    </ToggleButton>
  );
};

/**
 * Menu 렌더링
 * items SSOT 경로: element.props.items (StoredMenuItem[]) → RuntimeMenuItem[] 변환 후 MenuButton에 전달
 * dataBinding 경로: useCollectionData 결과 사용 (기존 유지)
 */
export const renderMenu = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const stored = (element.props.items ?? []) as StoredMenuItem[];
  const runtime = stored.map((it) =>
    toRuntimeMenuItem(it, context.resolveActionId),
  );

  return (
    <MenuButton
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      label={String(element.props.label || element.props.children || "Menu")}
      size={(element.props.size as "xs" | "sm" | "md" | "lg" | "xl") || "md"}
      items={runtime}
      style={element.props.style}
      className={element.props.className}
      dataBinding={
        (element.dataBinding || element.props.dataBinding) as
          | DataBinding
          | undefined
      }
    />
  );
};

/**
 * MenuItem 렌더링
 */
export const renderMenuItem = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { renderElement } = context;

  const children = context.childrenMap.get(element.id) ?? [];

  return (
    <MenuItem
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      textValue={String(
        element.props.textValue || element.props.children || "",
      )}
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
  context: RenderContext,
): React.ReactNode => {
  const { renderElement } = context;

  const children = context.childrenMap.get(element.id) ?? [];

  return (
    <Toolbar
      key={element.id}
      data-custom-id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      aria-label={String(element.props["aria-label"] || "Toolbar")}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Toolbar>
  );
};
