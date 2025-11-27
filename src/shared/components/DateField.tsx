/**
 * DateField Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  DateField as AriaDateField,
  DateFieldProps as AriaDateFieldProps,
  DateInput,
  DateSegment,
  DateValue,
  FieldError,
  Label,
  Text,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { DateFieldVariant, ComponentSize } from '../../types/componentVariants';
import { getLocalTimeZone, today } from '@internationalized/date';
import { safeParseDateString } from '../../utils/core/dateUtils';

import './styles/DateField.css';

export interface DateFieldProps<T extends DateValue>
  extends AriaDateFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /**
   * 타임존 (기본값: 로컬 타임존)
   * @default getLocalTimeZone()
   */
  timezone?: string;
  /**
   * 기본값을 오늘로 설정
   * @default false
   */
  defaultToday?: boolean;
  /**
   * 최소 날짜 (문자열 또는 DateValue)
   * @example "2024-01-01"
   */
  minDate?: string | DateValue;
  /**
   * 최대 날짜 (문자열 또는 DateValue)
   * @example "2024-12-31"
   */
  maxDate?: string | DateValue;
  // M3 props
  variant?: DateFieldVariant;
  size?: ComponentSize;
}

const dateFieldStyles = tv({
  base: 'react-aria-DateField',
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

export function DateField<T extends DateValue>({
  label,
  description,
  errorMessage,
  timezone,
  defaultToday = false,
  minDate,
  maxDate,
  variant = 'primary',
  size = 'md',
  ...props
}: DateFieldProps<T>) {
  // 타임존 설정
  const effectiveTimezone = timezone || getLocalTimeZone();

  // minDate/maxDate 자동 파싱
  const minValue = typeof minDate === 'string'
    ? safeParseDateString(minDate)
    : minDate;

  const maxValue = typeof maxDate === 'string'
    ? safeParseDateString(maxDate)
    : maxDate;

  // defaultToday가 true이고 value가 없으면 오늘 날짜 설정
  const defaultValue = defaultToday && !props.value && !props.defaultValue
    ? (today(effectiveTimezone) as T)
    : props.defaultValue;

  return (
    <AriaDateField
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          return dateFieldStyles({
            ...renderProps,
            variant,
            size,
            className,
          });
        }
      )}
      defaultValue={defaultValue}
      minValue={minValue as T | undefined}
      maxValue={maxValue as T | undefined}
    >
      {label && <Label>{label}</Label>}
      <DateInput>
        {(segment) => <DateSegment segment={segment} />}
      </DateInput>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaDateField>
  );
}
