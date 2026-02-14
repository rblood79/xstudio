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

// 🚀 Spec Migration
import { getLabelStylePreset, getDescriptionStylePreset } from '../hooks/useSpecRenderer';
import { InputSpec, getVariantColors as getSpecVariantColors, getSizePreset as getSpecSizePreset } from '@xstudio/specs';

const TEXT_FIELD_COLOR_PRESETS: Record<string, { backgroundColor: number; borderColor: number; textColor: number; placeholderColor: number; labelColor: number; descriptionColor: number; focusBorderColor: number; errorBorderColor: number; errorTextColor: number; disabledBackgroundColor: number; disabledTextColor: number }> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, textColor: 0x374151, placeholderColor: 0x9ca3af, labelColor: 0x374151, descriptionColor: 0x6b7280, focusBorderColor: 0x3b82f6, errorBorderColor: 0xef4444, errorTextColor: 0xef4444, disabledBackgroundColor: 0xf3f4f6, disabledTextColor: 0x9ca3af },
  primary: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151, placeholderColor: 0x9ca3af, labelColor: 0x3b82f6, descriptionColor: 0x6b7280, focusBorderColor: 0x2563eb, errorBorderColor: 0xef4444, errorTextColor: 0xef4444, disabledBackgroundColor: 0xf3f4f6, disabledTextColor: 0x9ca3af },
  secondary: { backgroundColor: 0xffffff, borderColor: 0x6366f1, textColor: 0x374151, placeholderColor: 0x9ca3af, labelColor: 0x6366f1, descriptionColor: 0x6b7280, focusBorderColor: 0x4f46e5, errorBorderColor: 0xef4444, errorTextColor: 0xef4444, disabledBackgroundColor: 0xf3f4f6, disabledTextColor: 0x9ca3af },
  filled: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, textColor: 0x374151, placeholderColor: 0x9ca3af, labelColor: 0x374151, descriptionColor: 0x6b7280, focusBorderColor: 0x3b82f6, errorBorderColor: 0xef4444, errorTextColor: 0xef4444, disabledBackgroundColor: 0xe5e7eb, disabledTextColor: 0x9ca3af },
};

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

  // Get presets from CSS (TextField preset has label/description support)
  const sizePreset = useMemo(() => {
    const sizeSpec = InputSpec.sizes[size] || InputSpec.sizes[InputSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);
  const colorPreset = useMemo(() => TEXT_FIELD_COLOR_PRESETS[variant] ?? TEXT_FIELD_COLOR_PRESETS.default, [variant]);
  // 🚀 Phase 19: .react-aria-Label / .react-aria-FieldError 클래스에서 스타일 읽기
  const labelPreset = useMemo(() => getLabelStylePreset(size), [size]);
  const descPreset = useMemo(() => getDescriptionStylePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = InputSpec.variants[variant] || InputSpec.variants[InputSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 🚀 Phase 19: flexDirection 지원 (row/column)
  const flexDirection = useMemo(() => {
    const dir = style?.flexDirection;
    if (dir === 'row' || dir === 'row-reverse') return 'row';
    return 'column'; // default
  }, [style?.flexDirection]);

  const isRow = flexDirection === 'row';

  // 🚀 @pixi/layout: style?.width를 그대로 전달 (% 문자열 지원)
  const styleWidth = style?.width;
  const fallbackWidth = 240;

  // Column 레이아웃용 높이 계산
  const labelHeight = label ? labelPreset.fontSize + sizePreset.gap : 0;

  // Row 레이아웃용 너비 계산
  const labelWidth = label ? label.length * labelPreset.fontSize * 0.6 + sizePreset.gap : 0;

  // Display text
  const displayText = value || placeholder;
  const isPlaceholder = !value && placeholder;
  const descriptionText = isInvalid && errorMessage ? errorMessage : description;

  // 🚀 Phase 19: 전체 영역 계산 (hitArea용) - fallback 사용
  const totalWidth = isRow ? labelWidth + fallbackWidth : fallbackWidth;
  const totalHeightCalc = isRow
    ? sizePreset.height + (descriptionText ? descPreset.fontSize + sizePreset.gap : 0)
    : labelHeight + sizePreset.height + (descriptionText ? descPreset.fontSize + sizePreset.gap : 0);

  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: sizePreset.gap,
  }), [sizePreset.gap]);

  const rowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: sizePreset.gap,
  }), [sizePreset.gap]);

  // 🚀 @pixi/layout: layout에 style 값 직접 전달 (% 지원)
  const inputLayout = useMemo(() => ({
    width: (styleWidth ?? fallbackWidth) as number,
    height: sizePreset.height,
  }), [styleWidth, sizePreset.height]);

  const spacerLayout = useMemo(() => ({
    width: labelWidth,
    height: 0,
  }), [labelWidth]);

  // 🚀 Performance: useRef로 hover 상태 관리
  const graphicsRef = useRef<PixiGraphicsType>(null);

  // Draw input background - 🚀 @pixi/layout: Graphics는 fallback 사용
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

      g.roundRect(0, 0, fallbackWidth, sizePreset.height, sizePreset.borderRadius);
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
        g.roundRect(-2, -2, fallbackWidth + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [fallbackWidth, sizePreset, colorPreset, isSelected, isDisabled, isInvalid, variantColors.bg]
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

  return (
    <pixiContainer layout={rootLayout}>
      {isRow ? (
        <pixiContainer layout={rowLayout}>
          {label && (
            <pixiText
              text={label}
              style={labelStyle}
              layout={{ isLeaf: true }}
            />
          )}
          <pixiContainer layout={inputLayout}>
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
        </pixiContainer>
      ) : (
        <>
          {label && (
            <pixiText
              text={label}
              style={labelStyle}
              layout={{ isLeaf: true }}
            />
          )}
          <pixiContainer layout={inputLayout}>
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
        </>
      )}

      {/* Description / Error message */}
      {descriptionText && (isRow ? (
        <pixiContainer layout={{ display: 'flex' as const, flexDirection: 'row' as const }}>
          {label && <pixiContainer layout={spacerLayout} />}
          <pixiText
            text={descriptionText}
            style={descriptionStyle}
            layout={{ isLeaf: true }}
          />
        </pixiContainer>
      ) : (
        <pixiText
          text={descriptionText}
          style={descriptionStyle}
          layout={{ isLeaf: true }}
        />
      ))}

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - 마지막에 렌더링하여 최상단 배치 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </pixiContainer>
  );
});

export default PixiInput;
