import React from "react";
import {
  Form,
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
  FileTrigger,
  DropZone,
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

type InheritedFormFieldProps = {
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "center" | "end";
  necessityIndicator?: "icon" | "label";
};

function findNearestAncestorForm(
  element: PreviewElement,
  elements: PreviewElement[],
): PreviewElement | null {
  let currentParentId = element.parent_id;

  while (currentParentId) {
    const parent = elements.find((candidate) => candidate.id === currentParentId);
    if (!parent) return null;
    if (parent.tag === "Form") return parent;
    currentParentId = parent.parent_id;
  }

  return null;
}

export function resolveInheritedFormFieldProps(
  element: PreviewElement,
  context: RenderContext,
): InheritedFormFieldProps {
  const formElement = findNearestAncestorForm(element, context.elements);
  if (!formElement) return {};

  return {
    labelPosition:
      formElement.props.labelPosition as "top" | "side" | undefined,
    labelAlign:
      formElement.props.labelAlign as "start" | "center" | "end" | undefined,
    necessityIndicator:
      formElement.props.necessityIndicator as "icon" | "label" | undefined,
  };
}

/**
 * Form 렌더링
 */
export const renderForm = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Form
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      action={element.props.action ? String(element.props.action) : undefined}
      method={
        (element.props.method as "get" | "post" | undefined) || undefined
      }
      encType={
        (element.props.encType as
          | "application/x-www-form-urlencoded"
          | "multipart/form-data"
          | "text/plain"
          | undefined) || undefined
      }
      target={
        (element.props.target as
          | "_self"
          | "_blank"
          | "_parent"
          | "_top"
          | undefined) || undefined
      }
      autoFocus={Boolean(element.props.autoFocus)}
      restoreFocus={Boolean(element.props.restoreFocus)}
      validationBehavior={
        (element.props.validationBehavior as "native" | "aria" | undefined) ||
        undefined
      }
      labelPosition={
        (element.props.labelPosition as "top" | "side" | undefined) ||
        undefined
      }
      labelAlign={
        (element.props.labelAlign as "start" | "center" | "end" | undefined) ||
        undefined
      }
      necessityIndicator={
        (element.props.necessityIndicator as "icon" | "label" | undefined) ||
        undefined
      }
    >
      {children.map((child) => renderElement(child, child.id))}
    </Form>
  );
};

/**
 * TextField 렌더링
 */
export const renderTextField = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;
  const inheritedProps = resolveInheritedFormFieldProps(element, context);

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
      necessityIndicator={
        (element.props.necessityIndicator as "icon" | "label" | undefined) ??
        inheritedProps.necessityIndicator
      }
      labelPosition={
        (element.props.labelPosition as "top" | "side" | undefined) ??
        inheritedProps.labelPosition ??
        "top"
      }
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
  const inheritedProps = resolveInheritedFormFieldProps(element, context);

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
      necessityIndicator={
        (element.props.necessityIndicator as "icon" | "label" | undefined) ??
        inheritedProps.necessityIndicator
      }
      labelPosition={
        (element.props.labelPosition as "top" | "side" | undefined) ??
        inheritedProps.labelPosition ??
        "top"
      }
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
  const { elements, updateElementProps } = context;
  const inheritedProps = resolveInheritedFormFieldProps(element, context);

  // Child element에서 props 읽기 (compositional 패턴)
  const childElements = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const labelEl = childElements.find((c) => c.tag === "Label");
  const wrapperEl = childElements.find((c) => c.tag === "SearchFieldWrapper");
  const wrapperChildren = wrapperEl
    ? elements
        .filter((c) => c.parent_id === wrapperEl.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    : [];
  const inputEl = wrapperChildren.find((c) => c.tag === "SearchInput");

  // child element props 우선 → parent props fallback
  const label = labelEl
    ? String(labelEl.props?.children || "")
    : String(element.props.label || "");
  const placeholder = inputEl
    ? String(inputEl.props?.placeholder || "")
    : String(element.props.placeholder || "");

  return (
    <SearchField
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={label}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={placeholder}
      defaultValue={String(element.props.value || "")}
      isDisabled={Boolean(element.props.isDisabled || false)}
      isRequired={Boolean(element.props.isRequired || false)}
      isReadOnly={Boolean(element.props.isReadOnly || false)}
      isInvalid={Boolean(element.props.isInvalid || false)}
      necessityIndicator={
        (element.props.necessityIndicator as "icon" | "label" | undefined) ??
        inheritedProps.necessityIndicator
      }
      labelPosition={
        (element.props.labelPosition as "top" | "side" | undefined) ??
        inheritedProps.labelPosition ??
        "top"
      }
      name={element.props.name ? String(element.props.name) : undefined}
      size={(element.props.size as "xs" | "sm" | "md" | "lg" | "xl") || "md"}
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
 *
 * 부모가 <label> 요소(Checkbox, Radio, Switch)면 <span>으로 렌더
 * HTML 규격상 <label> 중첩 금지
 */
const LABEL_AS_SPAN_PARENTS = new Set(["Checkbox", "Radio", "Switch"]);

export const renderLabel = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const content = (
    <>
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </>
  );

  // 부모가 <label> 요소면 <span>으로 렌더 (label 중첩 방지)
  const parentTag = element.parent_id
    ? elements.find((e) => e.id === element.parent_id)?.tag
    : null;

  if (parentTag && LABEL_AS_SPAN_PARENTS.has(parentTag)) {
    return (
      <span
        key={element.id}
        data-element-id={element.id}
        data-variant={(element.props.variant as string) || "default"}
        className="react-aria-Label"
      >
        {content}
      </span>
    );
  }

  return (
    <Label
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      data-variant={(element.props.variant as string) || "default"}
    >
      {content}
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
  const { elements, updateElementProps, renderElement } = context;

  // Compositional: Label + CheckboxItems(중간 컨테이너) + Checkbox(레거시) 자식 분리
  const allChildren = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const labelChild = allChildren.find((child) => child.tag === "Label");
  const checkboxItemsChild = allChildren.find(
    (child) => child.tag === "CheckboxItems",
  );

  // CheckboxItems가 있으면 그 하위에서 Checkbox 검색, 없으면(레거시) 직접 자식에서 검색
  const checkboxParentId = checkboxItemsChild
    ? checkboxItemsChild.id
    : element.id;
  const checkboxChildren = elements
    .filter(
      (child) =>
        child.parent_id === checkboxParentId && child.tag === "Checkbox",
    )
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // isSelected: true인 체크박스들의 ID를 value 배열로 생성
  const selectedValues = checkboxChildren
    .filter((checkbox) => checkbox.props.isSelected)
    .map((checkbox) => checkbox.id);

  // 그룹 라벨: Label 자식 Element의 텍스트 사용 (renderElement 호출 제거 — 이중 렌더링 방지)
  const groupLabel =
    (labelChild?.props?.children as string) ||
    (element.props.label as string) ||
    undefined;

  return (
    <CheckboxGroup
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={groupLabel}
      value={selectedValues}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "vertical"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isRequired={Boolean(element.props.isRequired)}
      necessityIndicator={
        element.props.necessityIndicator as "icon" | "label" | undefined
      }
      labelPosition={(element.props.labelPosition as "top" | "side") || "top"}
      name={element.props.name ? String(element.props.name) : undefined}
      onChange={async (newSelectedValues) => {
        const updatedProps = {
          ...element.props,
          value: newSelectedValues,
        };
        updateElementProps(element.id, updatedProps);

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
      <div className="checkbox-items">
        {checkboxChildren.map((checkbox) => {
          // Checkbox의 자식 Label 요소 검색
          const checkboxLabelChildren = elements
            .filter(
              (child) =>
                child.parent_id === checkbox.id && child.tag === "Label",
            )
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

          return (
            <Checkbox
              key={checkbox.id}
              data-element-id={checkbox.id}
              value={checkbox.id}
              isIndeterminate={Boolean(checkbox.props.isIndeterminate)}
              isDisabled={Boolean(checkbox.props.isDisabled)}
              onChange={(isSelected: boolean) => {
                const updatedProps = {
                  ...checkbox.props,
                  isSelected,
                };
                updateElementProps(checkbox.id, updatedProps);
              }}
            >
              {/* Label 자식이 있으면 렌더, 없으면 props.children 텍스트 */}
              {checkboxLabelChildren.length > 0
                ? checkboxLabelChildren.map((child) =>
                    renderElement(child, child.id),
                  )
                : typeof checkbox.props.children === "string"
                  ? checkbox.props.children
                  : null}
            </Checkbox>
          );
        })}
      </div>
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

  // 부모 또는 조부모가 RadioGroup인지 확인
  // Factory 구조: RadioGroup > RadioItems > Radio
  const parentElement = elements.find(
    (parent) => parent.id === element.parent_id,
  );
  const grandparentElement = parentElement?.parent_id
    ? elements.find((gp) => gp.id === parentElement.parent_id)
    : null;
  const isInsideRadioGroup =
    parentElement?.tag === "RadioGroup" ||
    parentElement?.tag === "RadioItems" ||
    grandparentElement?.tag === "RadioGroup";

  if (isInsideRadioGroup) {
    return (
      <Radio
        key={element.id}
        id={element.customId}
        data-element-id={element.id}
        value={String(element.props.value || "")}
        isDisabled={Boolean(element.props.isDisabled || false)}
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

  // Compositional: Label + RadioItems(중간 컨테이너) + Radio(레거시) 자식 분리
  const allChildren = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const labelChild = allChildren.find((child) => child.tag === "Label");
  const radioItemsChild = allChildren.find(
    (child) => child.tag === "RadioItems",
  );

  // RadioItems가 있으면 그 하위에서 Radio 검색, 없으면(레거시) 직접 자식에서 검색
  const radioParentId = radioItemsChild ? radioItemsChild.id : element.id;
  const radioChildren = elements
    .filter(
      (child) => child.parent_id === radioParentId && child.tag === "Radio",
    )
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 그룹 라벨: Label 자식 Element의 텍스트 사용 (renderElement 호출 제거 — 이중 렌더링 방지)
  const groupLabel =
    (labelChild?.props?.children as string) ||
    (element.props.label as string) ||
    undefined;

  return (
    <RadioGroup
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={groupLabel}
      defaultValue={String(element.props.value || "")}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "vertical"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isRequired={Boolean(element.props.isRequired)}
      necessityIndicator={
        element.props.necessityIndicator as "icon" | "label" | undefined
      }
      labelPosition={(element.props.labelPosition as "top" | "side") || "top"}
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
      <div className="radio-items">
        {radioChildren.map((radio) => renderElement(radio))}
      </div>
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
 * FileTrigger 렌더링
 *
 * 파일 선택 트리거 컴포넌트. 자식 요소(Button 등)를 클릭하면 파일 선택 다이얼로그 열림.
 */
export const renderFileTrigger = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <FileTrigger
      key={element.id}
      acceptedFileTypes={
        element.props.acceptedFileTypes as string[] | undefined
      }
      allowsMultiple={Boolean(element.props.allowsMultiple)}
      acceptDirectory={Boolean(element.props.acceptDirectory)}
      defaultCamera={
        element.props.defaultCamera as "user" | "environment" | undefined
      }
      onSelect={(files) => {
        if (files) {
          const fileList = Array.from(files).map((f) => f.name);
          context.updateElementProps(element.id, {
            ...element.props,
            selectedFiles: fileList,
          });
        }
      }}
    >
      {children.length > 0
        ? children.map((child) => renderElement(child, child.id))
        : null}
    </FileTrigger>
  );
};

/**
 * DropZone 렌더링
 *
 * 드래그앤드롭 파일 업로드 영역.
 */
export const renderDropZone = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { elements, renderElement } = context;
  const eventHandlers =
    context.services?.createEventHandlerMap?.(element, context) ?? {};

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <DropZone
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      variant={
        (element.props.variant as "default" | "primary" | "dashed") || "default"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      label={
        typeof element.props.label === "string"
          ? element.props.label
          : undefined
      }
      description={
        typeof element.props.description === "string"
          ? element.props.description
          : undefined
      }
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      onDrop={eventHandlers.onDrop as unknown as (e: unknown) => void}
    >
      {children.length > 0
        ? children.map((child) => renderElement(child, child.id))
        : undefined}
    </DropZone>
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
