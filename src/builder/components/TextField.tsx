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

export interface TextFieldProps extends AriaTextFieldProps {
  label?: React.ReactNode; // 문자열뿐만 아니라 JSX도 허용
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  'key'?: string; // 추가 속성 지원
  //'data-element-id'?: string; // 추가 속성 지원
}

export function TextField(
  { label, description, errorMessage, children, ...props }: TextFieldProps
) {
  return (
    <AriaTextField {...props} className={composeTailwindRenderProps(props.className, 'aria-TextField')}>
      {/*React.isValidElement(React.Children.toArray(children)[0]) &&
        typeof (React.Children.toArray(children)[0] as React.ReactElement).type === 'function' &&
        (React.Children.toArray(children)[0] as React.ReactElement).type.name === "Label" && (
          children[0]
        )*/}
      {label && <Label data-element-id={children[0]?.props['data-element-id']}>{label}</Label>}
      <Input data-element-id={children[1]?.props['data-element-id']} className={inputStyles} />
      {description && <Description data-element-id={children[2]?.props['data-element-id']}>{description}</Description>}
      {errorMessage && <FieldError data-element-id={children[3]?.props['data-element-id']}>{errorMessage}</FieldError>}

    </AriaTextField>
  );
}
