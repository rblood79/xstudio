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
} from "../../components/list";
import { PreviewElement, RenderContext } from "../types";
import { ElementUtils } from "../../../utils/elementUtils";

/**
 * Selection 관련 컴포넌트 렌더러
 * - ListBox, ListBoxItem
 * - GridList, GridListItem
 * - Select, SelectItem
 * - ComboBox, ComboBoxItem
 * - Slider
 */

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

  return (
    <ListBox
      key={element.id}
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
      dataBinding={element.dataBinding}
      onSelectionChange={(selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {listBoxChildren.map((item) => (
        <ListBoxItem
          key={item.id}
          data-element-id={item.id}
          value={item.props.value as object}
          isDisabled={Boolean(item.props.isDisabled)}
          style={item.props.style}
          className={item.props.className}
        >
          {String(item.props.label || "")}
        </ListBoxItem>
      ))}
    </ListBox>
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

  return (
    <GridList
      key={element.id}
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
      onSelectionChange={(selectedKeys) => {
        const updatedProps = {
          ...element.props,
          selectedKeys: Array.from(selectedKeys),
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {gridListChildren.map((item) => (
        <GridListItem
          key={item.id}
          data-element-id={item.id}
          value={item.props.value as object}
          isDisabled={Boolean(item.props.isDisabled)}
          style={item.props.style}
          className={item.props.className}
        >
          {String(item.props.label || "")}
        </GridListItem>
      ))}
    </GridList>
  );
};

/**
 * GridListItem 렌더링 (독립적으로 렌더링될 때)
 */
export const renderGridListItem = (
  element: PreviewElement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  , _context: RenderContext
): React.ReactNode => {
  return (
    <GridListItem
      key={element.id}
      data-element-id={element.id}
      value={element.props.value as object}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
    >
      {String(element.props.label || "")}
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

  return (
    <Select
      key={element.id}
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
      dataBinding={element.dataBinding}
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
          await ElementUtils.updateElementProps(element.id, updatedProps);
          console.log(
            "Element props updated successfully (placeholder preserved)"
          );
        } catch (err) {
          console.error("Error updating element props:", err);
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
      {selectItemChildren.map((item, index) => {
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
      })}
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

  return (
    <ComboBox
      key={element.id}
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
          await ElementUtils.updateElementProps(element.id, updatedProps);
          console.log("ComboBox element props updated successfully");
        } catch (err) {
          console.error("Error updating ComboBox element props:", err);
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
      {comboBoxItemChildren.map((item, index) => {
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
      })}
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
