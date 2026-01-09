/**
 * PixiDateRangePicker - WebGL Date Range Picker Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Two DateFields + Dual Calendar
 *
 * CSS 동기화:
 * - getDateRangePickerSizePreset(): fieldHeight, calendarWidth, separatorWidth
 * - getDateRangePickerColorPreset(): fieldBackgroundColor, rangeBgColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getDateRangePickerSizePreset,
  getCalendarSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiDateRangePickerProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * PixiDateRangePicker - Dual date fields with calendar range selection
 */
export function PixiDateRangePicker({
  element,
  isSelected = false,
  onClick,
}: PixiDateRangePickerProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const startValue = (props.startValue as string) || (props.start as string) || '';
  const endValue = (props.endValue as string) || (props.end as string) || '';
  const isOpen = (props.isOpen as boolean) ?? true;

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // Get presets from CSS
  const sizePreset = useMemo(() => getDateRangePickerSizePreset(size), [size]);
  const calendarSizePreset = useMemo(() => getCalendarSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    fieldBackgroundColor: 0xffffff,
    fieldBorderColor: 0xd1d5db,
    focusBorderColor: variantColors.bg,
    fieldTextColor: variantColors.text,
    fieldPlaceholderColor: 0x9ca3af,
    separatorColor: 0x6b7280,
    popoverBorderColor: 0xd1d5db,
    rangeBgColor: (variantColors.bg & 0xffffff) | 0x20000000, // 12.5% opacity approximation
  }), [variantColors]);

  // 캘린더 색상 프리셋 (테마 색상 적용)
  const calendarColorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    textColor: variantColors.text,
    weekdayColor: 0x6b7280,
    selectedBgColor: variantColors.bg,
    selectedTextColor: 0xffffff,
    todayBorderColor: variantColors.bg,
    outsideMonthColor: 0x9ca3af,
  }), [variantColors]);

  // State
  const today = useMemo(() => new Date(), []);
  const displayYear = today.getFullYear();
  const displayMonth = today.getMonth();

  // Parse dates
  const startDate = useMemo(() => {
    if (!startValue) return null;
    const parts = startValue.split('-');
    return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1, day: parseInt(parts[2]) };
  }, [startValue]);

  const endDate = useMemo(() => {
    if (!endValue) return null;
    const parts = endValue.split('-');
    return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1, day: parseInt(parts[2]) };
  }, [endValue]);

  // Display texts
  const startText = startDate ? `${MONTHS_SHORT[startDate.month]} ${startDate.day}` : 'Start';
  const endText = endDate ? `${MONTHS_SHORT[endDate.month]} ${endDate.day}` : 'End';

  // Calculate dimensions
  const fieldWidth = (sizePreset.calendarWidth - sizePreset.separatorWidth) / 2 - sizePreset.gap;
  const totalFieldWidth = fieldWidth * 2 + sizePreset.separatorWidth + sizePreset.gap * 2;

  const calendarCellSize = sizePreset.calendarCellSize;
  const singleCalendarWidth = calendarCellSize * 7 + calendarSizePreset.gap * 6 + calendarSizePreset.padding * 2;
  const calendarHeaderHeight = calendarSizePreset.buttonSize + calendarSizePreset.gap;
  const calendarWeekdayHeight = calendarSizePreset.fontSize + calendarSizePreset.gap;
  const calendarGridHeight = calendarCellSize * 5 + calendarSizePreset.gap * 4;
  const calendarHeight = calendarSizePreset.padding * 2 + calendarHeaderHeight + calendarWeekdayHeight + calendarGridHeight;

  // Get days for both months
  const getDaysInMonth = useCallback((year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isStart: boolean; isEnd: boolean; isInRange: boolean }> = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDate - i, isCurrentMonth: false, isToday: false, isStart: false, isEnd: false, isInRange: false });
    }

    for (let day = 1; day <= lastDate; day++) {
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isStart = startDate && day === startDate.day && month === startDate.month && year === startDate.year;
      const isEnd = endDate && day === endDate.day && month === endDate.month && year === endDate.year;

      let isInRange = false;
      if (startDate && endDate) {
        const currentDate = new Date(year, month, day);
        const start = new Date(startDate.year, startDate.month, startDate.day);
        const end = new Date(endDate.year, endDate.month, endDate.day);
        isInRange = currentDate > start && currentDate < end;
      }

      days.push({ day, isCurrentMonth: true, isToday, isStart: !!isStart, isEnd: !!isEnd, isInRange });
    }

    const remaining = 35 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false, isStart: false, isEnd: false, isInRange: false });
    }

    return days;
  }, [today, startDate, endDate]);

  const leftMonthDays = useMemo(() => getDaysInMonth(displayYear, displayMonth), [displayYear, displayMonth, getDaysInMonth]);
  const rightMonth = displayMonth === 11 ? 0 : displayMonth + 1;
  const rightYear = displayMonth === 11 ? displayYear + 1 : displayYear;
  const rightMonthDays = useMemo(() => getDaysInMonth(rightYear, rightMonth), [rightYear, rightMonth, getDaysInMonth]);

  // Draw field
  const drawField = useCallback(
    (g: PixiGraphics, width: number) => {
      g.clear();
      g.roundRect(0, 0, width, sizePreset.fieldHeight, sizePreset.fieldBorderRadius);
      g.fill({ color: colorPreset.fieldBackgroundColor });
      g.stroke({ color: isSelected ? colorPreset.focusBorderColor : colorPreset.fieldBorderColor, width: 1 });
    },
    [sizePreset, colorPreset, isSelected]
  );

  // Draw calendar
  const drawCalendar = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, singleCalendarWidth * 2 + sizePreset.gap, calendarHeight, calendarSizePreset.borderRadius);
      g.fill({ color: calendarColorPreset.backgroundColor });
      g.stroke({ color: colorPreset.popoverBorderColor, width: 1 });
    },
    [singleCalendarWidth, calendarHeight, calendarSizePreset, calendarColorPreset, colorPreset, sizePreset]
  );

  // Text styles
  const fieldTextStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fieldFontSize,
      fill: colorPreset.fieldTextColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  const separatorStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fieldFontSize,
      fill: colorPreset.separatorColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  const calendarDayStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: calendarSizePreset.fontSize,
      fill: calendarColorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [calendarSizePreset, calendarColorPreset]
  );

  // Render calendar days
  const renderCalendarDays = (days: typeof leftMonthDays, offsetX: number) => {
    return days.slice(0, 35).map((dayInfo, index) => {
      const col = index % 7;
      const row = Math.floor(index / 7);
      const x = offsetX + calendarSizePreset.padding + col * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2;
      const y = calendarSizePreset.padding + calendarHeaderHeight + calendarWeekdayHeight + row * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2;

      const drawCell = (g: PixiGraphics) => {
        g.clear();

        if (dayInfo.isInRange && dayInfo.isCurrentMonth) {
          g.rect(-calendarCellSize / 2, -calendarCellSize / 2 + 2, calendarCellSize, calendarCellSize - 4);
          g.fill({ color: colorPreset.rangeBgColor });
        }

        if (dayInfo.isStart || dayInfo.isEnd) {
          g.circle(0, 0, calendarCellSize / 2 - 2);
          g.fill({ color: calendarColorPreset.selectedBgColor });
        } else if (dayInfo.isToday) {
          g.circle(0, 0, calendarCellSize / 2 - 2);
          g.stroke({ color: calendarColorPreset.todayBorderColor, width: 2 });
        }
      };

      const textColor = (dayInfo.isStart || dayInfo.isEnd)
        ? calendarColorPreset.selectedTextColor
        : dayInfo.isCurrentMonth
          ? calendarColorPreset.textColor
          : calendarColorPreset.outsideMonthColor;

      return (
        <pixiContainer key={index} x={x} y={y}>
          <pixiGraphics draw={drawCell} />
          <pixiText text={String(dayInfo.day)} style={{ ...calendarDayStyle, fill: textColor }} anchor={0.5} />
        </pixiContainer>
      );
    });
  };

  // 🚀 Phase 12: 필드 행 레이아웃
  const fieldRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: sizePreset.gap,
    position: 'relative' as const,
  }), [sizePreset.gap]);

  // 🚀 Phase 12: 개별 필드 레이아웃
  const singleFieldLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    width: fieldWidth,
    height: sizePreset.fieldHeight,
    paddingLeft: sizePreset.fieldPadding,
    paddingRight: sizePreset.fieldPadding,
    position: 'relative' as const,
  }), [fieldWidth, sizePreset.fieldHeight, sizePreset.fieldPadding]);

  // 🚀 Phase 12: Separator 레이아웃
  const separatorLayout = useMemo(() => ({
    display: 'flex' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: sizePreset.separatorWidth,
    height: sizePreset.fieldHeight,
  }), [sizePreset.separatorWidth, sizePreset.fieldHeight]);

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Fields row */}
      <pixiContainer layout={fieldRowLayout}>
        {/* Start field */}
        <pixiContainer layout={singleFieldLayout}>
          <pixiGraphics
            draw={(g) => drawField(g, fieldWidth)}
            layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          <pixiText text={startText} style={fieldTextStyle} layout={{ isLeaf: true }} />
        </pixiContainer>

        {/* Separator */}
        <pixiContainer layout={separatorLayout}>
          <pixiText text="→" style={separatorStyle} layout={{ isLeaf: true }} />
        </pixiContainer>

        {/* End field */}
        <pixiContainer layout={singleFieldLayout}>
          <pixiGraphics
            draw={(g) => drawField(g, fieldWidth)}
            layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          <pixiText text={endText} style={fieldTextStyle} layout={{ isLeaf: true }} />
        </pixiContainer>

        {/* Selection indicator */}
        {isSelected && (
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.roundRect(-2, -2, totalFieldWidth + 4, sizePreset.fieldHeight + 4, sizePreset.fieldBorderRadius + 2);
              g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
            }}
            layout={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}
      </pixiContainer>

      {/* Dual calendar popup */}
      {isOpen && (
        <pixiContainer y={sizePreset.fieldHeight + sizePreset.gap}>
          <pixiGraphics draw={drawCalendar} />

          {/* Left calendar header */}
          <pixiText
            text={`${MONTHS_SHORT[displayMonth]} ${displayYear}`}
            style={{ ...calendarDayStyle, fontWeight: '600', fontSize: calendarSizePreset.headerFontSize }}
            x={singleCalendarWidth / 2}
            y={calendarSizePreset.padding + calendarSizePreset.buttonSize / 2}
            anchor={0.5}
          />

          {/* Right calendar header */}
          <pixiText
            text={`${MONTHS_SHORT[rightMonth]} ${rightYear}`}
            style={{ ...calendarDayStyle, fontWeight: '600', fontSize: calendarSizePreset.headerFontSize }}
            x={singleCalendarWidth + sizePreset.gap + singleCalendarWidth / 2}
            y={calendarSizePreset.padding + calendarSizePreset.buttonSize / 2}
            anchor={0.5}
          />

          {/* Left calendar weekdays */}
          {WEEKDAYS.map((day, index) => (
            <pixiText
              key={`left-${day}-${index}`}
              text={day}
              style={{ ...calendarDayStyle, fill: calendarColorPreset.weekdayColor, fontSize: calendarSizePreset.fontSize * 0.85 }}
              x={calendarSizePreset.padding + index * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2}
              y={calendarSizePreset.padding + calendarHeaderHeight + calendarSizePreset.fontSize / 2}
              anchor={0.5}
            />
          ))}

          {/* Right calendar weekdays */}
          {WEEKDAYS.map((day, index) => (
            <pixiText
              key={`right-${day}-${index}`}
              text={day}
              style={{ ...calendarDayStyle, fill: calendarColorPreset.weekdayColor, fontSize: calendarSizePreset.fontSize * 0.85 }}
              x={singleCalendarWidth + sizePreset.gap + calendarSizePreset.padding + index * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2}
              y={calendarSizePreset.padding + calendarHeaderHeight + calendarSizePreset.fontSize / 2}
              anchor={0.5}
            />
          ))}

          {/* Left calendar days */}
          {renderCalendarDays(leftMonthDays, 0)}

          {/* Right calendar days */}
          {renderCalendarDays(rightMonthDays, singleCalendarWidth + sizePreset.gap)}
        </pixiContainer>
      )}
    </pixiContainer>
  );
}
