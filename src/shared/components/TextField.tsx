/**
 * TextField Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as AriaTextField,
  TextFieldProps as AriaTextFieldProps,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { TextFieldVariant, ComponentSize } from '../../types/componentVariants';
import { Skeleton } from './Skeleton';

import './styles/TextField.css';

export interface TextFieldProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  value?: string;
  onChange?: (value: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  // M3 props
  variant?: TextFieldVariant;
  size?: ComponentSize;
  /** Show loading skeleton instead of input */
  isLoading?: boolean;
}

const textFieldStyles = tv({
  base: 'react-aria-TextField',
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

export function TextField({
  label,
  description,
  errorMessage,
  placeholder = "Enter text...",
  type = 'text',
  value,
  onChange,
  isRequired,
  isDisabled,
  isReadOnly,
  variant = 'primary',
  size = 'md',
  isLoading,
  ...props
}: TextFieldProps) {
  if (isLoading) {
    return (
      <Skeleton
        componentVariant="input"
        size={size}
        className={props.className as string}
        aria-label="Loading text field..."
      />
    );
  }

  return (
    <AriaTextField
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          return textFieldStyles({
            ...renderProps,
            variant,
            size,
            className,
          });
        }
      )}
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      {label && <Label>{label}</Label>}
      <Input
        type={type}
        placeholder={placeholder}
      />
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
