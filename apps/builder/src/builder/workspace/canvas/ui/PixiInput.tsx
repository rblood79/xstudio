/**
 * Pixi Input
 *
 * 🚀 Phase 19: JSX 기반 재작성
 *
 * @pixi/ui Input 대신 순수 PixiJS 렌더링 사용
 * 실제 텍스트 입력은 TextEditOverlay로 처리
 *
 * 기존 문제:
 * - app.stage.addChild()로 Camera 컨테이너 바깥에 렌더링
 * - Yoga 레이아웃 위치가 반영되지 않음
 *
 * @since 2025-12-13 Phase 6.2
 * @updated 2025-12-19 Phase 19 - JSX 기반 재작성 + Label/Description 지원
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useRef } from 'react';
import type { Graphics as PixiGraphicsType, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { parseCSSSize } from '../sprites/styleConverter';
import { getTextFieldSizePreset, getTextFieldColorPreset, getLabelStylePreset, getDescriptionStylePreset } from '../utils/cssVariableReader';

// ============================================
// Types
// ============================================

export interface PixiInputProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiInput
 *
 * JSX 기반 Input 컴포넌트
 * - 순수 PixiJS 렌더링 (pixiGraphics + pixiText)
 * - ElementsLayer 계층 안에서 올바르게 배치됨
 * - 더블클릭 시 TextEditOverlay로 텍스트 입력 처리
 * - Label, Description, ErrorMessage 지원
 */
export const PixiInput = memo(function PixiInput({
  element,
  isSelected = false,
  onClick,
}: PixiInputProps) {
  useExtend(PIXI_COMPONENTS);

  const props = element.props || {};
  const style = props.style as CSSStyle | undefined;
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || '';
  const placeholder = (props.placeholder as string) || '';
  const value = (props.value as string) || (props.defaultValue as string) || '';
  const description = (props.description as string) || '';
  const isDisabled = (props.isDisabled as boolean) || false;
  const isInvalid = (props.isInvalid as boolean) || false;
  const errorMessage = (props.errorMessage as string) || '';

  // Position (from effectiveElement with layoutPosition applied)
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // Get presets from CSS (TextField preset has label/description support)
  const sizePreset = useMemo(() => getTextFieldSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTextFieldColorPreset(variant), [variant]);
  // 🚀 Phase 19: .react-aria-Label / .react-aria-FieldError 클래스에서 스타일 읽기
  const labelPreset = useMemo(() => getLabelStylePreset(size), [size]);
  const descPreset = useMemo(() => getDescriptionStylePreset(size), [size]);

  // 🚀 Phase 19: flexDirection 지원 (row/column)
  const flexDirection = useMemo(() => {
    const dir = style?.flexDirection;
    if (dir === 'row' || dir === 'row-reverse') return 'row';
    return 'column'; // default
  }, [style?.flexDirection]);

  const isRow = flexDirection === 'row';

  // Calculate dimensions - 🚀 Phase 19: labelPreset/descPreset 사용
  const fieldWidth = parseCSSSize(style?.width, undefined, 240);

  // Column 레이아웃용 높이 계산
  const labelHeight = label ? labelPreset.fontSize + sizePreset.gap : 0;

  // Row 레이아웃용 너비 계산
  const labelWidth = label ? label.length * labelPreset.fontSize * 0.6 + sizePreset.gap : 0;

  // Display text
  const displayText = value || placeholder;
  const isPlaceholder = !value && placeholder;
  const descriptionText = isInvalid && errorMessage ? errorMessage : description;

  // 🚀 Phase 19: 전체 영역 계산 (hitArea용)
  const totalWidth = isRow ? labelWidth + fieldWidth : fieldWidth;
  const totalHeightCalc = isRow
    ? sizePreset.height + (descriptionText ? descPreset.fontSize + sizePreset.gap : 0)
    : labelHeight + sizePreset.height + (descriptionText ? descPreset.fontSize + sizePreset.gap : 0);

  // 🚀 Performance: useRef로 hover 상태 관리
  const graphicsRef = useRef<PixiGraphicsType>(null);

  // Draw input background
  const drawBackground = useCallback(
    (g: PixiGraphicsType, isHovered = false) => {
      g.clear();

      // Background (hover 시 약간 어둡게)
      let bgColor = colorPreset.backgroundColor;
      if (isDisabled) {
        bgColor = colorPreset.disabledBackgroundColor;
      } else if (isHovered) {
        bgColor = Math.max(0, colorPreset.backgroundColor - 0x0a0a0a);
      }

      g.roundRect(0, 0, fieldWidth, sizePreset.height, sizePreset.borderRadius);
      g.fill({ color: bgColor });

      // Border
      let borderColor = colorPreset.borderColor;
      if (isInvalid) {
        borderColor = colorPreset.errorBorderColor;
      } else if (isSelected) {
        borderColor = colorPreset.focusBorderColor;
      } else if (isHovered) {
        borderColor = colorPreset.focusBorderColor;
      }

      g.stroke({ color: borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, fieldWidth + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
      }
    },
    [fieldWidth, sizePreset, colorPreset, isSelected, isDisabled, isInvalid]
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
        : isPlaceholder
          ? colorPreset.placeholderColor
          : colorPreset.textColor,
      fontFamily: labelPreset.fontFamily,
    }),
    [sizePreset, colorPreset, isDisabled, isPlaceholder, labelPreset.fontFamily]
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

  // Event handlers
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  const handlePointerOver = useCallback(() => {
    if (graphicsRef.current && !isDisabled) {
      drawBackground(graphicsRef.current, true);
    }
  }, [drawBackground, isDisabled]);

  const handlePointerOut = useCallback(() => {
    if (graphicsRef.current) {
      drawBackground(graphicsRef.current, false);
    }
  }, [drawBackground]);

  // 🚀 Phase 19: 투명 히트 영역 (클릭 감지용)
  const drawHitArea = useCallback(
    (g: PixiGraphicsType) => {
      g.clear();
      g.rect(0, 0, totalWidth, totalHeightCalc);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [totalWidth, totalHeightCalc]
  );

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
      // Row: Input 아래에 Description
      return { x: labelWidth, y: sizePreset.height + sizePreset.gap };
    }
    // Column: Input 아래에 Description
    return { x: 0, y: labelHeight + sizePreset.height + sizePreset.gap };
  }, [isRow, labelWidth, labelHeight, sizePreset]);

  return (
    <pixiContainer x={posX} y={posY}>
      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
          x={labelPos.x}
          y={labelPos.y}
        />
      )}

      {/* Input field */}
      <pixiContainer x={inputPos.x} y={inputPos.y}>
        <pixiGraphics
          ref={graphicsRef}
          draw={(g) => drawBackground(g, false)}
        />
        <pixiText
          text={displayText}
          style={inputStyle}
          x={sizePreset.paddingX}
          y={(sizePreset.height - sizePreset.fontSize) / 2}
        />
      </pixiContainer>

      {/* Description / Error message */}
      {descriptionText && (
        <pixiText
          text={descriptionText}
          style={descriptionStyle}
          x={descriptionPos.x}
          y={descriptionPos.y}
        />
      )}

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - 마지막에 렌더링하여 최상단 배치 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor={isDisabled ? 'not-allowed' : 'text'}
        onPointerDown={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </pixiContainer>
  );
});

export default PixiInput;
