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
import { tv } from 'tailwind-variants';
import type { SearchFieldVariant, ComponentSize } from '../../types/componentVariants';

import './styles/SearchField.css';

export interface SearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  // M3 props
  variant?: SearchFieldVariant;
  size?: ComponentSize;
}

const searchFieldStyles = tv({
  base: 'react-aria-SearchField',
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
        (className, renderProps) => {
          return searchFieldStyles({
            ...renderProps,
            variant,
            size,
            className,
          });
        }
      )}
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
