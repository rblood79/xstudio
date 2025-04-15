import React from 'react';
import {
  TextField as AriaTextField,
  TextFieldProps as AriaTextFieldProps,
  ValidationResult
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { Description, FieldError, Input, Label, fieldBorderStyles } from './Field';
import { composeTailwindRenderProps, focusRing } from './utils';

const inputStyles = tv({
  extend: focusRing,
  base: 'aria-Field',
  variants: {
    isFocused: fieldBorderStyles.variants.isFocusWithin,
    isInvalid: fieldBorderStyles.variants.isInvalid,
    isDisabled: fieldBorderStyles.variants.isDisabled
  }
});

// data-element-id를 포함하는 props 타입 정의
interface ElementWithDataId {
  'data-element-id'?: string;
  [key: string]: unknown;
}

export interface TextFieldProps extends AriaTextFieldProps {
  label?: React.ReactNode; // 문자열뿐만 아니라 JSX도 허용
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  'key'?: string; // 추가 속성 지원
  children?: React.ReactNode;
}

export function TextField(
  { label, description, errorMessage, children, ...props }: TextFieldProps
) {
  // children을 안전하게 처리
  const childrenArray = React.Children.toArray(children || []);

  // 각 자식 요소의 data-element-id를 추출하는 함수
  const getElementId = (index: number): string | undefined => {
    if (index < childrenArray.length && React.isValidElement(childrenArray[index])) {
      const element = childrenArray[index] as React.ReactElement<ElementWithDataId>;
      return element.props['data-element-id'];
    }
    return undefined;
  };

  return (
    <AriaTextField {...props} className={composeTailwindRenderProps(props.className, 'aria-TextField')}>
      {/*React.isValidElement(React.Children.toArray(children)[0]) &&
        typeof (React.Children.toArray(children)[0] as React.ReactElement).type === 'function' &&
        (React.Children.toArray(children)[0] as React.ReactElement).type.name === "Label" && (
          children[0]
        )*/}
      {label && <Label data-element-id={getElementId(0)}>{label}</Label>}
      <Input data-element-id={getElementId(1)} className={inputStyles} />
      {description && <Description data-element-id={getElementId(2)}>{description}</Description>}
      {errorMessage && <FieldError data-element-id={getElementId(3)}>{errorMessage}</FieldError>}

    </AriaTextField>
  );
}
