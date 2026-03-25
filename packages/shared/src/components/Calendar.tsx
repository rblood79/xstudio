import {
  Button,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarProps as AriaCalendarProps,
  DateValue,
  Heading,
  I18nProvider,
  Text,
  composeRenderProps,
} from "react-aria-components";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { safeParseDateString } from "../utils/core/dateUtils";
import type { ComponentSize } from "../types";
import { Skeleton } from "./Skeleton";

import "./styles/Calendar.css";

export interface CalendarProps<
  T extends DateValue,
> extends AriaCalendarProps<T> {
  /** @default 'default' */
  variant?: "default" | "accent";
  /** @default 'md' */
  size?: ComponentSize;
  errorMessage?: string;
  /** BCP 47 locale (e.g. "ko-KR", "en-US") */
  locale?: string;
  /** Unicode calendar identifier (e.g. "gregory", "buddhist", "japanese") */
  calendarSystem?: string;
  /** @default false */
  defaultToday?: boolean;
  /** @example "2024-01-01" */
  minDate?: string | DateValue;
  /** @example "2024-12-31" */
  maxDate?: string | DateValue;
  /** @default 'center' */
  selectionAlignment?: "start" | "center" | "end";
  /** @default 1 */
  visibleMonths?: number;
  /** @default false */
  isLoading?: boolean;
}

export function Calendar<T extends DateValue>({
  variant = "default",
  size = "md",
  errorMessage,
  locale,
  calendarSystem,
  defaultToday = false,
  minDate,
  maxDate,
  selectionAlignment = "center",
  visibleMonths = 1,
  isLoading,
  ...props
}: CalendarProps<T>) {
  if (isLoading) {
    return (
      <Skeleton
        componentVariant="calendar"
        size={size}
        className={props.className as string}
        aria-label="Loading calendar..."
      />
    );
  }
  // minDate/maxDate 자동 파싱
  const minValue =
    typeof minDate === "string" ? safeParseDateString(minDate) : minDate;

  const maxValue =
    typeof maxDate === "string" ? safeParseDateString(maxDate) : maxDate;

  const defaultValue = props.defaultValue;

  const calendarClassName = composeRenderProps(props.className, (className) =>
    className ? `react-aria-Calendar ${className}` : "react-aria-Calendar",
  );

  const calendar = (
    <AriaCalendar
      {...props}
      className={calendarClassName}
      data-variant={variant}
      data-size={size}
      defaultValue={defaultValue}
      minValue={minValue as T | undefined}
      maxValue={maxValue as T | undefined}
      selectionAlignment={selectionAlignment}
      visibleDuration={{ months: visibleMonths }}
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
      <div className="calendar-grids">
        {Array.from({ length: visibleMonths }, (_, i) => (
          <CalendarGrid key={i} offset={{ months: i }}>
            {(date) => <CalendarCell date={date} />}
          </CalendarGrid>
        ))}
      </div>
      {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
    </AriaCalendar>
  );

  // locale + calendarSystem → BCP 47 Unicode extension (e.g. "ko-KR-u-ca-buddhist")
  const effectiveLocale = calendarSystem
    ? `${locale || navigator.language}-u-ca-${calendarSystem}`
    : locale;

  if (effectiveLocale) {
    return <I18nProvider locale={effectiveLocale}>{calendar}</I18nProvider>;
  }

  return calendar;
}
