import {
  Button,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerProps as AriaDateRangePickerProps,
  DateSegment,
  DateValue,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
  RangeCalendar,
  Text,
  TimeField,
  ValidationResult,
  composeRenderProps
} from "react-aria-components";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { getLocalTimeZone, today } from '@internationalized/date';
import { safeParseDateString } from '../../utils/core/dateUtils';
import type { DateRangePickerVariant, ComponentSize } from '../../types/componentVariants';

import "./styles/DateRangePicker.css";

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface DateRangePickerProps<T extends DateValue>
  extends AriaDateRangePickerProps<T> {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: DateRangePickerVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  // 추가 커스텀 프로퍼티들
  showCalendarIcon?: boolean;
  calendarIconPosition?: "left" | "right";
  placeholder?: string;
  showWeekNumbers?: boolean;
  highlightToday?: boolean;
  allowClear?: boolean;
  // 새로운 time 옵션
  includeTime?: boolean;
  timeFormat?: "12h" | "24h";
  startTimeLabel?: string;
  endTimeLabel?: string;
  /**
   * 타임존 (기본값: 로컬 타임존)
   * @default getLocalTimeZone()
   */
  timezone?: string;
  /**
   * 기본값을 오늘로 설정 (시작일과 종료일 모두 오늘)
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
  /**
   * React Aria 1.13.0: 주의 첫 번째 요일
   * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
   * 기본값은 locale에 따라 자동 설정
   * @example 1 (월요일 시작)
   */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * DateRangePicker Component with Material Design 3 support
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, filled
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Date range input with calendar popup
 * - Optional time selection for start and end
 * - Min/max date constraints
 * - Timezone support
 * - Default to today option
 * - Error message display
 *
 * @example
 * <DateRangePicker variant="primary" size="md" label="Select Date Range" />
 * <DateRangePicker variant="error" includeTime timeFormat="12h" />
 */
export function DateRangePicker<T extends DateValue>({
  variant = 'primary',
  size = 'md',
  label,
  description,
  errorMessage,
  firstDayOfWeek,
  showCalendarIcon = true,
  calendarIconPosition = "right",
  placeholder,
  showWeekNumbers = false,
  highlightToday = true,
  allowClear = false,
  includeTime = false,
  timeFormat = "24h",
  startTimeLabel = "시작 시간",
  endTimeLabel = "종료 시간",
  granularity,
  timezone,
  defaultToday = false,
  minDate,
  maxDate,
  ...props
}: DateRangePickerProps<T>) {
  // 타임존 설정
  const effectiveTimezone = timezone || getLocalTimeZone();

  // includeTime이 true일 때 granularity를 자동으로 설정
  const effectiveGranularity = includeTime
    ? granularity || "minute"
    : granularity || "day";

  // minDate/maxDate 자동 파싱
  const minValue = typeof minDate === 'string'
    ? safeParseDateString(minDate)
    : minDate;

  const maxValue = typeof maxDate === 'string'
    ? safeParseDateString(maxDate)
    : maxDate;

  // defaultToday가 true이고 value가 없으면 오늘 날짜로 시작일과 종료일 설정
  const defaultValue = defaultToday && !props.value && !props.defaultValue
    ? { start: today(effectiveTimezone) as T, end: today(effectiveTimezone) as T }
    : props.defaultValue;

  const dateRangePickerClassName = composeRenderProps(
    props.className,
    (className) => className ? `react-aria-DateRangePicker ${className}` : 'react-aria-DateRangePicker'
  );

  return (
    <AriaDateRangePicker
      {...props}
      className={dateRangePickerClassName}
      data-variant={variant}
      data-size={size}
      granularity={effectiveGranularity}
      defaultValue={defaultValue}
      minValue={minValue as T | undefined}
      maxValue={maxValue as T | undefined}
    >
      {label && <Label>{label}</Label>}
      <Group>
        {showCalendarIcon && calendarIconPosition === "left" && (
          <Button slot="prefix">📅</Button>
        )}
        <DateInput slot="start">
          {(segment) => (
            <DateSegment
              segment={segment}
              data-placeholder={
                !segment.isPlaceholder ? undefined : placeholder
              }
            />
          )}
        </DateInput>
        <span aria-hidden="true">–</span>
        <DateInput slot="end">
          {(segment) => (
            <DateSegment
              segment={segment}
              data-placeholder={
                !segment.isPlaceholder ? undefined : placeholder
              }
            />
          )}
        </DateInput>
        {showCalendarIcon && calendarIconPosition === "right" && (
          <Button>
            <ChevronDown size={16} />
          </Button>
        )}
        {allowClear && props.value && (
          <Button
            onPress={() => props.onChange?.(null)}
            aria-label="Clear date range"
          >
            ✕
          </Button>
        )}
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover>
        <Dialog>
          <div className="date-picker-popup">
            <RangeCalendar
              firstDayOfWeek={firstDayOfWeek}
              data-highlight-today={highlightToday}
              data-show-week-numbers={showWeekNumbers}
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
            </RangeCalendar>

            {includeTime && (
              <div className="date-picker-time-section">
                <div className="date-picker-time-fields-container">
                  <div className="date-picker-time-field-wrapper">
                    <Label className="date-picker-time-field-label">
                      {startTimeLabel}
                    </Label>
                    <TimeField
                      hourCycle={timeFormat === "12h" ? 12 : 24}
                      className="react-aria-DateRangePicker-start-time"
                    >
                      <DateInput>
                        {(segment) => <DateSegment segment={segment} />}
                      </DateInput>
                    </TimeField>
                  </div>
                  <div className="date-picker-time-field-wrapper">
                    <Label className="date-picker-time-field-label">
                      {endTimeLabel}
                    </Label>
                    <TimeField
                      hourCycle={timeFormat === "12h" ? 12 : 24}
                      className="react-aria-DateRangePicker-end-time"
                    >
                      <DateInput>
                        {(segment) => <DateSegment segment={segment} />}
                      </DateInput>
                    </TimeField>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
