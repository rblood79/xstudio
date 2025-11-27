import {
  Button,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarProps as AriaCalendarProps,
  DateValue,
  Heading,
  Text,
  composeRenderProps
} from 'react-aria-components';

import { tv } from 'tailwind-variants';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalTimeZone, today } from '@internationalized/date';
import { safeParseDateString } from '../../utils/core/dateUtils';
import type { CalendarVariant, ComponentSize } from '../../types/componentVariants';

import './styles/Calendar.css';

const calendarStyles = tv({
  base: 'react-aria-Calendar',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
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

export interface CalendarProps<T extends DateValue>
  extends AriaCalendarProps<T> {
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
}

/**
 * Calendar Component with Material Design 3 support
 *
 * M3 Features:
 * - 3 variants: primary, secondary, tertiary
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Date selection with keyboard navigation
 * - Min/max date constraints
 * - Timezone support
 * - Default to today option
 * - Error message display
 *
 * @example
 * <Calendar variant="primary" size="md" defaultToday />
 * <Calendar variant="secondary" minDate="2024-01-01" maxDate="2024-12-31" />
 */
export function Calendar<T extends DateValue>(
  {
    variant = 'primary',
    size = 'md',
    errorMessage,
    timezone,
    defaultToday = false,
    minDate,
    maxDate,
    ...props
  }: CalendarProps<T>
) {
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

  const calendarClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return calendarStyles({ ...renderProps, variant, size, className });
    }
  );

  return (
    <AriaCalendar
      {...props}
      className={calendarClassName}
      defaultValue={defaultValue}
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
    </AriaCalendar>
  );
}
