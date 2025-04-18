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
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function TextField(
  { label, description, errorMessage, ...props }: TextFieldProps
) {
  return (
    <AriaTextField {...props} className={composeTailwindRenderProps(props.className, 'aria-TextField')}>
      {label && <Label>{label}</Label>}
      <Input className={inputStyles} />
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
