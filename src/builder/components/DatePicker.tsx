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
  Label,
  Popover,
  Text,
  TimeField,
  ValidationResult,
} from "react-aria-components";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import "./styles/DatePicker.css";

export interface DatePickerProps<T extends DateValue>
  extends AriaDatePickerProps<T> {
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
}

export function DatePicker<T extends DateValue>({
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
  ...props
}: DatePickerProps<T>) {
  // includeTime이 true일 때 granularity를 자동으로 설정
  const effectiveGranularity = includeTime
    ? granularity || "minute"
    : granularity || "day";

  return (
    <AriaDatePicker
      {...props}
      className="react-aria-DatePicker"
      granularity={effectiveGranularity}
    >
      {label && <Label>{label}</Label>}
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
            <ChevronDown size={16} />
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
          <div className="react-aria-DatePicker-popup">
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
              <div className="react-aria-DatePicker-time-section">
                <div className="time-field-wrapper">
                  <Label className="time-field-label">{timeLabel}</Label>
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
}
