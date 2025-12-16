/**
 * PixiDatePicker - WebGL Date Picker Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - DateField + Calendar popup
 *
 * CSS 동기화:
 * - getDatePickerSizePreset(): fieldHeight, calendarWidth, etc.
 * - getDatePickerColorPreset(): fieldBackgroundColor, buttonBackgroundColor
 */

import { useCallback, useMemo, useState } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getDatePickerSizePreset,
  getDatePickerColorPreset,
  getCalendarSizePreset,
  getCalendarColorPreset,
} from '../utils/cssVariableReader';

export interface PixiDatePickerProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * PixiDatePicker - Date field with calendar popup
 */
export function PixiDatePicker({
  element,
  isSelected = false,
  onClick,
}: PixiDatePickerProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const value = (props.value as string) || '';
  const isOpen = (props.isOpen as boolean) ?? true; // Show calendar in builder

  // Get presets from CSS
  const sizePreset = useMemo(() => getDatePickerSizePreset(size), [size]);
  const colorPreset = useMemo(() => getDatePickerColorPreset(variant), [variant]);
  const calendarSizePreset = useMemo(() => getCalendarSizePreset(size), [size]);
  const calendarColorPreset = useMemo(() => getCalendarColorPreset(variant), [variant]);

  // State for displayed month
  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

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

  // Display text
  const displayText = useMemo(() => {
    if (!value) return 'Select date';
    if (selectedDate) {
      return `${MONTHS_SHORT[selectedDate.month]} ${selectedDate.day}, ${selectedDate.year}`;
    }
    return value;
  }, [value, selectedDate]);

  // Calculate dimensions
  const fieldWidth = sizePreset.calendarWidth;
  const calendarCellSize = sizePreset.calendarCellSize;
  const calendarWidth = calendarCellSize * 7 + calendarSizePreset.gap * 6 + calendarSizePreset.padding * 2;
  const calendarHeaderHeight = calendarSizePreset.buttonSize + calendarSizePreset.gap;
  const calendarWeekdayHeight = calendarSizePreset.fontSize + calendarSizePreset.gap;
  const calendarGridHeight = calendarCellSize * 6 + calendarSizePreset.gap * 5;
  const calendarHeight = calendarSizePreset.padding * 2 + calendarHeaderHeight + calendarWeekdayHeight + calendarGridHeight;

  // Get days in month
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1).getDay();
    const lastDate = new Date(displayYear, displayMonth + 1, 0).getDate();
    const prevMonthLastDate = new Date(displayYear, displayMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }> = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDate - i, isCurrentMonth: false, isToday: false, isSelected: false });
    }

    for (let day = 1; day <= lastDate; day++) {
      const isToday = day === today.getDate() && displayMonth === today.getMonth() && displayYear === today.getFullYear();
      const isSelectedDay = selectedDate && day === selectedDate.day && displayMonth === selectedDate.month && displayYear === selectedDate.year;
      days.push({ day, isCurrentMonth: true, isToday, isSelected: !!isSelectedDay });
    }

    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false, isSelected: false });
    }

    return days;
  }, [displayYear, displayMonth, selectedDate, today]);

  // Draw date field
  const drawField = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Field background
      g.roundRect(0, 0, fieldWidth, sizePreset.fieldHeight, sizePreset.fieldBorderRadius);
      g.fill({ color: colorPreset.fieldBackgroundColor });
      g.stroke({ color: isSelected ? colorPreset.focusBorderColor : colorPreset.fieldBorderColor, width: 1 });

      // Calendar button
      const buttonX = fieldWidth - sizePreset.buttonSize - sizePreset.fieldPadding / 2;
      g.roundRect(buttonX, (sizePreset.fieldHeight - sizePreset.buttonSize) / 2, sizePreset.buttonSize, sizePreset.buttonSize, 4);
      g.fill({ color: colorPreset.buttonBackgroundColor });

      // Calendar icon
      const iconX = buttonX + sizePreset.buttonSize / 2;
      const iconY = sizePreset.fieldHeight / 2;
      const iconSize = sizePreset.buttonSize * 0.4;
      g.rect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize);
      g.stroke({ color: colorPreset.buttonIconColor, width: 1.5 });
      g.moveTo(iconX - iconSize / 2, iconY - iconSize / 4);
      g.lineTo(iconX + iconSize / 2, iconY - iconSize / 4);
      g.stroke({ color: colorPreset.buttonIconColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, fieldWidth + 4, sizePreset.fieldHeight + 4, sizePreset.fieldBorderRadius + 2);
        g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
      }
    },
    [fieldWidth, sizePreset, colorPreset, isSelected]
  );

  // Draw calendar popup
  const drawCalendar = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background with shadow effect
      g.roundRect(2, 2, calendarWidth, calendarHeight, calendarSizePreset.borderRadius);
      g.fill({ color: 0x00000020 });

      g.roundRect(0, 0, calendarWidth, calendarHeight, calendarSizePreset.borderRadius);
      g.fill({ color: calendarColorPreset.backgroundColor });
      g.stroke({ color: colorPreset.popoverBorderColor, width: 1 });
    },
    [calendarWidth, calendarHeight, calendarSizePreset, calendarColorPreset, colorPreset]
  );

  // Text styles
  const fieldTextStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fieldFontSize,
      fill: value ? colorPreset.fieldTextColor : colorPreset.fieldPlaceholderColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset, value]
  );

  const calendarDayStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: calendarSizePreset.fontSize,
      fill: calendarColorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [calendarSizePreset, calendarColorPreset]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onpointertap={() => onClick?.(element.id)}
    >
      {/* Date field */}
      <pixiGraphics draw={drawField} />
      <Text
        text={displayText}
        style={fieldTextStyle}
        x={sizePreset.fieldPadding}
        y={sizePreset.fieldHeight / 2 - sizePreset.fieldFontSize / 2}
      />

      {/* Calendar popup (shown in builder) */}
      {isOpen && (
        <pixiContainer y={sizePreset.fieldHeight + sizePreset.gap}>
          <pixiGraphics draw={drawCalendar} />

          {/* Month/Year header */}
          <Text
            text={`${MONTHS_SHORT[displayMonth]} ${displayYear}`}
            style={{ ...calendarDayStyle, fontWeight: '600', fontSize: calendarSizePreset.headerFontSize }}
            x={calendarWidth / 2}
            y={calendarSizePreset.padding + calendarSizePreset.buttonSize / 2}
            anchor={0.5}
          />

          {/* Weekday headers */}
          {WEEKDAYS.map((day, index) => (
            <Text
              key={day + index}
              text={day}
              style={{ ...calendarDayStyle, fill: calendarColorPreset.weekdayColor, fontSize: calendarSizePreset.fontSize * 0.85 }}
              x={calendarSizePreset.padding + index * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2}
              y={calendarSizePreset.padding + calendarHeaderHeight + calendarSizePreset.fontSize / 2}
              anchor={0.5}
            />
          ))}

          {/* Day cells */}
          {daysInMonth.slice(0, 35).map((dayInfo, index) => {
            const col = index % 7;
            const row = Math.floor(index / 7);
            const x = calendarSizePreset.padding + col * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2;
            const y = calendarSizePreset.padding + calendarHeaderHeight + calendarWeekdayHeight + row * (calendarCellSize + calendarSizePreset.gap) + calendarCellSize / 2;

            const drawCell = (g: PixiGraphics) => {
              g.clear();
              if (dayInfo.isSelected) {
                g.circle(0, 0, calendarCellSize / 2 - 2);
                g.fill({ color: calendarColorPreset.selectedBgColor });
              } else if (dayInfo.isToday) {
                g.circle(0, 0, calendarCellSize / 2 - 2);
                g.stroke({ color: calendarColorPreset.todayBorderColor, width: 2 });
              }
            };

            const textColor = dayInfo.isSelected
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
          })}
        </pixiContainer>
      )}
    </pixiContainer>
  );
}
