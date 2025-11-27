/**
 * TimeField Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  DateInput,
  DateSegment,
  FieldError,
  Label,
  Text,
  TimeField as AriaTimeField,
  TimeFieldProps as AriaTimeFieldProps,
  TimeValue,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { TimeFieldVariant, ComponentSize } from '../../types/componentVariants';

import './styles/TimeField.css';

export interface TimeFieldProps<T extends TimeValue>
  extends AriaTimeFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /**
   * 시간 형식
   * - 12: 12시간 형식 (AM/PM)
   * - 24: 24시간 형식
   * @default 24
   */
  hourCycle?: 12 | 24;
  /**
   * 플레이스홀더 텍스트
   */
  placeholder?: string;
  // M3 props
  variant?: TimeFieldVariant;
  size?: ComponentSize;
}

const timeFieldStyles = tv({
  base: 'react-aria-TimeField',
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

export function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  hourCycle = 24,
  placeholder,
  variant = 'primary',
  size = 'md',
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          return timeFieldStyles({
            ...renderProps,
            variant,
            size,
            className,
          });
        }
      )}
      hourCycle={hourCycle}
    >
      {label && <Label>{label}</Label>}
      <DateInput>
        {(segment) => (
          <DateSegment
            segment={segment}
            data-placeholder={!segment.isPlaceholder ? undefined : placeholder}
          />
        )}
      </DateInput>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTimeField>
  );
}
