/**
 * PixiCalendar - WebGL Calendar Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Date grid with navigation
 *
 * CSS 동기화:
 * - getCalendarSizePreset(): fontSize, cellSize, padding, gap
 * - getCalendarColorPreset(): backgroundColor, borderColor, selectedBgColor
 */

import { useCallback, useMemo, useState } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getCalendarSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiCalendarProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * PixiCalendar - Monthly calendar view with date selection
 */
export function PixiCalendar({
  element,
  isSelected = false,
  onClick,
}: PixiCalendarProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const value = (props.value as string) || '';

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // Get presets from CSS
  const sizePreset = useMemo(() => getCalendarSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    borderColor: 0xd1d5db,
    textColor: variantColors.text,
    headerColor: variantColors.text,
    weekdayColor: 0x6b7280,
    selectedBgColor: variantColors.bg,
    selectedTextColor: 0xffffff,
    todayBorderColor: variantColors.bg,
    hoverBgColor: 0xf3f4f6,
    outsideMonthColor: 0x9ca3af,
    focusRingColor: variantColors.bg,
  }), [variantColors]);

  // State for displayed month (today is stable - only computed once on mount)
  const today = useMemo(() => new Date(), []);
  const [displayYear, setDisplayYear] = useState(() => today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(() => today.getMonth());

  // Parse selected date
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]) - 1,
      day: parseInt(parts[2]),
    };
  }, [value]);

  // Calculate calendar dimensions (memoized for stable references)
  const dimensions = useMemo(() => {
    const cellSize = sizePreset.cellSize;
    const headerHeight = sizePreset.buttonSize + sizePreset.gap;
    const weekdayHeight = sizePreset.fontSize + sizePreset.gap;
    const gridRows = 6;
    const gridHeight = cellSize * gridRows + sizePreset.gap * (gridRows - 1);
    return {
      cellSize,
      calendarWidth: cellSize * 7 + sizePreset.gap * 6 + sizePreset.padding * 2,
      headerHeight,
      weekdayHeight,
      gridHeight,
      calendarHeight: sizePreset.padding * 2 + headerHeight + weekdayHeight + gridHeight,
    };
  }, [sizePreset]);
  const { cellSize, calendarWidth, headerHeight, weekdayHeight, calendarHeight } = dimensions;

  // Get days in month
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1).getDay();
    const lastDate = new Date(displayYear, displayMonth + 1, 0).getDate();
    const prevMonthLastDate = new Date(displayYear, displayMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }> = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDate - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      const isToday = day === today.getDate() &&
        displayMonth === today.getMonth() &&
        displayYear === today.getFullYear();
      const isSelected = selectedDate &&
        day === selectedDate.day &&
        displayMonth === selectedDate.month &&
        displayYear === selectedDate.year;

      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        isSelected: !!isSelected,
      });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    return days;
  }, [displayYear, displayMonth, selectedDate, today]);

  // Draw calendar container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, calendarWidth, calendarHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator - 🚀 테마 색상 사용
      if (isSelected) {
        g.roundRect(-2, -2, calendarWidth + 4, calendarHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [calendarWidth, calendarHeight, sizePreset, colorPreset, isSelected]
  );

  // Draw navigation buttons
  const drawNavButton = useCallback(
    (g: PixiGraphics, isLeft: boolean) => {
      g.clear();

      // Button background
      g.roundRect(0, 0, sizePreset.buttonSize, sizePreset.buttonSize, 4);
      g.fill({ color: colorPreset.hoverBgColor });

      // Arrow
      const centerX = sizePreset.buttonSize / 2;
      const centerY = sizePreset.buttonSize / 2;
      const arrowSize = sizePreset.buttonSize * 0.25;

      if (isLeft) {
        g.moveTo(centerX + arrowSize / 2, centerY - arrowSize);
        g.lineTo(centerX - arrowSize / 2, centerY);
        g.lineTo(centerX + arrowSize / 2, centerY + arrowSize);
      } else {
        g.moveTo(centerX - arrowSize / 2, centerY - arrowSize);
        g.lineTo(centerX + arrowSize / 2, centerY);
        g.lineTo(centerX - arrowSize / 2, centerY + arrowSize);
      }
      g.stroke({ color: colorPreset.textColor, width: 2 });
    },
    [sizePreset, colorPreset]
  );

  // Header text style
  const headerStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.headerFontSize,
      fontWeight: '600',
      fill: colorPreset.headerColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Weekday text style
  const weekdayStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize * 0.85,
      fill: colorPreset.weekdayColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Day text style
  const dayStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  }, [displayMonth, displayYear, setDisplayMonth, setDisplayYear]);

  const handleNextMonth = useCallback(() => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  }, [displayMonth, displayYear, setDisplayMonth, setDisplayYear]);

  // Render day cells (React Compiler handles optimization automatically)
  const renderDays = daysInMonth.map((dayInfo, index) => {
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = sizePreset.padding + col * (cellSize + sizePreset.gap) + cellSize / 2;
    const y = sizePreset.padding + headerHeight + weekdayHeight + row * (cellSize + sizePreset.gap) + cellSize / 2;

    // Draw cell background
    const drawCell = (g: PixiGraphics) => {
      g.clear();

      if (dayInfo.isSelected) {
        g.circle(0, 0, cellSize / 2 - 2);
        g.fill({ color: colorPreset.selectedBgColor });
      } else if (dayInfo.isToday) {
        g.circle(0, 0, cellSize / 2 - 2);
        g.stroke({ color: colorPreset.todayBorderColor, width: 2 });
      }
    };

    const textColor = dayInfo.isSelected
      ? colorPreset.selectedTextColor
      : dayInfo.isCurrentMonth
        ? colorPreset.textColor
        : colorPreset.outsideMonthColor;

    return (
      <pixiContainer key={index} x={x} y={y}>
        <pixiGraphics draw={drawCell} />
        <pixiText
          text={String(dayInfo.day)}
          style={{ ...dayStyle, fill: textColor }}
          anchor={0.5}
        />
      </pixiContainer>
    );
  });

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Container background */}
      <pixiGraphics draw={drawContainer} />

      {/* Navigation: Previous month */}
      <pixiContainer
        x={sizePreset.padding}
        y={sizePreset.padding}
        eventMode="static"
        cursor="pointer"
        onPointerTap={handlePrevMonth}
      >
        <pixiGraphics draw={(g) => drawNavButton(g, true)} />
      </pixiContainer>

      {/* Header: Month Year */}
      <pixiText
        text={`${MONTHS[displayMonth]} ${displayYear}`}
        style={headerStyle}
        x={calendarWidth / 2}
        y={sizePreset.padding + sizePreset.buttonSize / 2}
        anchor={0.5}
      />

      {/* Navigation: Next month */}
      <pixiContainer
        x={calendarWidth - sizePreset.padding - sizePreset.buttonSize}
        y={sizePreset.padding}
        eventMode="static"
        cursor="pointer"
        onPointerTap={handleNextMonth}
      >
        <pixiGraphics draw={(g) => drawNavButton(g, false)} />
      </pixiContainer>

      {/* Weekday headers */}
      {WEEKDAYS.map((day, index) => (
        <pixiText
          key={day + index}
          text={day}
          style={weekdayStyle}
          x={sizePreset.padding + index * (cellSize + sizePreset.gap) + cellSize / 2}
          y={sizePreset.padding + headerHeight + sizePreset.fontSize / 2}
          anchor={0.5}
        />
      ))}

      {/* Day cells */}
      {renderDays}
    </pixiContainer>
  );
}
