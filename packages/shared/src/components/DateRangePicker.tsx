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
  I18nProvider,
  Label,
  Popover,
  RangeCalendar,
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

import "./styles/DateRangePicker.css";

export interface DateRangePickerProps<T extends DateValue> extends Omit<
  AriaDateRangePickerProps<T>,
  "minValue" | "maxValue"
> {
  /** @default 'default' */
  variant?: "default" | "accent";
  /** @default 'md' */
  size?: ComponentSize;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  showCalendarIcon?: boolean;
  calendarIconPosition?: "left" | "right";
  placeholder?: string;
  showWeekNumbers?: boolean;
  highlightToday?: boolean;
  allowClear?: boolean;
  includeTime?: boolean;
  timeFormat?: "12h" | "24h";
  startTimeLabel?: string;
  endTimeLabel?: string;
  /** BCP 47 locale (e.g. "ko-KR", "en-US") */
  locale?: string;
  /** Unicode calendar identifier (e.g. "buddhist", "japanese") */
  calendarSystem?: string;
  /** @default getLocalTimeZone() */
  timezone?: string;
  /** @default false */
  defaultToday?: boolean;
  /** @example "2024-01-01" */
  minValue?: string | DateValue;
  /** @example "2024-12-31" */
  maxValue?: string | DateValue;
  necessityIndicator?: NecessityIndicator;
  hideTimeZone?: boolean;
  pageBehavior?: "visible" | "single";
  startName?: string;
  endName?: string;
  form?: string;
  validationBehavior?: "native" | "aria";
}

export function DateRangePicker<T extends DateValue>({
  variant = "default",
  size = "md",
  label,
  description,
  errorMessage,
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
  locale,
  calendarSystem,
  timezone,
  defaultToday = false,
  minValue,
  maxValue,
  necessityIndicator,
  hideTimeZone,
  pageBehavior,
  startName,
  endName,
  form,
  validationBehavior,
  ...props
}: DateRangePickerProps<T>) {
  const effectiveTimezone = timezone || getLocalTimeZone();

  const effectiveGranularity = includeTime
    ? granularity || "minute"
    : granularity || "day";

  // minValue/maxValue 문자열 자동 파싱
  const parsedMinValue =
    typeof minValue === "string" ? safeParseDateString(minValue) : minValue;

  const parsedMaxValue =
    typeof maxValue === "string" ? safeParseDateString(maxValue) : maxValue;

  const defaultValue =
    defaultToday && !props.value && !props.defaultValue
      ? {
          start: today(effectiveTimezone) as T,
          end: today(effectiveTimezone) as T,
        }
      : props.defaultValue;

  const dateRangePickerClassName = composeRenderProps(
    props.className,
    (className) =>
      className
        ? `react-aria-DateRangePicker ${className}`
        : "react-aria-DateRangePicker",
  );

  const picker = (
    <AriaDateRangePicker
      {...props}
      className={dateRangePickerClassName}
      data-variant={variant}
      data-size={size}
      granularity={effectiveGranularity}
      defaultValue={defaultValue}
      minValue={parsedMinValue as T | undefined}
      maxValue={parsedMaxValue as T | undefined}
      hideTimeZone={hideTimeZone}
      pageBehavior={pageBehavior}
      startName={startName}
      endName={endName}
      form={form}
      validationBehavior={validationBehavior}
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
            <CalendarIcon size={16} />
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
      <Popover data-size={size} data-variant={variant}>
        <Dialog>
          <div className="date-picker-popup">
            <RangeCalendar
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

  // locale + calendarSystem → BCP 47 Unicode extension (e.g. "ko-KR-u-ca-buddhist")
  const effectiveLocale = calendarSystem
    ? `${locale || navigator.language}-u-ca-${calendarSystem}`
    : locale;

  if (effectiveLocale) {
    return <I18nProvider locale={effectiveLocale}>{picker}</I18nProvider>;
  }

  return picker;
}
