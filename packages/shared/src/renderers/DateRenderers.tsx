import React from "react";
import {
  Calendar,
  DatePicker,
  DateRangePicker,
  DateField,
  TimeField,
} from "../components/list";
import { I18nProvider } from "react-aria-components";
import type { PreviewElement, RenderContext } from "../types";
import { today, now, getLocalTimeZone, Time } from "@internationalized/date";

/**
 * locale + calendar → I18nProvider locale 문자열
 * 예: "ko-KR" + "buddhist" → "ko-KR-u-ca-buddhist"
 */
function buildLocaleString(
  locale?: string,
  calendar?: string,
): string | undefined {
  if (!locale && !calendar) return undefined;
  const base = locale || "en-US";
  if (!calendar) return base;
  return `${base}-u-ca-${calendar}`;
}

/** locale/calendar가 있으면 I18nProvider로 래핑 */
function wrapWithI18n(
  node: React.ReactElement,
  locale?: string,
  calendar?: string,
): React.ReactNode {
  const localeStr = buildLocaleString(locale, calendar);
  if (!localeStr) return node;
  return (
    <I18nProvider key={node.key} locale={localeStr}>
      {node}
    </I18nProvider>
  );
}

/**
 * Date 관련 컴포넌트 렌더러
 * - Calendar
 * - DatePicker
 * - DateRangePicker
 * - DateField
 * - TimeField
 */

/**
 * Calendar 렌더링
 */
export const renderCalendar = (
  element: PreviewElement,
  context: RenderContext,
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
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      aria-label={
        typeof element.props["aria-label"] === "string"
          ? element.props["aria-label"]
          : "Calendar"
      }
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
  context: RenderContext,
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
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "Date Picker")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={
        typeof element.props.placeholder === "string"
          ? element.props.placeholder
          : undefined
      }
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      necessityIndicator={
        element.props.necessityIndicator as "icon" | "label" | undefined
      }
      labelPosition={(element.props.labelPosition as "top" | "side") || "top"}
      name={element.props.name ? String(element.props.name) : undefined}
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
  context: RenderContext,
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
      id={element.customId}
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
      allowsNonContiguousRanges={Boolean(
        element.props.allowsNonContiguousRanges,
      )}
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

/**
 * DateField 렌더링
 */
export const renderDateField = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  const granularity = (() => {
    const g = String(element.props.granularity || "");
    return ["day", "hour", "minute", "second"].includes(g) ? g : "day";
  })() as "day" | "hour" | "minute" | "second";

  const locale = element.props.locale as string | undefined;
  const calendar = element.props.calendar as string | undefined;

  const hourCycle = element.props.hourCycle
    ? Number(element.props.hourCycle)
    : undefined;
  // key에 granularity/locale/calendar 포함 → 변경 시 리마운트 (defaultValue 재적용)
  const size = element.props.size as string | undefined;
  const remountKey = `${element.id}-${granularity}-${locale || ""}-${calendar || ""}-${size || ""}`;

  return wrapWithI18n(
    <DateField
      key={remountKey}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "Date")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      size={
        (element.props.size as "xs" | "sm" | "md" | "lg" | "xl") || undefined
      }
      variant={String(element.props.variant || "default")}
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      necessityIndicator={
        element.props.necessityIndicator as "icon" | "label" | undefined
      }
      labelPosition={(element.props.labelPosition as "top" | "side") || "top"}
      name={element.props.name ? String(element.props.name) : undefined}
      defaultValue={
        granularity === "day"
          ? today(getLocalTimeZone())
          : now(getLocalTimeZone())
      }
      granularity={granularity}
      hourCycle={hourCycle as 12 | 24 | undefined}
      onChange={(date) => {
        const updatedProps = {
          ...element.props,
          value: date,
        };
        updateElementProps(element.id, updatedProps);
      }}
    />,
    locale,
    calendar,
  );
};

/**
 * TimeField 렌더링
 */
export const renderTimeField = (
  element: PreviewElement,
  context: RenderContext,
): React.ReactNode => {
  const { updateElementProps } = context;

  const getGranularity = () => {
    const g = String(element.props.granularity || "");
    return ["hour", "minute", "second"].includes(g) ? g : "minute";
  };

  const locale = element.props.locale as string | undefined;
  const granularity = getGranularity() as "hour" | "minute" | "second";
  const hourCycle = element.props.hourCycle
    ? Number(element.props.hourCycle)
    : undefined;
  const size = element.props.size as string | undefined;
  const remountKey = `${element.id}-${granularity}-${locale || ""}-${size || ""}`;

  return wrapWithI18n(
    <TimeField
      key={remountKey}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "Time")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      size={
        (element.props.size as "xs" | "sm" | "md" | "lg" | "xl") || undefined
      }
      variant={String(element.props.variant || "default")}
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      necessityIndicator={
        element.props.necessityIndicator as "icon" | "label" | undefined
      }
      labelPosition={(element.props.labelPosition as "top" | "side") || "top"}
      name={element.props.name ? String(element.props.name) : undefined}
      defaultValue={new Time(9, 0)}
      granularity={granularity}
      hourCycle={hourCycle as 12 | 24 | undefined}
      onChange={(time) => {
        const updatedProps = {
          ...element.props,
          value: time,
        };
        updateElementProps(element.id, updatedProps);
      }}
    />,
    locale,
  );
};
