import {
  Button,
  RangeCalendar as AriaRangeCalendar,
  CalendarCell,
  CalendarGrid,
  RangeCalendarProps as AriaRangeCalendarProps,
  DateValue,
  Heading,
  Text,
  composeRenderProps
} from 'react-aria-components';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { safeParseDateString } from '../../utils/core/dateUtils';
import type { CalendarVariant, ComponentSize } from '../../types/componentVariants';
import { Skeleton } from './Skeleton';

import './styles/RangeCalendar.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface RangeCalendarProps<T extends DateValue>
  extends AriaRangeCalendarProps<T> {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: CalendarVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  errorMessage?: string;
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
  /**
   * Show loading skeleton instead of calendar
   * @default false
   */
  isLoading?: boolean;
}

/**
 * RangeCalendar Component with Material Design 3 support
 *
 * M3 Features:
 * - 3 variants: primary, secondary, tertiary
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Date range selection with keyboard navigation
 * - Min/max date constraints
 * - Visual range highlighting
 * - Error message display
 *
 * @example
 * <RangeCalendar variant="primary" size="md" />
 * <RangeCalendar variant="secondary" minDate="2024-01-01" maxDate="2024-12-31" />
 */
export function RangeCalendar<T extends DateValue>(
  {
    variant = 'primary',
    size = 'md',
    errorMessage,
    minDate,
    maxDate,
    isLoading,
    ...props
  }: RangeCalendarProps<T>
) {
  if (isLoading) {
    return (
      <Skeleton
        componentVariant="calendar"
        size={size}
        className={props.className as string}
        aria-label="Loading range calendar..."
      />
    );
  }

  // minDate/maxDate 자동 파싱
  const minValue = typeof minDate === 'string'
    ? safeParseDateString(minDate)
    : minDate;

  const maxValue = typeof maxDate === 'string'
    ? safeParseDateString(maxDate)
    : maxDate;

  const rangeCalendarClassName = composeRenderProps(
    props.className,
    (className) => className ? `react-aria-RangeCalendar ${className}` : 'react-aria-RangeCalendar'
  );

  return (
    <AriaRangeCalendar
      {...props}
      className={rangeCalendarClassName}
      data-variant={variant}
      data-size={size}
      minValue={minValue as T | undefined}
      maxValue={maxValue as T | undefined}
    >
      <header>
        <Button slot="previous">
          <ChevronLeft size={16} />
        </Button>
        <Heading />
        <Button slot="next">
          <ChevronRight size={16} />
        </Button>
      </header>
      <CalendarGrid>
        {(date) => <CalendarCell date={date} />}
      </CalendarGrid>
      {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
    </AriaRangeCalendar>
  );
}
