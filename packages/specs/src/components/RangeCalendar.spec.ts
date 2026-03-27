/**
 * RangeCalendar Component Spec
 *
 * Calendar Spec 기반 — 날짜 범위 선택용 캘린더
 * CalendarSpec과 동일한 렌더링 구조 (CalendarHeader + CalendarGrid 자식)
 */

import type { ComponentSpec } from "../types";
import { CalendarSpec, type CalendarProps } from "./Calendar.spec";

/**
 * RangeCalendar Props — Calendar와 동일 + 범위 전용 props
 */
export interface RangeCalendarProps extends CalendarProps {
  allowsNonContiguousRanges?: boolean;
  visibleMonths?: number;
}

/**
 * RangeCalendar Component Spec
 *
 * Calendar Spec을 기반으로 하되, properties와 propagation은 RangeCalendar 전용으로 정의
 */
export const RangeCalendarSpec: ComponentSpec<RangeCalendarProps> = {
  ...CalendarSpec,
  name: "RangeCalendar",
  description: "React Aria 기반 범위 선택 캘린더",

  propagation: {
    rules: [
      { parentProp: "variant", childPath: "CalendarHeader" },
      { parentProp: "variant", childPath: "CalendarGrid" },
      { parentProp: "size", childPath: "CalendarHeader" },
      { parentProp: "size", childPath: "CalendarGrid" },
      { parentProp: "locale", childPath: "CalendarHeader" },
      { parentProp: "locale", childPath: "CalendarGrid" },
      { parentProp: "calendarSystem", childPath: "CalendarHeader" },
      { parentProp: "calendarSystem", childPath: "CalendarGrid" },
    ],
  },

  properties: {
    sections: [
      {
        title: "Design",
        fields: [{ type: "variant" }, { type: "size" }],
      },
      {
        title: "State",
        fields: [
          {
            key: "locale",
            type: "enum",
            label: "Locale",
            emptyToUndefined: true,
            options: [
              { value: "", label: "Auto" },
              { value: "ko-KR", label: "한국어" },
              { value: "en-US", label: "English (US)" },
              { value: "en-GB", label: "English (UK)" },
              { value: "ja-JP", label: "日本語" },
              { value: "zh-CN", label: "中文" },
              { value: "de-DE", label: "Deutsch" },
              { value: "fr-FR", label: "Français" },
            ],
          },
          {
            key: "calendarSystem",
            type: "enum",
            label: "Calendar System",
            emptyToUndefined: true,
            options: [
              { value: "", label: "Default" },
              { value: "buddhist", label: "Buddhist" },
              { value: "hebrew", label: "Hebrew" },
              { value: "islamic-civil", label: "Islamic (Civil)" },
              { value: "persian", label: "Persian" },
            ],
          },
          {
            key: "visibleMonths",
            type: "enum",
            label: "Visible Months",
            valueTransform: "number" as const,
            options: [
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ],
          },
          {
            key: "minValue",
            type: "string",
            label: "Min Value",
            placeholder: "2024-01-01",
          },
          {
            key: "maxValue",
            type: "string",
            label: "Max Value",
            placeholder: "2024-12-31",
          },
          { key: "errorMessage", type: "string", label: "Error Message" },
        ],
      },
      {
        title: "Behavior",
        fields: [
          { key: "isDisabled", type: "boolean" },
          { key: "isReadOnly", type: "boolean" },
          {
            key: "allowsNonContiguousRanges",
            type: "boolean",
            label: "Allow Non-Contiguous Ranges",
          },
        ],
      },
    ],
  },
};
