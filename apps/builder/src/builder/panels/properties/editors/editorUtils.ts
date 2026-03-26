/**
 * Property Editor 공유 유틸리티
 *
 * 여러 에디터에서 반복되는 로직을 중앙화하여 중복 제거
 */

import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import type { Element } from "../../../../types/core/store.types";

/** Necessity Indicator 선택 옵션 (Required select용) */
export const NECESSITY_INDICATOR_OPTIONS = [
  { value: "", label: "None" },
  { value: "icon", label: "Icon (*)" },
  { value: "label", label: "Label (required/optional)" },
] as const;

/** Label Position 선택 옵션 */
export const LABEL_POSITION_OPTIONS = [
  { value: "top", label: PROPERTY_LABELS.LABEL_POSITION_TOP },
  { value: "side", label: PROPERTY_LABELS.LABEL_POSITION_SIDE },
] as const;

/** Label Align 선택 옵션 */
export const LABEL_ALIGN_OPTIONS = [
  { value: "start", label: PROPERTY_LABELS.ALIGN_LEFT },
  { value: "center", label: PROPERTY_LABELS.ALIGN_CENTER },
  { value: "end", label: PROPERTY_LABELS.ALIGN_RIGHT },
] as const;

/** Static Color 선택 옵션 */
export const STATIC_COLOR_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
] as const;

/** Link/Form Target 선택 옵션 */
export const LINK_TARGET_OPTIONS = [
  { value: "", label: PROPERTY_LABELS.TARGET_NONE },
  { value: "_self", label: PROPERTY_LABELS.TARGET_SELF },
  { value: "_blank", label: PROPERTY_LABELS.TARGET_BLANK },
  { value: "_parent", label: PROPERTY_LABELS.TARGET_PARENT },
  { value: "_top", label: PROPERTY_LABELS.TARGET_TOP },
] as const;

/** ColorField 채널 선택 옵션 */
export const COLOR_CHANNEL_OPTIONS = [
  { value: "", label: "Default (Hex)" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "lightness", label: "Lightness" },
  { value: "brightness", label: "Brightness" },
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "alpha", label: "Alpha" },
] as const;

/**
 * Required + NecessityIndicator 통합 업데이트 생성
 * None → isRequired: false + necessityIndicator 제거
 * icon/label → isRequired: true + necessityIndicator 설정
 */
export function buildRequiredUpdate(value: string): Record<string, unknown> {
  if (value === "") {
    return { isRequired: false, necessityIndicator: undefined };
  }
  return { isRequired: true, necessityIndicator: value };
}

// ── DatePicker / DateRangePicker 공유 ────────────────────────────────────

/** DatePicker/DateRangePicker 자식 동기화 키 */
export const DATE_PICKER_SYNC_KEYS = new Set([
  "variant",
  "size",
  "locale",
  "calendarSystem",
  "defaultToday",
]);

/** 재귀적 자식 동기화 (Calendar → CalendarHeader/CalendarGrid 전파) */
export function syncDatePickerChildren(
  state: {
    childrenMap: Map<string, Element[]>;
    elementsMap: Map<string, Element>;
    updateElement: (id: string, updates: Partial<Element>) => void;
  },
  children: Element[],
  key: string,
  value: unknown,
): void {
  for (const child of children) {
    // defaultToday는 CalendarGrid에만 적용
    if (key === "defaultToday" && child.tag !== "CalendarGrid") {
      const grandChildren = state.childrenMap.get(child.id) ?? [];
      syncDatePickerChildren(state, grandChildren, key, value);
      continue;
    }
    // Label은 size/variant만 동기화
    if (child.tag === "Label" && key !== "size" && key !== "variant") continue;

    const freshProps = state.elementsMap.get(child.id)?.props ?? child.props;
    state.updateElement(child.id, {
      props: { ...freshProps, [key]: value },
    });

    // Calendar의 자식(CalendarHeader/CalendarGrid)에도 전파
    if (child.tag === "Calendar") {
      const grandChildren = state.childrenMap.get(child.id) ?? [];
      syncDatePickerChildren(state, grandChildren, key, value);
    }
  }
}

/** Label 자식의 children 텍스트 동기화 */
export function syncLabelChild(
  state: {
    elementsMap: Map<string, Element>;
    updateElement: (id: string, updates: Partial<Element>) => void;
  },
  children: Element[],
  value: unknown,
): void {
  const labelChild = children.find((c) => c.tag === "Label");
  if (labelChild) {
    const freshProps =
      state.elementsMap.get(labelChild.id)?.props ?? labelChild.props;
    state.updateElement(labelChild.id, {
      props: { ...freshProps, children: value },
    });
  }
}

/** Locale 선택 옵션 */
export const LOCALE_OPTIONS = [
  { value: "", label: "Default (Browser)" },
  { value: "ko-KR", label: "한국어 (ko-KR)" },
  { value: "en-US", label: "English (en-US)" },
  { value: "en-GB", label: "English (en-GB)" },
  { value: "ja-JP", label: "日本語 (ja-JP)" },
  { value: "zh-CN", label: "中文 (zh-CN)" },
  { value: "zh-TW", label: "中文 (zh-TW)" },
  { value: "de-DE", label: "Deutsch (de-DE)" },
  { value: "fr-FR", label: "Français (fr-FR)" },
  { value: "es-ES", label: "Español (es-ES)" },
  { value: "pt-BR", label: "Português (pt-BR)" },
  { value: "ar-SA", label: "العربية (ar-SA)" },
] as const;

/** Calendar System 선택 옵션 */
export const CALENDAR_SYSTEM_OPTIONS = [
  { value: "", label: "Default (Gregorian)" },
  { value: "buddhist", label: "Buddhist" },
  { value: "hebrew", label: "Hebrew" },
  { value: "indian", label: "Indian" },
  { value: "islamic-civil", label: "Islamic (Civil)" },
  { value: "islamic-umalqura", label: "Islamic (Umm al-Qura)" },
  { value: "japanese", label: "Japanese" },
  { value: "persian", label: "Persian" },
  { value: "roc", label: "Taiwan (ROC)" },
  { value: "coptic", label: "Coptic" },
  { value: "ethiopic", label: "Ethiopic" },
] as const;

/** Granularity 선택 옵션 */
export const GRANULARITY_OPTIONS = [
  { value: "", label: "Date Only" },
  { value: "hour", label: "Hour" },
  { value: "minute", label: "Minute" },
  { value: "second", label: "Second" },
] as const;

/** Hour Cycle 선택 옵션 */
export const HOUR_CYCLE_OPTIONS = [
  { value: "", label: "Default (Locale)" },
  { value: "12", label: "12 Hour" },
  { value: "24", label: "24 Hour" },
] as const;

/** Page Behavior 선택 옵션 */
export const PAGE_BEHAVIOR_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "single", label: "Single" },
] as const;

/** Validation Behavior 선택 옵션 */
export const VALIDATION_BEHAVIOR_OPTIONS = [
  { value: "native", label: "Native" },
  { value: "aria", label: "ARIA" },
] as const;
