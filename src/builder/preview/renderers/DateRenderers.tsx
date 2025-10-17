import React from "react";
import { Calendar, DatePicker, DateRangePicker } from "../../components/list";
import { PreviewElement, RenderContext } from "../types";
import { today, getLocalTimeZone } from "@internationalized/date";

/**
 * Date 관련 컴포넌트 렌더러
 * - Calendar
 * - DatePicker
 * - DateRangePicker
 */

/**
 * Calendar 렌더링
 */
export const renderCalendar = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { updateElementProps } = context;

  const getVisibleDuration = () => {
    const vd = element.props.visibleDuration;
    if (typeof vd === "object" && vd !== null && "months" in vd) {
      const months = Number(vd.months);
      if (months >= 1 && months <= 12) {
        return { months };
      }
    }
    return { months: 1 };
  };

  const getPageBehavior = () => {
    const pb = element.props.pageBehavior;
    return pb === "visible" || pb === "single" ? pb : "visible";
  };

  return (
    <Calendar
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      aria-label={element.props["aria-label"] || "Calendar"}
      isDisabled={Boolean(element.props.isDisabled)}
      visibleDuration={getVisibleDuration()}
      pageBehavior={getPageBehavior() as "visible" | "single"}
      defaultValue={today(getLocalTimeZone())}
      onChange={(date) => {
        const updatedProps = {
          ...element.props,
          value: date,
        };
        updateElementProps(element.id, updatedProps);
      }}
      errorMessage={String(element.props.errorMessage || "")}
    />
  );
};

/**
 * DatePicker 렌더링
 */
export const renderDatePicker = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { updateElementProps } = context;

  const getGranularity = () => {
    if (element.props.includeTime) {
      const g = String(element.props.granularity || "");
      return ["hour", "minute", "second"].includes(g) ? g : "minute";
    } else {
      const g = String(element.props.granularity || "");
      return ["day"].includes(g) ? g : "day";
    }
  };

  const getFirstDayOfWeek = () => {
    const fdow = Number(element.props.firstDayOfWeek);
    return fdow >= 0 && fdow <= 6 ? fdow : 0;
  };

  const getCalendarIconPosition = () => {
    const cip = element.props.calendarIconPosition;
    return cip === "left" || cip === "right" ? cip : "right";
  };

  return (
    <DatePicker
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "Date Picker")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={element.props.placeholder}
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      defaultValue={today(getLocalTimeZone())}
      granularity={getGranularity() as "day" | "hour" | "minute" | "second"}
      firstDayOfWeek={
        ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
          getFirstDayOfWeek()
        ] as "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
      }
      showCalendarIcon={element.props.showCalendarIcon !== false}
      calendarIconPosition={getCalendarIconPosition() as "left" | "right"}
      showWeekNumbers={Boolean(element.props.showWeekNumbers)}
      highlightToday={element.props.highlightToday !== false}
      allowClear={element.props.allowClear !== false}
      autoFocus={Boolean(element.props.autoFocus)}
      shouldForceLeadingZeros={element.props.shouldForceLeadingZeros !== false}
      shouldCloseOnSelect={element.props.shouldCloseOnSelect !== false}
      includeTime={Boolean(element.props.includeTime)}
      timeFormat={(element.props.timeFormat as "12h" | "24h") || "24h"}
      timeLabel={(element.props.timeLabel as string) || "시간"}
      onChange={(date) => {
        const updatedProps = {
          ...element.props,
          value: date,
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};

/**
 * DateRangePicker 렌더링
 */
export const renderDateRangePicker = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { updateElementProps } = context;

  const getGranularity = () => {
    const g = String(element.props.granularity || "");
    return ["day", "hour", "minute", "second"].includes(g) ? g : "day";
  };

  const getFirstDayOfWeek = () => {
    const fdow = Number(element.props.firstDayOfWeek);
    return fdow >= 0 && fdow <= 6 ? fdow : 0;
  };

  const getCalendarIconPosition = () => {
    const cip = element.props.calendarIconPosition;
    return cip === "left" || cip === "right" ? cip : "right";
  };

  return (
    <DateRangePicker
      key={element.id}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "Date Range Picker")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={(element.props.placeholder as string) || ""}
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      defaultValue={{
        start: today(getLocalTimeZone()),
        end: today(getLocalTimeZone()),
      }}
      minValue={element.props.minValue ? undefined : undefined}
      maxValue={element.props.maxValue ? undefined : undefined}
      placeholderValue={element.props.placeholderValue ? undefined : undefined}
      granularity={getGranularity() as "day" | "hour" | "minute" | "second"}
      firstDayOfWeek={
        ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
          getFirstDayOfWeek()
        ] as "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
      }
      showCalendarIcon={element.props.showCalendarIcon !== false}
      calendarIconPosition={getCalendarIconPosition() as "left" | "right"}
      showWeekNumbers={Boolean(element.props.showWeekNumbers)}
      highlightToday={element.props.highlightToday !== false}
      allowClear={element.props.allowClear !== false}
      autoFocus={Boolean(element.props.autoFocus)}
      shouldForceLeadingZeros={element.props.shouldForceLeadingZeros !== false}
      shouldCloseOnSelect={element.props.shouldCloseOnSelect !== false}
      allowsNonContiguousRanges={Boolean(element.props.allowsNonContiguousRanges)}
      includeTime={Boolean(element.props.includeTime)}
      timeFormat={(element.props.timeFormat as "12h" | "24h") || "24h"}
      startTimeLabel={(element.props.startTimeLabel as string) || "시작 시간"}
      endTimeLabel={(element.props.endTimeLabel as string) || "종료 시간"}
      onChange={(dateRange) => {
        const updatedProps = {
          ...element.props,
          value: dateRange,
        };
        updateElementProps(element.id, updatedProps);
      }}
    />
  );
};
