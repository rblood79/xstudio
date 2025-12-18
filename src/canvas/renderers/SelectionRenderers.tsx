import React from "react";
import {
  ListBox,
  ListBoxItem,
  GridList,
  GridListItem,
  Select,
  SelectItem,
  ComboBox,
  ComboBoxItem,
  Slider,
} from "../../shared/components/list";
import { DataField } from "../../shared/components/Field";
import { PreviewElement, RenderContext } from "../types";
import { getDB } from "../../lib/db";
import type { ColumnMapping } from "../../types/builder/unified.types";

/**
 * Selection 관련 컴포넌트 렌더러
 * - ListBox, ListBoxItem
 * - GridList, GridListItem
 * - Select, SelectItem
 * - ComboBox, ComboBoxItem
 * - Slider
 */

// Field Elements 생성 요청 추적 (중복 방지)
const fieldCreationRequestedRef = React.createRef<Set<string>>();
if (!fieldCreationRequestedRef.current) {
  (fieldCreationRequestedRef as React.MutableRefObject<Set<string>>).current =
    new Set();
}

/**
 * ListBox 렌더링
 */
export const renderListBox = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  // 실제 ListBoxItem 자식 요소들을 찾기
  const listBoxChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "ListBoxItem")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // ColumnMapping이 있고 visible columns가 있으면 Field Elements 자동 생성
  const columnMapping = (element.props as { columnMapping?: ColumnMapping })
    .columnMapping;

  // PropertyDataBinding 형식 감지 (source: 'dataTable', name: 'xxx')
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding = dataBinding &&
    'source' in dataBinding &&
    'name' in dataBinding &&
    !('type' in dataBinding);

  if (columnMapping) {
    // ⚠️ Preview에서 자동으로 Field Elements를 생성하지 않음
    // 이유: APICollectionEditor에서 사용자가 명시적으로 컬럼을 선택할 때 Field Elements를 생성하므로
    // Preview에서 자동 생성하면 충돌이 발생할 수 있음
  }

  // columnMapping이 있거나 PropertyDataBinding이 있고 ListBoxItem 템플릿이 있으면 render function 사용
  const hasValidTemplate = (columnMapping || isPropertyBinding) && listBoxChildren.length > 0;


  // hasValidTemplate일 때는 render function을 사용
  if (hasValidTemplate) {
    const listBoxItemTemplate = listBoxChildren[0];

    // Field 자식들 찾기 - context.elements를 사용하여 최신 요소 접근
    const fieldChildren = context.elements
      .filter(
        (child) =>
          child.parent_id === listBoxItemTemplate.id && child.tag === "Field"
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    const renderItemFunction = (item: Record<string, unknown>) => {
      return (
        <ListBoxItem
          key={String(item.id)}
          data-element-id={listBoxItemTemplate.id}
          value={item}
          isDisabled={Boolean(listBoxItemTemplate.props.isDisabled)}
          style={listBoxItemTemplate.props.style}
          className={listBoxItemTemplate.props.className}
        >
          {fieldChildren.length > 0
            ? fieldChildren.map((field) => {
                const fieldKey = (field.props as { key?: string }).key;
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
            : String(listBoxItemTemplate.props.label || "")}
        </ListBoxItem>
      );
    };

    return (
      <ListBox
        key={element.id}
        id={element.customId}
        data-element-id={element.id}
        style={element.props.style}
        className={element.props.className}
        orientation={
          (element.props.orientation as "horizontal" | "vertical") || "vertical"
        }
        selectionMode={
          (element.props.selectionMode as "none" | "single" | "multiple") || "none"
        }
        defaultSelectedKeys={
          Array.isArray(element.props.selectedKeys)
            ? (element.props.selectedKeys as unknown as string[])
            : []
        }
        dataBinding={element.dataBinding || element.props.dataBinding}
        columnMapping={columnMapping}
        onSelectionChange={(selectedKeys) => {
          const updatedProps = {
            ...element.props,
            selectedKeys: Array.from(selectedKeys),
          };
          updateElementProps(element.id, updatedProps);
        }}
      >
        {renderItemFunction}
      </ListBox>
    );
  }

  // Static children (no data binding)
  const staticChildren = listBoxChildren.map((item) => context.renderElement(item));

  return (
    <ListBox
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "vertical"
      }
      selectionMode={
        (element.props.selectionMode as "none" | "single" | "multiple") || "none"
      }
      defaultSelectedKeys={
        Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : []
      }
      dataBinding={element.dataBinding || element.props.dataBinding}
      columnMapping={columnMapping}
      onSelectionChange={(selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {staticChildren}
    </ListBox>
  );
};

/**
 * ListBoxItem 렌더링 (독립적으로 렌더링될 때)
 */
export const renderListBoxItem = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements } = context;

  // DataField 자식 요소들을 찾기
  const fieldChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Field")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 스켈레톤 플레이스홀더 체크
  const isSkeleton = Boolean(element.props.isSkeleton);
  const className = isSkeleton
    ? `skeleton ${element.props.className || ""}`.trim()
    : element.props.className;

  // 스켈레톤 콘텐츠 렌더링
  const renderContent = () => {
    if (isSkeleton) {
      return (
        <>
          <div className="skeleton-line title" />
          <div className="skeleton-line desc" />
        </>
      );
    }
    if (fieldChildren.length > 0) {
      return fieldChildren.map((child) => context.renderElement(child));
    }
    return String(element.props.label || "");
  };

  return (
    <ListBoxItem
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      value={element.props.value as object}
      isDisabled={Boolean(element.props.isDisabled) || isSkeleton}
      style={element.props.style}
      className={className}
    >
      {renderContent()}
    </ListBoxItem>
  );
};

/**
 * DataField 렌더링
 *
 * Collection 컴포넌트 내에서 데이터를 표시하는 Field Element를 렌더링합니다.
 * dataBinding.source="parent"인 경우 부모의 데이터 context에서 값을 추출합니다.
 */
export const renderDataField = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements } = context;

  // dataBinding이 있고 source가 "parent"인 경우 부모 데이터에서 값 추출
  let value = element.props.value;

  if (
    element.dataBinding?.type === "field" &&
    element.dataBinding?.source === "parent"
  ) {
    const path = element.dataBinding.config?.path as string | undefined;

    // 부모 element 찾기 (ListBoxItem, GridListItem 등)
    const parent = elements.find((el) => el.id === element.parent_id);

    if (parent && path) {
      // 부모의 value에서 데이터 추출
      const parentValue = parent.props.value as Record<string, unknown> | undefined;

      if (parentValue && typeof parentValue === "object") {
        value = parentValue[path] as string | number | boolean | null | undefined;
      }
    }
  }

  // 자식 요소가 있으면 렌더링
  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <DataField
      key={element.id}
      data-element-id={element.id}
      fieldKey={element.props.key as string | undefined}
      label={element.props.label as string | undefined}
      type={element.props.type as "string" | "number" | "boolean" | "date" | "image" | "url" | "email" | undefined}
      value={value}
      showLabel={element.props.showLabel !== false}
      visible={element.props.visible !== false}
      className={element.props.className as string | undefined}
      style={element.props.style}
    >
      {children.length > 0
        ? children.map((child) => context.renderElement(child))
        : null}
    </DataField>
  );
};

/**
 * GridList 렌더링
 */
export const renderGridList = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  // 실제 GridListItem 자식 요소들을 찾기
  const gridListChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "GridListItem")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // ColumnMapping이 있고 visible columns가 있으면 Field Elements 자동 생성
  const columnMapping = (element.props as { columnMapping?: ColumnMapping })
    .columnMapping;

  // PropertyDataBinding 형식 감지 (source: 'dataTable' 또는 'apiEndpoint', name: 'xxx')
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding = dataBinding &&
    'source' in dataBinding &&
    'name' in dataBinding &&
    !('type' in dataBinding);

  // columnMapping이 있거나 PropertyDataBinding이 있고 GridListItem 템플릿이 있으면 render function 사용
  const hasValidTemplate = (columnMapping || isPropertyBinding) && gridListChildren.length > 0;

  const renderChildren = hasValidTemplate
    ? (item: Record<string, unknown>) => {
        // GridListItem 템플릿을 각 데이터 항목에 대해 렌더링
        const gridListItemTemplate = gridListChildren[0];

        // Field 자식들 찾기 - context.elements를 사용하여 최신 요소 접근
        const fieldChildren = context.elements
          .filter(
            (child) =>
              child.parent_id === gridListItemTemplate.id && child.tag === "Field"
          )
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <GridListItem
            key={String(item.id)}
            data-element-id={gridListItemTemplate.id}
            value={item}
            isDisabled={Boolean(gridListItemTemplate.props.isDisabled)}
            style={gridListItemTemplate.props.style}
            className={gridListItemTemplate.props.className}
          >
            {fieldChildren.length > 0
              ? fieldChildren.map((field) => {
                  const fieldKey = (field.props as { key?: string }).key;
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
              : String(gridListItemTemplate.props.label || "")}
          </GridListItem>
        );
      }
    : gridListChildren.map((item) => context.renderElement(item));

  return (
    <GridList
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      selectionMode={
        (element.props.selectionMode as "none" | "single" | "multiple") || "none"
      }
      defaultSelectedKeys={
        Array.isArray(element.props.selectedKeys)
          ? (element.props.selectedKeys as unknown as string[])
          : []
      }
      dataBinding={element.dataBinding || element.props.dataBinding}
      columnMapping={columnMapping}
      onSelectionChange={(selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {renderChildren}
    </GridList>
  );
};

/**
 * GridListItem 렌더링 (독립적으로 렌더링될 때)
 */
export const renderGridListItem = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements } = context;

  // DataField 자식 요소들을 찾기
  const fieldChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Field")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 스켈레톤 플레이스홀더 체크
  const isSkeleton = Boolean(element.props.isSkeleton);
  const className = isSkeleton
    ? `skeleton ${element.props.className || ""}`.trim()
    : element.props.className;

  // 스켈레톤 콘텐츠 렌더링
  const renderContent = () => {
    if (isSkeleton) {
      return (
        <>
          <div className="skeleton-line title" />
          <div className="skeleton-line desc" />
        </>
      );
    }
    if (fieldChildren.length > 0) {
      return fieldChildren.map((child) => context.renderElement(child));
    }
    return String(element.props.label || "");
  };

  return (
    <GridListItem
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      value={element.props.value as object}
      isDisabled={Boolean(element.props.isDisabled) || isSkeleton}
      style={element.props.style}
      className={className}
    >
      {renderContent()}
    </GridListItem>
  );
};

/**
 * Select 렌더링
 */
export const renderSelect = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  const selectItemChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "SelectItem")
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

  // columnMapping이 있거나 PropertyDataBinding이 있고 SelectItem 템플릿이 있으면 render function 사용
  const hasValidTemplate = (columnMapping || isPropertyBinding) && selectItemChildren.length > 0;

  // props를 안전하게 보존
  const elementProps = { ...element.props };
  const labelValue = elementProps.label;
  const processedLabel = labelValue ? String(labelValue).trim() : undefined;
  const placeholderValue = elementProps.placeholder;
  const processedPlaceholder = placeholderValue
    ? String(placeholderValue).trim()
    : undefined;

  // selectedKey 상태 확인
  const currentSelectedKey = elementProps.selectedKey;

  // 접근성을 위한 aria-label 설정
  const ariaLabel = processedLabel
    ? undefined
    : elementProps["aria-label"] ||
      processedPlaceholder ||
      `Select ${element.id}`;

  const renderChildren = hasValidTemplate
    ? (item: Record<string, unknown>) => {
        // SelectItem 템플릿을 각 데이터 항목에 대해 렌더링
        const selectItemTemplate = selectItemChildren[0];

        // Field 자식들 찾기
        const fieldChildren = context.elements
          .filter(
            (child) =>
              child.parent_id === selectItemTemplate.id && child.tag === "Field"
          )
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <SelectItem
            key={String(item.id)}
            data-element-id={selectItemTemplate.id}
            value={item as object}
            isDisabled={Boolean(selectItemTemplate.props.isDisabled)}
            style={selectItemTemplate.props.style}
            className={selectItemTemplate.props.className}
          >
            {fieldChildren.length > 0
              ? fieldChildren.map((field) => {
                  const fieldKey = (field.props as { key?: string }).key;
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
              : String(selectItemTemplate.props.label || "")}
          </SelectItem>
        );
      }
    : selectItemChildren.map((item, index) => {
        const actualValue =
          item.props.value || item.props.label || `option-${index + 1}`;

        return (
          <SelectItem
            key={item.id}
            data-element-id={item.id}
            value={String(actualValue) as unknown as object}
            isDisabled={Boolean(item.props.isDisabled)}
            style={item.props.style}
            className={item.props.className}
          >
            {String(item.props.label || item.id)}
          </SelectItem>
        );
      });

  return (
    <Select
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={elementProps.style}
      className={element.props.className}
      label={processedLabel}
      description={
        elementProps.description
          ? String(elementProps.description).trim()
          : undefined
      }
      errorMessage={
        elementProps.errorMessage
          ? String(elementProps.errorMessage).trim()
          : undefined
      }
      placeholder={processedPlaceholder}
      aria-label={ariaLabel}
      defaultSelectedKey={
        currentSelectedKey ? String(currentSelectedKey) : undefined
      }
      isDisabled={Boolean(elementProps.isDisabled)}
      isRequired={Boolean(elementProps.isRequired)}
      autoFocus={Boolean(elementProps.autoFocus)}
      dataBinding={element.dataBinding || element.props.dataBinding}
      columnMapping={columnMapping}
      onSelectionChange={async (selectedKey) => {
        // React Aria의 내부 ID를 실제 값으로 변환
        let actualValue = selectedKey;
        if (
          selectedKey &&
          typeof selectedKey === "string" &&
          selectedKey.startsWith("react-aria-")
        ) {
          const index = parseInt(selectedKey.replace("react-aria-", "")) - 1;
          const selectedItem = selectItemChildren[index];
          if (selectedItem) {
            actualValue = String(
              selectedItem.props.value ||
                selectedItem.props.label ||
                `option-${index + 1}`
            );
          }
        }

        // placeholder를 포함한 모든 props 보존
        const updatedProps = {
          ...elementProps,
          selectedKey,
          selectedValue: actualValue,
        };

        updateElementProps(element.id, updatedProps);

        try {
          const db = await getDB();
          await db.elements.update(element.id, { props: updatedProps });
        } catch {
          // IndexedDB update failed silently
        }

        // 전체 props 전송으로 placeholder 보존
        window.parent.postMessage(
          {
            type: "UPDATE_ELEMENT_PROPS",
            elementId: element.id,
            props: updatedProps,
            merge: false,
          },
          window.location.origin
        );
      }}
    >
      {renderChildren}
    </Select>
  );
};

/**
 * ComboBox 렌더링
 */
export const renderComboBox = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  // 실제 ComboBoxItem 자식 요소들을 찾기
  const comboBoxItemChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "ComboBoxItem")
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

  // columnMapping이 있거나 PropertyDataBinding이 있고 ComboBoxItem 템플릿이 있으면 render function 사용
  const hasValidTemplate = (columnMapping || isPropertyBinding) && comboBoxItemChildren.length > 0;

  const renderChildren = hasValidTemplate
    ? (item: Record<string, unknown>) => {
        // ComboBoxItem 템플릿을 각 데이터 항목에 대해 렌더링
        const comboBoxItemTemplate = comboBoxItemChildren[0];

        // Field 자식들 찾기
        const fieldChildren = context.elements
          .filter(
            (child) =>
              child.parent_id === comboBoxItemTemplate.id && child.tag === "Field"
          )
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        // textValue 계산 - 보이는 Field 값들을 연결하여 검색 가능한 텍스트 생성
        const textValue = fieldChildren
          .filter((field) => (field.props as { visible?: boolean }).visible !== false)
          .map((field) => {
            const fieldKey = (field.props as { key?: string }).key;
            const fieldValue = fieldKey ? item[fieldKey] : undefined;
            return fieldValue != null ? String(fieldValue) : '';
          })
          .filter(Boolean)
          .join(' ');

        return (
          <ComboBoxItem
            key={String(item.id)}
            data-element-id={comboBoxItemTemplate.id}
            value={item as object}
            textValue={textValue}
            isDisabled={Boolean(comboBoxItemTemplate.props.isDisabled)}
            style={comboBoxItemTemplate.props.style}
            className={comboBoxItemTemplate.props.className}
          >
            {fieldChildren.length > 0
              ? fieldChildren.map((field) => {
                  const fieldKey = (field.props as { key?: string }).key;
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
              : String(comboBoxItemTemplate.props.label || "")}
          </ComboBoxItem>
        );
      }
    : comboBoxItemChildren.map((item, index) => {
        const reactAriaId = `react-aria-${index + 1}`;

        return (
          <ComboBoxItem
            key={item.id}
            data-element-id={item.id}
            value={reactAriaId as unknown as object}
            isDisabled={Boolean(item.props.isDisabled)}
            style={item.props.style}
            className={item.props.className}
          >
            {String(item.props.label || item.id)}
          </ComboBoxItem>
        );
      });

  return (
    <ComboBox
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={String(element.props.placeholder || "")}
      {...(element.props.selectedKey || element.props.selectedValue
        ? {
            defaultSelectedKey: String(
              element.props.selectedKey || element.props.selectedValue
            ),
          }
        : {})}
      defaultInputValue={String(element.props.inputValue || "")}
      allowsCustomValue={Boolean(element.props.allowsCustomValue)}
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      dataBinding={element.dataBinding || element.props.dataBinding}
      columnMapping={columnMapping}
      onSelectionChange={async (selectedKey) => {
        // selectedKey가 undefined이면 선택 해제로 처리
        if (selectedKey === undefined || selectedKey === null) {
          const updatedProps = {
            ...element.props,
            selectedKey: undefined,
            selectedValue: undefined,
            inputValue: "",
          };
          updateElementProps(element.id, updatedProps);
          return;
        }

        // React Aria의 내부 ID를 실제 값으로 변환
        let actualValue = selectedKey;
        let displayValue = String(selectedKey);

        if (
          selectedKey &&
          typeof selectedKey === "string" &&
          selectedKey.startsWith("react-aria-")
        ) {
          const index = parseInt(selectedKey.replace("react-aria-", "")) - 1;
          const selectedItem = comboBoxItemChildren[index];
          if (selectedItem) {
            actualValue = String(
              selectedItem.props.value ||
                selectedItem.props.label ||
                `option-${index + 1}`
            );
            displayValue = String(
              selectedItem.props.label ||
                selectedItem.props.value ||
                `option-${index + 1}`
            );
          }
        } else {
          const selectedItem = comboBoxItemChildren.find(
            (item) =>
              String(item.props.value) === String(selectedKey) ||
              String(item.props.label) === String(selectedKey)
          );

          if (selectedItem) {
            actualValue = String(
              selectedItem.props.value ||
                selectedItem.props.label ||
                selectedKey
            );
            displayValue = String(
              selectedItem.props.label ||
                selectedItem.props.value ||
                selectedKey
            );
          }
        }

        const updatedProps = {
          ...element.props,
          selectedKey,
          selectedValue: actualValue,
          inputValue: displayValue,
        };

        updateElementProps(element.id, updatedProps);

        try {
          const db = await getDB();
          await db.elements.update(element.id, { props: updatedProps });
        } catch {
          // IndexedDB update failed silently
        }

        window.parent.postMessage(
          {
            type: "UPDATE_ELEMENT_PROPS",
            elementId: element.id,
            props: {
              selectedKey,
              selectedValue: actualValue,
              inputValue: displayValue,
            },
            merge: true,
          },
          window.location.origin
        );
      }}
      onInputChange={(inputValue) => {
        const updatedProps = {
          ...element.props,
          inputValue,
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {renderChildren}
    </ComboBox>
  );
};

/**
 * Slider 렌더링
 */
export const renderSlider = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { updateElementProps } = context;

  return (
    <Slider
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      defaultValue={Array.isArray(element.props.value) ? element.props.value : [50]}
      minValue={Number(element.props.minValue) || 0}
      maxValue={Number(element.props.maxValue) || 100}
      step={Number(element.props.step) || 1}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "horizontal"
      }
      size={
        (element.props.size as "sm" | "md" | "lg") || "md"
      }
      variant={
        (element.props.variant as "default" | "primary" | "secondary" | "surface") || "default"
      }
      onChange={(value) => {
        const updatedProps = {
          ...element.props,
          value,
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};
