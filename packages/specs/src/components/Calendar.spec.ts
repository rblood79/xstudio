/**
 * Calendar Component Spec
 *
 * Material Design 3 기반 캘린더 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * Calendar Props
 */
export interface CalendarProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
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
  name: 'Calendar',
  description: 'Material Design 3 기반 캘린더 (월 그리드 + 네비게이션)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 24,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 28,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 32,
      gap: 8,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (_props, variant, size, state = 'default') => {
      const borderRadius = size.borderRadius;
      const cellSize = (size.iconSize ?? 28) + 4;
      const gap = size.gap as unknown as number || 6;
      const paddingX = size.paddingX as unknown as number || 12;
      const paddingY = size.paddingY as unknown as number || 12;
      const fontSize = size.fontSize as unknown as number || 14;
      const calendarWidth = cellSize * 7 + gap * 6 + paddingX * 2;
      const ff = fontFamily.sans;

      // Phase C: 캘린더 헤더 + 요일 + 날짜 셀 생성
      const headerHeight = fontSize + 8;
      const navRowY = paddingY;
      const weekdayY = navRowY + headerHeight + gap;
      const gridStartY = weekdayY + cellSize;

      // January 2024: starts on Monday (dayOffset=1), 31 days
      const dayOffset = 1; // 0=Sun, 1=Mon
      const totalDays = 31;
      const today = 15; // 선택/today 표시용 예시

      const totalRows = Math.ceil((totalDays + dayOffset) / 7);
      const totalHeight = gridStartY + totalRows * (cellSize + gap) - gap + paddingY;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: calendarWidth,
          height: totalHeight,
          radius: borderRadius as unknown as number,
          fill: resolveStateColors(variant, state).background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border ?? ('{color.outline-variant}' as TokenRef),
          radius: borderRadius as unknown as number,
        },
        // 네비게이션: 이전 화살표
        {
          type: 'icon_font' as const,
          iconName: 'chevron-left',
          x: paddingX + cellSize / 2,
          y: navRowY + headerHeight / 2,
          fontSize: fontSize + 2,
          fill: variant.text,
          strokeWidth: 2,
        },
        // 헤더 텍스트 (월/년)
        {
          type: 'text' as const,
          x: paddingX + cellSize,
          y: navRowY + headerHeight / 2,
          text: 'January 2024',
          fontSize,
          fontFamily: ff,
          fontWeight: 600,
          fill: variant.text,
          align: 'center' as const,
          baseline: 'middle' as const,
          maxWidth: calendarWidth - (paddingX + cellSize) * 2,
        },
        // 네비게이션: 다음 화살표
        {
          type: 'icon_font' as const,
          iconName: 'chevron-right',
          x: calendarWidth - paddingX - cellSize / 2,
          y: navRowY + headerHeight / 2,
          fontSize: fontSize + 2,
          fill: variant.text,
          strokeWidth: 2,
        },
      ];

      const hasChildren = !!(_props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 요일 헤더 (Sun ~ Sat)
      const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      for (let col = 0; col < 7; col++) {
        const cellLeft = paddingX + col * (cellSize + gap);
        shapes.push({
          type: 'text' as const,
          x: cellLeft,
          y: weekdayY + cellSize / 2,
          text: weekdays[col],
          fontSize: fontSize - 2,
          fontFamily: ff,
          fontWeight: 500,
          fill: '{color.on-surface-variant}' as TokenRef,
          align: 'center' as const,
          baseline: 'middle' as const,
          maxWidth: cellSize,
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

        // today 강조 배경
        if (day === today) {
          shapes.push({
            type: 'circle' as const,
            x: cx,
            y: cy,
            radius: cellSize / 2,
            fill: '{color.primary}' as TokenRef,
          });
        }

        shapes.push({
          type: 'text' as const,
          x: cellLeft,
          y: cy,
          text: String(day),
          fontSize,
          fontFamily: ff,
          fontWeight: day === today ? 600 : 400,
          fill: day === today ? ('{color.on-primary}' as TokenRef) : variant.text,
          align: 'center' as const,
          baseline: 'middle' as const,
          maxWidth: cellSize,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: 'grid',
      'aria-readonly': props.isReadOnly || undefined,
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: 'pointer',
    }),
  },
};
