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
  ValidationResult
} from 'react-aria-components';

import './components.css';

export interface DateRangePickerProps<T extends DateValue>
  extends AriaDateRangePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  // 추가 커스텀 프로퍼티들
  showCalendarIcon?: boolean;
  calendarIconPosition?: 'left' | 'right';
  placeholder?: string;
  showWeekNumbers?: boolean;
  highlightToday?: boolean;
  allowClear?: boolean;
}

export function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  firstDayOfWeek,
  showCalendarIcon = true,
  calendarIconPosition = 'right',
  placeholder,
  showWeekNumbers = false,
  highlightToday = true,
  allowClear = false,
  ...props
}: DateRangePickerProps<T>) {
  return (
    <AriaDateRangePicker {...props} className="react-aria-DateRangePicker">
      {label && <Label>{label}</Label>}
      <Group>
        {showCalendarIcon && calendarIconPosition === 'left' && (
          <Button slot="prefix">📅</Button>
        )}
        <DateInput slot="start">
          {(segment) => (
            <DateSegment
              segment={segment}
              data-placeholder={!segment.isPlaceholder ? undefined : placeholder}
            />
          )}
        </DateInput>
        <span aria-hidden="true">–</span>
        <DateInput slot="end">
          {(segment) => (
            <DateSegment
              segment={segment}
              data-placeholder={!segment.isPlaceholder ? undefined : placeholder}
            />
          )}
        </DateInput>
        {showCalendarIcon && calendarIconPosition === 'right' && (
          <Button>▼</Button>
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
          <RangeCalendar
            firstDayOfWeek={firstDayOfWeek}
            data-highlight-today={highlightToday}
            data-show-week-numbers={showWeekNumbers}
          >
            <header>
              <Button slot="previous">◀</Button>
              <Heading />
              <Button slot="next">▶</Button>
            </header>
            <CalendarGrid>
              {(date) => <CalendarCell date={date} />}
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
