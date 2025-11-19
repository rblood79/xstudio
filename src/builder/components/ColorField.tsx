"use client";
import {
  ColorField as AriaColorField,
  ColorFieldProps as AriaColorFieldProps,
  Input,
  ValidationResult,
  composeRenderProps
} from "react-aria-components";
import { tv } from 'tailwind-variants';
import { Text } from "./Content";
import { Label, FieldError } from "./Field";
import type { ColorFieldVariant, ComponentSize } from '../types/componentVariants';

import "./styles/ColorField.css";

const colorFieldStyles = tv({
  base: 'react-aria-ColorField',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ColorFieldProps extends AriaColorFieldProps {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: ColorFieldVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

/**
 * ColorField Component with Material Design 3 support
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, filled
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Color input with hex value display
 * - Keyboard navigation
 * - Validation support
 * - Error message display
 *
 * @example
 * <ColorField variant="primary" size="md" label="Background Color" />
 * <ColorField variant="error" errorMessage="Invalid color" />
 */
export function ColorField({
  variant = 'primary',
  size = 'md',
  label,
  description,
  errorMessage,
  ...props
}: ColorFieldProps) {
  const colorFieldClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return colorFieldStyles({ ...renderProps, variant, size, className });
    }
  );

  return (
    <AriaColorField {...props} className={colorFieldClassName}>
      {label && <Label>{label}</Label>}
      <Input />
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaColorField>
  );
}
