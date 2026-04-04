/**
 * Calendar Component Spec
 *
 * React Aria 기반 캘린더 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import {
  Globe,
  Hash,
  AlertTriangle,
  PointerOff,
  PenOff,
  Focus,
  ToggleLeft,
  ArrowLeftRight,
} from "lucide-react";
import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Calendar Props
 */
export interface CalendarProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  value?: string;
  locale?: string;
  calendarSystem?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Calendar Component Spec
 *
 * height: 0 = auto (그리드 행 수에 따라 결정)
 */
export const CalendarSpec: ComponentSpec<CalendarProps> = {
  name: "Calendar",
  description: "React Aria 기반 캘린더 (월 그리드 + 네비게이션)",
  archetype: "calendar",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 4,
      paddingY: 4,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 20,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 26,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 32,
      gap: 8,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  propagation: {
    rules: [
      { parentProp: "variant", childPath: "CalendarHeader" },
      { parentProp: "variant", childPath: "CalendarGrid" },
      { parentProp: "size", childPath: "CalendarHeader", override: true },
      { parentProp: "size", childPath: "CalendarGrid", override: true },
      { parentProp: "locale", childPath: "CalendarHeader" },
      { parentProp: "locale", childPath: "CalendarGrid" },
      { parentProp: "calendarSystem", childPath: "CalendarHeader" },
      { parentProp: "calendarSystem", childPath: "CalendarGrid" },
      { parentProp: "defaultToday", childPath: "CalendarGrid" },
    ],
  },

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [{ type: "variant" }, { type: "size" }],
      },
      {
        title: "Locale",
        fields: [
          {
            key: "locale",
            type: "enum",
            label: "Locale",
            icon: Globe,
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
            icon: Globe,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Default" },
              { value: "buddhist", label: "Buddhist" },
              { value: "hebrew", label: "Hebrew" },
              { value: "islamic-civil", label: "Islamic (Civil)" },
              { value: "persian", label: "Persian" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "defaultToday",
            type: "boolean",
            label: "Default to Today",
            icon: ToggleLeft,
          },
          { key: "minValue", type: "string", label: "Min Value", icon: Hash },
          { key: "maxValue", type: "string", label: "Max Value", icon: Hash },
          {
            key: "defaultValue",
            type: "string",
            label: "Default Value",
            icon: Hash,
          },
          {
            key: "defaultFocusedValue",
            type: "string",
            label: "Default Focused Value",
            icon: Hash,
          },
          { key: "isInvalid", type: "boolean", icon: AlertTriangle },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
          },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
          { key: "isReadOnly", type: "boolean", icon: PenOff },
          { key: "autoFocus", type: "boolean", icon: Focus },
          {
            key: "pageBehavior",
            type: "enum",
            label: "Page Behavior",
            icon: ArrowLeftRight,
            options: [
              { value: "visible", label: "Visible" },
              { value: "single", label: "Single" },
            ],
           defaultValue: "visible" },
          {
            key: "visibleMonths",
            type: "enum",
            label: "Visible Months",
            icon: Hash,
            valueTransform: "number",
            options: [
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ],
           defaultValue: "1" },
        ],
      },
    ],
  },

  render: {
    shapes: (_props, variant, size, state = "default") => {
      const borderRadius = size.borderRadius;
      const cellSize = (size.iconSize ?? 28) + 4;
      const gap = (size.gap as unknown as number) || 6;
      const paddingX = (size.paddingX as unknown as number) || 8;
      const paddingY = (size.paddingY as unknown as number) || 8;
      const rawFontSize = size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
      const calendarWidth = cellSize * 7 + gap * 6 + paddingX * 2;
      const ff = fontFamily.sans;

      // Phase C: 캘린더 헤더 + 요일 + 날짜 셀 생성
      const headerHeight = cellSize; // 버튼 높이와 동일 (sm:24, md:30, lg:36)
      const navRowY = paddingY;
      const weekdayY = navRowY + headerHeight + gap;
      const gridStartY = weekdayY + cellSize;

      // January 2024: starts on Monday (dayOffset=1), 31 days
      const dayOffset = 1; // 0=Sun, 1=Mon
      const totalDays = 31;
      const today = 15; // 선택/today 표시용 예시

      const totalRows = Math.ceil((totalDays + dayOffset) / 7);
      const totalHeight =
        gridStartY + totalRows * (cellSize + gap) - gap + paddingY;

      // Compositional Architecture: 자식이 있으면 shell(bg+border)만 반환
      const hasChildren = !!(_props as Record<string, unknown>)._hasChildren;

      const shapes: Shape[] = [
        // 배경 — Card 패턴: hasChildren 시 'auto'(element bounds), standalone 시 계산값
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: hasChildren ? ("auto" as unknown as number) : calendarWidth,
          height: hasChildren ? ("auto" as unknown as number) : totalHeight,
          radius: borderRadius as unknown as number,
          fill: resolveStateColors(variant, state).background,
        },
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth: 1,
          color: variant.border ?? ("{color.border}" as TokenRef),
          radius: borderRadius as unknown as number,
        },
      ];

      if (hasChildren) return shapes;

      // Standalone mode: nav + month text 추가
      shapes.push(
        // 네비게이션: 이전 화살표
        {
          type: "icon_font" as const,
          iconName: "chevron-left",
          x: paddingX + cellSize / 2,
          y: navRowY + headerHeight / 2,
          fontSize: fontSize + 2,
          fill: variant.text,
          strokeWidth: 2,
        },
        // 헤더 텍스트 (월/년)
        {
          type: "text" as const,
          x: paddingX + cellSize,
          y: navRowY + headerHeight / 2,
          text: (() => {
            const loc = _props.calendarSystem
              ? `${_props.locale || "en-US"}-u-ca-${_props.calendarSystem}`
              : _props.locale || "ko-KR";
            try {
              return new Intl.DateTimeFormat(loc, {
                year: "numeric",
                month: "long",
              }).format(new Date());
            } catch {
              return "2024년 1월";
            }
          })(),
          fontSize,
          fontFamily: ff,
          fontWeight: 700,
          fill: variant.text,
          align: "center" as const,
          baseline: "middle" as const,
          maxWidth: calendarWidth - (paddingX + cellSize) * 2,
        },
        // 네비게이션: 다음 화살표
        {
          type: "icon_font" as const,
          iconName: "chevron-right",
          x: calendarWidth - paddingX - cellSize / 2,
          y: navRowY + headerHeight / 2,
          fontSize: fontSize + 2,
          fill: variant.text,
          strokeWidth: 2,
        },
      );

      // 요일 헤더 — locale 기반
      const effectiveLocale = _props.calendarSystem
        ? `${_props.locale || "en-US"}-u-ca-${_props.calendarSystem}`
        : _props.locale || "en-US";
      const weekdays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2024, 0, 7 + i); // 2024-01-07 = Sunday
        try {
          return new Intl.DateTimeFormat(effectiveLocale, {
            weekday: "short",
          }).format(d);
        } catch {
          return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][i];
        }
      });
      for (let col = 0; col < 7; col++) {
        const cellLeft = paddingX + col * (cellSize + gap);
        shapes.push({
          type: "text" as const,
          x: cellLeft,
          y: weekdayY + cellSize / 2,
          text: weekdays[col],
          fontSize: fontSize - 2,
          fontFamily: ff,
          fontWeight: 700,
          fill: "{color.neutral-subdued}" as TokenRef,
          align: "center" as const,
          baseline: "middle" as const,
          maxWidth: cellSize,
          whiteSpace: "nowrap" as const,
        });
      }

      // 날짜 셀
      for (let day = 1; day <= totalDays; day++) {
        const idx = day - 1 + dayOffset;
        const row = Math.floor(idx / 7);
        const col = idx % 7;
        const cellLeft = paddingX + col * (cellSize + gap);
        const cx = cellLeft + cellSize / 2;
        const cy = gridStartY + row * (cellSize + gap) + cellSize / 2;

        // 날짜 텍스트
        shapes.push({
          type: "text" as const,
          x: cellLeft,
          y: cy,
          text: String(day),
          fontSize,
          fontFamily: ff,
          fontWeight: day === today ? 700 : 400,
          fill: variant.text,
          align: "center" as const,
          baseline: "middle" as const,
          maxWidth: cellSize,
          whiteSpace: "nowrap" as const,
        });

        // today indicator dot (S2 패턴: 하단 4px 원형)
        if (day === today) {
          shapes.push({
            type: "circle" as const,
            x: cx,
            y: cy + cellSize / 2 - 4,
            radius: 3,
            fill: "{color.accent}" as TokenRef,
          });
        }
      }

      return shapes;
    },

    react: (props) => ({
      role: "grid",
      "aria-readonly": props.isReadOnly || undefined,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: "pointer",
    }),
  },
};
