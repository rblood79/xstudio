/**
 * SearchField Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  Button,
  FieldError,
  Input,
  Label,
  SearchField as AriaSearchField,
  SearchFieldProps as AriaSearchFieldProps,
  Text,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import type { SearchFieldVariant, ComponentSize } from '../types';

import './styles/SearchField.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface SearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  // M3 props
  variant?: SearchFieldVariant;
  size?: ComponentSize;
}

export function SearchField({
  label,
  description,
  errorMessage,
  placeholder,
  variant = 'primary',
  size = 'md',
  ...props
}: SearchFieldProps) {
  return (
    <AriaSearchField
      {...props}
      className={composeRenderProps(
        props.className,
        (className) => className ? `react-aria-SearchField ${className}` : 'react-aria-SearchField'
      )}
      data-variant={variant}
      data-size={size}
    >
      {label && <Label>{label}</Label>}
      <Input placeholder={placeholder} />
      <Button>✕</Button>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaSearchField>
  );
}

export { SearchField as MySearchField };
