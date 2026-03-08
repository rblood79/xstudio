import React from "react";
import {
  TextField,
  NumberField,
  SearchField,
  Input,
  Label,
  Description,
  FieldError,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Switch,
} from "../components/list";
import { MyColorSwatches } from "../components/TailSwatch";
import { parseColor, type Color } from "react-aria-components";
import type { PreviewElement, RenderContext } from "../types";

/**
 * Form 관련 컴포넌트 렌더러
 * - TextField, Input, Label, Description, FieldError
 * - Checkbox, CheckboxGroup
 * - Radio, RadioGroup
 * - Switch
 */

/**
 * TextField 렌더링
 */
export const renderTextField = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  return (
    <TextField
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      size={element.props.size as "sm" | "md" | "lg"}
      label={String(element.props.label || "")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={String(element.props.placeholder || "")}
      type={
        (element.props.type as
          | "text"
          | "email"
          | "password"
          | "search"
          | "tel"
          | "url"
          | "number") || "text"
      }
      defaultValue={String(element.props.value || "")}
      isDisabled={Boolean(element.props.isDisabled || false)}
      isRequired={Boolean(element.props.isRequired || false)}
      isReadOnly={Boolean(element.props.isReadOnly || false)}
      isInvalid={Boolean(element.props.isInvalid || false)}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={(value) => {
        const updatedProps = {
          ...element.props,
          value: String(value),
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};

/**
 * NumberField 렌더링
 */
export const renderNumberField = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  return (
    <NumberField
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      defaultValue={Number(element.props.value || 0)}
      minValue={
        element.props.minValue !== undefined
          ? Number(element.props.minValue)
          : undefined
      }
      maxValue={
        element.props.maxValue !== undefined
          ? Number(element.props.maxValue)
          : undefined
      }
      step={
        element.props.step !== undefined
          ? Number(element.props.step)
          : undefined
      }
      isDisabled={Boolean(element.props.isDisabled || false)}
      isRequired={Boolean(element.props.isRequired || false)}
      isReadOnly={Boolean(element.props.isReadOnly || false)}
      isInvalid={Boolean(element.props.isInvalid || false)}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={(value) => {
        const updatedProps = {
          ...element.props,
          value: Number(value),
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};

/**
 * SearchField 렌더링
 */
export const renderSearchField = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  return (
    <SearchField
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={String(element.props.placeholder || "")}
      defaultValue={String(element.props.value || "")}
      isDisabled={Boolean(element.props.isDisabled || false)}
      isRequired={Boolean(element.props.isRequired || false)}
      isReadOnly={Boolean(element.props.isReadOnly || false)}
      isInvalid={Boolean(element.props.isInvalid || false)}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={(value) => {
        const updatedProps = {
          ...element.props,
          value: String(value),
        };
        updateElementProps(element.id, updatedProps);
      }}
      onSubmit={(value) => {
        const updatedProps = {
          ...element.props,
          value: String(value),
        };
        updateElementProps(element.id, updatedProps);
      }}
      onClear={() => {
        const updatedProps = {
          ...element.props,
          value: "",
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};

/**
 * Input 렌더링
 */
export const renderInput = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  return (
    <Input
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      type={
        (element.props.type as
          | "text"
          | "email"
          | "password"
          | "search"
          | "tel"
          | "url"
          | "number") || "text"
      }
      placeholder={String(element.props.placeholder || "")}
      defaultValue={String(element.props.value || "")}
      disabled={Boolean(element.props.isDisabled || false)}
      readOnly={Boolean(element.props.isReadOnly || false)}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={(value) => {
        const updatedProps = {
          ...element.props,
          value: String(value),
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};

/**
 * Label 렌더링
 */
export const renderLabel = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Label
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Label>
  );
};

/**
 * Description 렌더링
 */
export const renderDescription = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Description
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.text === "string"
        ? element.props.text
        : typeof element.props.children === "string"
          ? element.props.children
          : null}
      {children.map((child) => renderElement(child, child.id))}
    </Description>
  );
};

/**
 * FieldError 렌더링
 */
export const renderFieldError = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <FieldError
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.text === "string" ? element.props.text : null}
      {children.map((child) => renderElement(child, child.id))}
    </FieldError>
  );
};

/**
 * Checkbox 렌더링
 */
export const renderCheckbox = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, updateElementProps, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Checkbox
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      defaultSelected={Boolean(element.props.isSelected)}
      isIndeterminate={Boolean(element.props.isIndeterminate)}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isRequired={Boolean(element.props.isRequired)}
      name={element.props.name ? String(element.props.name) : undefined}
      value={element.props.value ? String(element.props.value) : undefined}
      style={element.props.style}
      className={element.props.className}
      isEmphasized={Boolean(element.props.isEmphasized)}
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      onChange={async (isSelected) => {
        const updatedProps = {
          ...element.props,
          isSelected: Boolean(isSelected),
        };

        // 1. Store 업데이트
        updateElementProps(element.id, updatedProps);

        // 2. SaveService 호출 (DI를 통해 context에서 주입)
        try {
          await context.services?.saveService?.savePropertyChange?.({
            table: "elements",
            id: element.id,
            data: { props: updatedProps },
          });
        } catch (error) {
          console.warn("⚠️ Preview Checkbox 저장 실패:", error);
        }
      }}
    >
      {/* Label 자식이 있으면 props.children 텍스트 생략 (이중 렌더링 방지) */}
      {typeof element.props.children === "string" &&
      !children.some((c) => c.tag === "Label")
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Checkbox>
  );
};

/**
 * CheckboxGroup 렌더링
 */
export const renderCheckboxGroup = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, updateElementProps } = context;

  // 실제 Checkbox 자식 요소들을 찾기
  const checkboxChildren = elements
    .filter(
      (child) => child.parent_id === element.id && child.tag === "Checkbox",
    )
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // isSelected: true인 체크박스들의 ID를 value 배열로 생성
  const selectedValues = checkboxChildren
    .filter((checkbox) => checkbox.props.isSelected)
    .map((checkbox) => checkbox.id);

  return (
    <CheckboxGroup
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      value={selectedValues}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "vertical"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isRequired={Boolean(element.props.isRequired)}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={async (newSelectedValues) => {
        // CheckboxGroup의 onChange: 전체 value 배열 업데이트
        const updatedProps = {
          ...element.props,
          value: newSelectedValues,
        };
        updateElementProps(element.id, updatedProps);

        // 개별 체크박스의 isSelected도 동기화
        for (const checkbox of checkboxChildren) {
          const isSelected = newSelectedValues.includes(checkbox.id);
          if (checkbox.props.isSelected !== isSelected) {
            updateElementProps(checkbox.id, {
              ...checkbox.props,
              isSelected,
            } as Record<string, unknown>);
          }
        }
      }}
    >
      {checkboxChildren.map((checkbox) => (
        <Checkbox
          key={checkbox.id}
          data-element-id={checkbox.id}
          value={checkbox.id}
          isIndeterminate={Boolean(checkbox.props.isIndeterminate)}
          isDisabled={Boolean(checkbox.props.isDisabled)}
          style={checkbox.props.style}
          className={checkbox.props.className}
          onChange={(isSelected: boolean) => {
            const updatedProps = {
              ...checkbox.props,
              isSelected,
            };
            updateElementProps(checkbox.id, updatedProps);
          }}
        >
          {typeof checkbox.props.children === "string"
            ? checkbox.props.children
            : null}
        </Checkbox>
      ))}
    </CheckboxGroup>
  );
};

/**
 * Radio 렌더링
 */
export const renderRadio = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 부모가 RadioGroup인지 확인
  const parentElement = elements.find(
    (parent) => parent.id === element.parent_id,
  );

  if (parentElement && parentElement.tag === "RadioGroup") {
    return (
      <Radio
        key={element.id}
        id={element.customId}
        data-element-id={element.id}
        value={String(element.props.value || "")}
        isDisabled={Boolean(element.props.isDisabled || false)}
        style={element.props.style}
        className={element.props.className}
      >
        {/* Label 자식이 있으면 props.children 텍스트 생략 (이중 렌더링 방지) */}
        {typeof element.props.children === "string" &&
        !children.some((c) => c.tag === "Label")
          ? element.props.children
          : null}
        {children.map((child) => renderElement(child, child.id))}
      </Radio>
    );
  } else {
    // RadioGroup이 없으면 기본 RadioGroup으로 감싸기
    return (
      <RadioGroup
        key={`group-${element.id}`}
        id={`group-${element.customId}`}
        data-element-id={`group-${element.id}`}
      >
        <Radio
          key={element.id}
          id={element.customId}
          data-element-id={element.id}
          value={String(element.props.value || "")}
          isDisabled={Boolean(element.props.isDisabled || false)}
          style={element.props.style}
          className={element.props.className}
        >
          {/* Label 자식이 있으면 props.children 텍스트 생략 (이중 렌더링 방지) */}
          {typeof element.props.children === "string" &&
          !children.some((c) => c.tag === "Label")
            ? element.props.children
            : null}
          {children.map((child) => renderElement(child, child.id))}
        </Radio>
      </RadioGroup>
    );
  }
};

/**
 * RadioGroup 렌더링
 */
export const renderRadioGroup = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, updateElementProps, renderElement } = context;

  // 실제 Radio 자식 요소들을 찾기
  const radioChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Radio")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <RadioGroup
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      defaultValue={String(element.props.value || "")}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "vertical"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isRequired={Boolean(element.props.isRequired)}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={(selectedValue) => {
        const updatedProps = {
          ...element.props,
          value: selectedValue,
        };
        updateElementProps(element.id, updatedProps);

        // 개별 Radio의 isSelected도 동기화
        for (const radio of radioChildren) {
          const isSelected = radio.props.value === selectedValue;
          if (radio.props.isSelected !== isSelected) {
            updateElementProps(radio.id, {
              ...radio.props,
              isSelected,
            } as Record<string, unknown>);
          }
        }
      }}
    >
      {radioChildren.map((radio) => renderElement(radio))}
    </RadioGroup>
  );
};

/**
 * Switch 렌더링
 */
export const renderSwitch = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  return (
    <Switch
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      defaultSelected={Boolean(element.props.isSelected)}
      isDisabled={Boolean(element.props.isDisabled)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      name={element.props.name ? String(element.props.name) : undefined}
      style={element.props.style}
      className={element.props.className}
      isEmphasized={Boolean(element.props.isEmphasized)}
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      onChange={(isSelected) => {
        const updatedProps = {
          ...element.props,
          isSelected,
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
    </Switch>
  );
};

/**
 * TailSwatch (Color Picker) 렌더링
 */
export const renderTailSwatch = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  // Parse color value or use default
  const colorValue = element.props.value || "#3b82f6";
  let color;
  try {
    color = parseColor(colorValue as string);
  } catch {
    color = parseColor("#3b82f6");
  }

  const handleColorChange = (newColor: Color) => {
    const hexColor = newColor.toString("hex");
    const updatedProps = {
      ...element.props,
      value: hexColor,
    };
    updateElementProps(element.id, updatedProps);
    // Save will be handled by updateElementProps
  };

  return (
    <div
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
    >
      <MyColorSwatches
        areaProps={{
          value: color,
          onChange: handleColorChange,
          colorSpace:
            (element.props.colorSpace as "rgb" | "hsl" | "hsb") || "hsb",
          isDisabled: Boolean(element.props.isDisabled),
        }}
        sliderProps={{
          value: color,
          onChange: handleColorChange,
          channel: "hue" as const,
          isDisabled: Boolean(element.props.isDisabled),
        }}
        swatchPickerProps={{
          value: color,
          onChange: handleColorChange,
        }}
      />
    </div>
  );
};
