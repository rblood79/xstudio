import { ElementProps } from "../../../types/supabase";

/**
 * Props 변환 유틸리티
 * React Aria 컴포넌트에 맞는 props로 변환
 */

/**
 * 공통 props 추출
 */
export const extractCommonProps = (props: ElementProps, elementId: string) => {
  return {
    key: elementId,
    "data-element-id": elementId,
    style: props.style,
    className: props.className,
  };
};

/**
 * Boolean props 안전 변환
 */
export const toBoolean = (value: unknown): boolean => {
  return Boolean(value);
};

/**
 * String props 안전 변환
 */
export const toString = (value: unknown, defaultValue = ""): string => {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

/**
 * Number props 안전 변환
 */
export const toNumber = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Array props 안전 변환
 */
export const toArray = <T>(value: unknown, defaultValue: T[] = []): T[] => {
  if (Array.isArray(value)) return value as T[];
  return defaultValue;
};

/**
 * Orientation 타입 변환
 */
export const toOrientation = (
  value: unknown
): "horizontal" | "vertical" | undefined => {
  if (value === "horizontal" || value === "vertical") return value;
  return undefined;
};

/**
 * SelectionMode 타입 변환
 */
export const toSelectionMode = (
  value: unknown
): "none" | "single" | "multiple" | undefined => {
  if (value === "none" || value === "single" || value === "multiple")
    return value;
  return undefined;
};

/**
 * HTML 요소에서 React Aria 전용 props 제거
 */
export const cleanPropsForHTML = (
  props: Record<string, unknown>
): Record<string, unknown> => {
  const cleanProps = { ...props };

  const propsToRemove = [
    "isDisabled",
    "isSelected",
    "isIndeterminate",
    "isRequired",
    "isReadOnly",
    "isInvalid",
    "onPress",
    "onHoverStart",
    "onHoverEnd",
    "selectionMode",
    "selectionBehavior",
    "orientation",
    "variant",
    "size",
    "isQuiet",
    "isFocused",
    "allowsRemoving",
    "textValue",
    "selectedKeys",
    "defaultSelectedKey",
    "allowsCustomValue",
    "granularity",
    "firstDayOfWeek",
    "calendarIconPosition",
    "showCalendarIcon",
    "showWeekNumbers",
    "highlightToday",
    "allowClear",
    "shouldForceLeadingZeros",
    "shouldCloseOnSelect",
    "includeTime",
    "timeFormat",
    "timeLabel",
    "startTimeLabel",
    "endTimeLabel",
    "allowsNonContiguousRanges",
    "visibleDuration",
    "pageBehavior",
    "disallowEmptySelection",
    "text",
    "children",
    "events",
    "label",
    "description",
    "errorMessage",
    "placeholder",
    "value",
    "defaultValue",
    "minValue",
    "maxValue",
    "step",
    "expandedKeys",
    "defaultSelectedKeys",
    "disabledKeys",
    "autoFocus",
    "onSelectionChange",
    "onChange",
    "onInputChange",
    "onExpandedChange",
    "onRemove",
    "items",
    "hasChildren",
    "showInfoButton",
    "childItems",
    "title",
    "as",
  ];

  propsToRemove.forEach((prop) => {
    if (prop in cleanProps) {
      delete cleanProps[prop];
    }
  });

  // isDisabled를 disabled로 변환
  if (props.isDisabled) {
    cleanProps.disabled = true;
  }

  return cleanProps;
};
