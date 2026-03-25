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

  const getPageBehavior = () => {
    const pb = element.props.pageBehavior;
    return pb === "visible" || pb === "single" ? pb : "visible";
  };

  const locale = element.props.locale as string | undefined;
  const calendarSystem = element.props.calendarSystem as string | undefined;
  const visibleMonths = Number(element.props.visibleMonths) || 1;
  const size = element.props.size as string | undefined;
  const variant = element.props.variant as string | undefined;
  // locale/calendarSystem/size 변경 시 리마운트 (defaultValue 재적용)
  const remountKey = `${element.id}-${locale || ""}-${calendarSystem || ""}-${size || ""}`;

  return (
    <Calendar
      key={remountKey}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      variant={(variant as "default" | "accent") || "default"}
      size={(size as "sm" | "md" | "lg") || "md"}
      locale={locale}
      calendarSystem={calendarSystem}
      aria-label={
        typeof element.props["aria-label"] === "string"
          ? element.props["aria-label"]
          : "Calendar"
      }
      isDisabled={Boolean(element.props.isDisabled)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      visibleMonths={visibleMonths}
      pageBehavior={getPageBehavior() as "visible" | "single"}
      defaultToday={element.props.defaultToday === true}
      minValue={element.props.minValue as string | undefined}
      maxValue={element.props.maxValue as string | undefined}
      defaultValue={element.props.defaultValue as string | undefined}
      defaultFocusedValue={
        element.props.defaultFocusedValue as string | undefined
      }
      autoFocus={Boolean(element.props.autoFocus)}
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

  const getCalendarIconPosition = () => {
    const cip = element.props.calendarIconPosition;
    return cip === "left" || cip === "right" ? cip : "right";
  };

  const locale = element.props.locale as string | undefined;
  const calendarSystem = element.props.calendarSystem as string | undefined;
  const size = element.props.size as string | undefined;
  const variant = element.props.variant as string | undefined;
  // locale/calendarSystem/size 변경 시 리마운트 (defaultValue 재적용)
  const remountKey = `${element.id}-${locale || ""}-${calendarSystem || ""}-${size || ""}`;

  return (
    <DatePicker
      key={remountKey}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      variant={(variant as "default" | "accent") || "default"}
      size={(size as "sm" | "md" | "lg") || "md"}
      locale={locale}
      calendarSystem={calendarSystem}
      label={String(element.props.label || "Date Picker")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={
        typeof element.props.placeholderValue === "string"
          ? element.props.placeholderValue
          : typeof element.props.placeholder === "string"
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
      form={element.props.form ? String(element.props.form) : undefined}
      autoComplete={
        element.props.autoComplete
          ? String(element.props.autoComplete)
          : undefined
      }
      validationBehavior={
        (element.props.validationBehavior as "native" | "aria") || undefined
      }
      defaultValue={element.props.defaultValue as string | undefined}
      defaultToday={element.props.defaultToday === true}
      minValue={element.props.minValue as string | undefined}
      maxValue={element.props.maxValue as string | undefined}
      hideTimeZone={Boolean(element.props.hideTimeZone)}
      granularity={getGranularity() as "day" | "hour" | "minute" | "second"}
      pageBehavior={
        (element.props.pageBehavior as "visible" | "single") || undefined
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

  const getCalendarIconPosition = () => {
    const cip = element.props.calendarIconPosition;
    return cip === "left" || cip === "right" ? cip : "right";
  };

  const locale = element.props.locale as string | undefined;
  const calendarSystem = element.props.calendarSystem as string | undefined;
  const size = element.props.size as string | undefined;
  // locale/calendarSystem/size 변경 시 리마운트 (defaultValue 재적용)
  const remountKey = `${element.id}-${locale || ""}-${calendarSystem || ""}-${size || ""}`;

  return (
    <DateRangePicker
      key={remountKey}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      variant={(element.props.variant as "default" | "accent") || "default"}
      size={(size as "sm" | "md" | "lg") || "md"}
      label={String(element.props.label || "Date Range Picker")}
      description={String(element.props.description || "")}
      errorMessage={String(element.props.errorMessage || "")}
      placeholder={
        typeof element.props.placeholderValue === "string"
          ? element.props.placeholderValue
          : typeof element.props.placeholder === "string"
            ? element.props.placeholder
            : undefined
      }
      locale={locale}
      calendarSystem={calendarSystem}
      isDisabled={Boolean(element.props.isDisabled)}
      isRequired={Boolean(element.props.isRequired)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      isInvalid={Boolean(element.props.isInvalid)}
      necessityIndicator={
        element.props.necessityIndicator as "icon" | "label" | undefined
      }
      defaultValue={undefined}
      minValue={element.props.minValue as string | undefined}
      maxValue={element.props.maxValue as string | undefined}
      defaultToday={element.props.defaultToday === true}
      hideTimeZone={Boolean(element.props.hideTimeZone)}
      granularity={getGranularity() as "day" | "hour" | "minute" | "second"}
      hourCycle={
        element.props.hourCycle
          ? (Number(element.props.hourCycle) as 12 | 24)
          : undefined
      }
      pageBehavior={
        (element.props.pageBehavior as "visible" | "single") || undefined
      }
      startName={
        element.props.startName ? String(element.props.startName) : undefined
      }
      endName={
        element.props.endName ? String(element.props.endName) : undefined
      }
      validationBehavior={
        (element.props.validationBehavior as "native" | "aria") || undefined
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
      autoFocus={Boolean(element.props.autoFocus)}
      hideTimeZone={Boolean(element.props.hideTimeZone)}
      shouldForceLeadingZeros={Boolean(element.props.shouldForceLeadingZeros)}
      minValue={element.props.minValue as string | undefined}
      maxValue={element.props.maxValue as string | undefined}
      validationBehavior={
        (element.props.validationBehavior as "native" | "aria") || undefined
      }
      placeholderValue={element.props.placeholderValue as string | undefined}
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
      autoFocus={Boolean(element.props.autoFocus)}
      hideTimeZone={Boolean(element.props.hideTimeZone)}
      shouldForceLeadingZeros={Boolean(element.props.shouldForceLeadingZeros)}
      validationBehavior={
        (element.props.validationBehavior as "native" | "aria") || undefined
      }
      placeholderValue={element.props.placeholderValue as string | undefined}
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
