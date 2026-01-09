/**
 * PixiTextField - WebGL Text Field Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Label + Input + Description
 *
 * CSS 동기화:
 * - getTextFieldSizePreset(): fontSize, height, padding, borderRadius
 * - getTextFieldColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import {
  getTextFieldSizePreset,
  getTextFieldColorPreset,
  getLabelStylePreset,
  getDescriptionStylePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiTextFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiTextField - Text input field with label and description
 */
export function PixiTextField({
  element,
  isSelected = false,
  onClick,
}: PixiTextFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const style = props.style as CSSStyle | undefined;
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || '';
  const placeholder = (props.placeholder as string) || '';
  const value = (props.value as string) || '';
  const description = (props.description as string) || '';
  const isDisabled = (props.isDisabled as boolean) || false;
  const isInvalid = (props.isInvalid as boolean) || false;
  const errorMessage = (props.errorMessage as string) || '';

  // Get presets from CSS
  const sizePreset = useMemo(() => getTextFieldSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTextFieldColorPreset(variant), [variant]);
  // 🚀 Phase 19: .react-aria-Label / .react-aria-FieldError 클래스에서 스타일 읽기
  const labelPreset = useMemo(() => getLabelStylePreset(size), [size]);
  const descPreset = useMemo(() => getDescriptionStylePreset(size), [size]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 🚀 Phase 19: flexDirection 지원 (row/column)
  const flexDirection = useMemo(() => {
    const dir = style?.flexDirection;
    if (dir === 'row' || dir === 'row-reverse') return 'row';
    return 'column'; // default
  }, [style?.flexDirection]);

  const isRow = flexDirection === 'row';

  // Calculate dimensions - 🚀 Phase 19: labelPreset/descPreset 사용
  const fieldWidth = (props.width as number) || 240;

  // Column 레이아웃용 높이 계산
  const labelHeight = label ? labelPreset.fontSize + sizePreset.gap : 0;

  // Row 레이아웃용 너비 계산
  const labelWidth = label ? label.length * labelPreset.fontSize * 0.6 + sizePreset.gap : 0;

  // Draw input field
  const drawField = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      const bgColor = isDisabled ? colorPreset.disabledBackgroundColor : colorPreset.backgroundColor;
      g.roundRect(0, 0, fieldWidth, sizePreset.height, sizePreset.borderRadius);
      g.fill({ color: bgColor });

      // Border
      const borderColor = isInvalid
        ? colorPreset.errorBorderColor
        : isSelected
          ? colorPreset.focusBorderColor
          : colorPreset.borderColor;
      g.stroke({ color: borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, fieldWidth + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [fieldWidth, sizePreset, colorPreset, isSelected, isDisabled, isInvalid, variantColors.bg]
  );

  // Text styles - 🚀 Phase 19: .react-aria-Label 클래스에서 스타일 읽기
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: labelPreset.fontSize,
      fill: labelPreset.color,
      fontFamily: labelPreset.fontFamily,
      fontWeight: labelPreset.fontWeight as import('pixi.js').TextStyleFontWeight,
    }),
    [labelPreset]
  );

  const inputStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: isDisabled
        ? colorPreset.disabledTextColor
        : value
          ? colorPreset.textColor
          : colorPreset.placeholderColor,
      fontFamily: labelPreset.fontFamily,
    }),
    [sizePreset, colorPreset, value, isDisabled, labelPreset.fontFamily]
  );

  // 🚀 Phase 19: .react-aria-FieldError / [slot="description"] 클래스에서 스타일 읽기
  const descriptionStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: descPreset.fontSize,
      fill: isInvalid ? descPreset.errorColor : descPreset.color,
      fontFamily: descPreset.fontFamily,
    }),
    [descPreset, isInvalid]
  );

  // Display text
  const displayText = value || placeholder;
  const descriptionText = isInvalid && errorMessage ? errorMessage : description;

  // 전체 영역 계산 (hitArea용)
  const totalWidth = isRow ? labelWidth + fieldWidth : fieldWidth;
  const totalHeightCalc = isRow
    ? sizePreset.height + (descriptionText ? descPreset.fontSize + sizePreset.gap : 0)
    : labelHeight + sizePreset.height + (descriptionText ? descPreset.fontSize + sizePreset.gap : 0);

  // 🚀 Phase 19: 투명 히트 영역 (클릭 감지용)
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, totalWidth, totalHeightCalc);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [totalWidth, totalHeightCalc]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 🚀 Phase 19: Row/Column 레이아웃 위치 계산
  const labelPos = useMemo(() => {
    if (isRow) {
      // Row: Label 왼쪽, Input 중앙 정렬
      return { x: 0, y: (sizePreset.height - labelPreset.fontSize) / 2 };
    }
    // Column: Label 위쪽
    return { x: 0, y: 0 };
  }, [isRow, sizePreset.height, labelPreset.fontSize]);

  const inputPos = useMemo(() => {
    if (isRow) {
      // Row: Label 오른쪽에 Input
      return { x: labelWidth, y: 0 };
    }
    // Column: Label 아래에 Input
    return { x: 0, y: labelHeight };
  }, [isRow, labelWidth, labelHeight]);

  const descriptionPos = useMemo(() => {
    if (isRow) {
      // Row: Input 오른쪽에 Description (또는 Input 아래)
      return { x: labelWidth, y: sizePreset.height + sizePreset.gap };
    }
    // Column: Input 아래에 Description
    return { x: 0, y: labelHeight + sizePreset.height + sizePreset.gap };
  }, [isRow, labelWidth, labelHeight, sizePreset]);

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: (isRow ? 'row' : 'column') as 'row' | 'column',
    alignItems: isRow ? ('center' as const) : ('flex-start' as const),
    gap: sizePreset.gap,
    position: 'relative' as const,
  }), [isRow, sizePreset.gap]);

  // 🚀 Phase 12: Input 컨테이너 레이아웃
  const inputContainerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: sizePreset.gap,
  }), [sizePreset.gap]);

  // 🚀 Phase 12: Input 필드 레이아웃
  const inputFieldLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    width: fieldWidth,
    height: sizePreset.height,
    paddingLeft: sizePreset.paddingX,
    paddingRight: sizePreset.paddingX,
    position: 'relative' as const,
  }), [fieldWidth, sizePreset.height, sizePreset.paddingX]);

  return (
    <pixiContainer layout={rootLayout}>
      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
          layout={{ isLeaf: true }}
        />
      )}

      {/* Input container */}
      <pixiContainer layout={inputContainerLayout}>
        {/* Input field */}
        <pixiContainer layout={inputFieldLayout}>
          {/* Field background - position: absolute */}
          <pixiGraphics
            draw={drawField}
            layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          <pixiText
            text={displayText}
            style={inputStyle}
            layout={{ isLeaf: true }}
          />
        </pixiContainer>

        {/* Description / Error message */}
        {descriptionText && (
          <pixiText
            text={descriptionText}
            style={descriptionStyle}
            layout={{ isLeaf: true }}
          />
        )}
      </pixiContainer>

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - position: absolute */}
      <pixiGraphics
        draw={drawHitArea}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
}
