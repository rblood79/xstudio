/**
 * CalendarGrid Component Spec
 *
 * Calendar compound 컴포넌트의 child 요소
 * 요일 헤더 + 날짜 셀 그리드 렌더링
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * CalendarGrid Props
 */
export interface CalendarGridProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  defaultToday?: boolean;
  /** 1일의 요일 오프셋 (0=Sun, 1=Mon, ..., 6=Sat) */
  dayOffset?: number;
  /** 해당 월 총 일수 */
  totalDays?: number;
  /** 오늘 날짜 (일), 해당 월이 아니면 -1 */
  todayDate?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 치수 (Calendar와 동기화) */
const CALENDAR_GRID_DIMS: Record<string, {
  fontSize: number;
  iconSize: number;
  gap: number;
}> = {
  sm: { fontSize: 12, iconSize: 24, gap: 4 },
  md: { fontSize: 14, iconSize: 28, gap: 6 },
  lg: { fontSize: 16, iconSize: 32, gap: 8 },
};

/**
 * CalendarGrid Component Spec
 */
export const CalendarGridSpec: ComponentSpec<CalendarGridProps> = {
  name: 'CalendarGrid',
  description: 'Calendar 요일 헤더 + 날짜 셀 그리드',
  element: 'table',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
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
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const sizeName = props.size ?? 'md';
      const dims = CALENDAR_GRID_DIMS[sizeName] ?? CALENDAR_GRID_DIMS.md;
      const rawFontSize = size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize = typeof resolvedFs === 'number' ? resolvedFs : dims.fontSize;
      const cellSize = dims.iconSize + 4;
      const gap = dims.gap;
      const ff = fontFamily.sans;

      // 요일 헤더
      const weekdayY = cellSize / 2;
      const gridStartY = cellSize; // 요일 행 바로 아래 (standalone Calendar와 동일)

      // props에서 현재 월 데이터 수신, 없으면 현재 월로 fallback
      const now = new Date();
      const dayOffset = props.dayOffset ?? new Date(now.getFullYear(), now.getMonth(), 1).getDay();
      const totalDays = props.totalDays ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const showToday = props.defaultToday !== false;
      const today = showToday ? (props.todayDate ?? now.getDate()) : -1;

      const shapes: Shape[] = [];

      // 요일 헤더 (Su ~ Sa)
      const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      for (let col = 0; col < 7; col++) {
        const cellLeft = col * (cellSize + gap);
        shapes.push({
          type: 'text' as const,
          x: cellLeft,
          y: weekdayY,
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
        const cellLeft = col * (cellSize + gap);
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

    react: (_props) => ({
      role: 'grid',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: 'default',
    }),
  },
};
