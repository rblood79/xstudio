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
} from "react-aria-components";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import "./styles/DateRangePicker.css";

export interface DateRangePickerProps<T extends DateValue>
  extends AriaDateRangePickerProps<T> {
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
}

export function DateRangePicker<T extends DateValue>({
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
  ...props
}: DateRangePickerProps<T>) {
  // includeTime이 true일 때 granularity를 자동으로 설정
  const effectiveGranularity = includeTime
    ? granularity || "minute"
    : granularity || "day";

  return (
    <AriaDateRangePicker
      {...props}
      className="react-aria-DateRangePicker"
      granularity={effectiveGranularity}
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
