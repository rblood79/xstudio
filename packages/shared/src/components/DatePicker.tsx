import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  DateSegment,
  DateValue,
  Dialog,
  FieldError,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  Text,
  TimeField,
  ValidationResult,
  composeRenderProps,
} from "react-aria-components";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { safeParseDateString } from "../utils/core/dateUtils";
import type { ComponentSize } from "../types";
import type { NecessityIndicator } from "./Field";
import { renderNecessityIndicator } from "./Field";

import "./styles/DatePicker.css";

export interface DatePickerProps<
  T extends DateValue,
> extends AriaDatePickerProps<T> {
  /** @default 'default' */
  variant?: "default" | "accent";
  /** @default 'md' */
  size?: ComponentSize;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  // 추가 커스텀 프로퍼티들
  showCalendarIcon?: boolean;
  calendarIconPosition?: "left" | "right";
  placeholder?: string;
  dateFormat?: string;
  showWeekNumbers?: boolean;
  highlightToday?: boolean;
  allowClear?: boolean;
  // 새로운 time 옵션
  includeTime?: boolean;
  timeFormat?: "12h" | "24h";
  timeLabel?: string;
  // React Aria 라이브러리 활용 추가 옵션
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
   * @example "2024-01-01" or parseDate("2024-01-01")
   */
  minDate?: string | DateValue;
  /**
   * 최대 날짜 (문자열 또는 DateValue)
   * @example "2024-12-31" or parseDate("2024-12-31")
   */
  maxDate?: string | DateValue;
  /**
   * React Aria: 주의 첫 번째 요일
   * "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
   * 기본값은 locale에 따라 자동 설정
   * @example "mon" (월요일 시작)
   */
  firstDayOfWeek?: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  necessityIndicator?: NecessityIndicator;
  labelPosition?: "top" | "side";
  /** BCP 47 locale (e.g. "ko-KR", "en-US") */
  locale?: string;
  /** Unicode calendar identifier (e.g. "buddhist", "japanese") */
  calendarSystem?: string;
}

export function DatePicker<T extends DateValue>({
  variant = "default",
  size = "md",
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
  timeLabel = "시간",
  granularity,
  timezone,
  defaultToday = false,
  minDate,
  maxDate,
  necessityIndicator,
  labelPosition = "top",
  locale,
  calendarSystem,
  ...props
}: DatePickerProps<T>) {
  // 타임존 설정 (명시하지 않으면 로컬 타임존 사용)
  const effectiveTimezone = timezone || getLocalTimeZone();

  // includeTime이 true일 때 granularity를 자동으로 설정
  const effectiveGranularity = includeTime
    ? granularity || "minute"
    : granularity || "day";

  // minDate/maxDate 자동 파싱 (문자열인 경우)
  const minValue =
    typeof minDate === "string" ? safeParseDateString(minDate) : minDate;

  const maxValue =
    typeof maxDate === "string" ? safeParseDateString(maxDate) : maxDate;

  // defaultToday가 true이고 value가 없으면 오늘 날짜 설정
  const defaultValue =
    defaultToday && !props.value && !props.defaultValue
      ? (today(effectiveTimezone) as T)
      : props.defaultValue;

  const datePickerClassName = composeRenderProps(
    props.className,
    (className) =>
      className
        ? `react-aria-DatePicker ${className}`
        : "react-aria-DatePicker",
  );

  const effectiveLocale = calendarSystem
    ? `${locale || navigator.language}-u-ca-${calendarSystem}`
    : locale;

  const component = (
    <AriaDatePicker
      {...props}
      className={datePickerClassName}
      data-variant={variant}
      data-size={size}
      data-label-position={labelPosition}
      granularity={effectiveGranularity}
      defaultValue={defaultValue}
      minValue={minValue as T | undefined}
      maxValue={maxValue as T | undefined}
    >
      {label && (
        <Label>
          {label}
          {renderNecessityIndicator(necessityIndicator, props.isRequired)}
        </Label>
      )}
      <Group>
        {showCalendarIcon && calendarIconPosition === "left" && (
          <Button slot="prefix">📅</Button>
        )}
        <DateInput>
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
            <CalendarIcon size={16} />
          </Button>
        )}
        {allowClear && props.value && (
          <Button
            onPress={() => props.onChange?.(null)}
            aria-label="Clear date"
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
            <Calendar
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
            </Calendar>

            {includeTime && (
              <div className="date-picker-time-section">
                <div className="date-picker-time-field-wrapper">
                  <Label className="date-picker-time-field-label">
                    {timeLabel}
                  </Label>
                  <TimeField
                    hourCycle={timeFormat === "12h" ? 12 : 24}
                    className="react-aria-DatePicker-time-field"
                  >
                    <DateInput>
                      {(segment) => <DateSegment segment={segment} />}
                    </DateInput>
                  </TimeField>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );

  if (effectiveLocale) {
    return <I18nProvider locale={effectiveLocale}>{component}</I18nProvider>;
  }
  return component;
}
