"use client";
import {
  ColorField as AriaColorField,
  ColorFieldProps as AriaColorFieldProps,
  Input,
  ValidationResult,
  composeRenderProps
} from "react-aria-components";
import { Text } from "./Content";
import { Label, FieldError } from "./Field";
import type { ColorFieldVariant, ComponentSize } from '../../types/componentVariants';

import "./styles/ColorField.css";

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

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
    (className) => className ? `react-aria-ColorField ${className}` : 'react-aria-ColorField'
  );

  return (
    <AriaColorField {...props} className={colorFieldClassName} data-variant={variant} data-size={size}>
      {label && <Label>{label}</Label>}
      <Input />
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaColorField>
  );
}
