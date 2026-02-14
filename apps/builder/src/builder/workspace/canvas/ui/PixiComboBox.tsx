/**
 * Pixi ComboBox
 *
 * 🚀 Phase 3: ComboBox WebGL 컴포넌트 (Pattern B+C)
 *
 * 자동완성 드롭다운 입력
 * - variant (default, primary, secondary, tertiary, error, filled) 지원
 * - size (sm, md, lg) 지원
 * - Store에서 ComboBoxItem 자식 요소 읽기
 *
 * @since 2025-12-16 Phase 3 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { useStore } from "../../../stores";

// 🚀 Spec Migration
import { resolveTokenColor } from '../hooks/useSpecRenderer';
import {
  ComboBoxSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';
import type { TokenRef } from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiComboBoxProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

interface ComboBoxElementProps {
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "filled";
  size?: "sm" | "md" | "lg";
  value?: string;
  label?: string;
  placeholder?: string;
  isOpen?: boolean;
  isDisabled?: boolean;
  style?: CSSStyle;
}

interface ComboBoxItemData {
  id: string;
  text: string;
  isSelected?: boolean;
  isDisabled?: boolean;
}

// ============================================
// Component
// ============================================

export const PixiComboBox = memo(function PixiComboBox({
  element,
  onClick,
}: PixiComboBoxProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props as ComboBoxElementProps | undefined;

  // Store에서 자식 요소 읽기
  const elements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return elements
      .filter((el) => el.parent_id === element.id && el.tag === "ComboBoxItem")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elements, element.id]);

  // variant, size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const label = useMemo(() => String(props?.label || ""), [props?.label]);
  const value = useMemo(() => String(props?.value || ""), [props?.value]);
  const placeholder = useMemo(() => String(props?.placeholder || "Select..."), [props?.placeholder]);
  const isDisabled = Boolean(props?.isDisabled);
  const isOpen = Boolean(props?.isOpen);

  // 🚀 CSS / Spec에서 프리셋 읽기
  const sizePreset = useMemo(() => {
    const sizeSpec = ComboBoxSpec.sizes[size] || ComboBoxSpec.sizes[ComboBoxSpec.defaultSize];
    const specPreset = getSpecSizePreset(sizeSpec, 'light');
    return {
      ...specPreset,
      paddingY: specPreset.paddingY,
      paddingX: specPreset.paddingX,
      inputWidth: 240,
      buttonSize: specPreset.height * 0.7,
      labelFontSize: specPreset.fontSize - 2,
      itemPaddingX: specPreset.paddingX,
      itemPaddingY: specPreset.paddingY * 0.6,
    };
  }, [size]);

  const colorPreset = useMemo(() => {
    const variantSpec = ComboBoxSpec.variants[variant] || ComboBoxSpec.variants[ComboBoxSpec.defaultVariant];
    const vc = getSpecVariantColors(variantSpec, 'light');
    return {
      backgroundColor: vc.bg,
      textColor: vc.text,
      borderColor: vc.border ?? 0x79747e,
      placeholderColor: resolveTokenColor('{color.on-surface-variant}' as TokenRef, 'light'),
      labelColor: vc.text,
      buttonBgColor: resolveTokenColor('{color.surface-container}' as TokenRef, 'light'),
      dropdownBgColor: resolveTokenColor('{color.surface}' as TokenRef, 'light'),
      itemSelectedBgColor: resolveTokenColor('{color.secondary-container}' as TokenRef, 'light'),
      itemSelectedTextColor: resolveTokenColor('{color.on-secondary-container}' as TokenRef, 'light'),
    };
  }, [variant]);

  // 전체 너비/높이 계산
  const inputHeight = sizePreset.paddingY * 2 + sizePreset.fontSize;
  const labelHeight = label ? sizePreset.labelFontSize + 4 : 0;

  // Items 데이터 변환
  const itemsData: ComboBoxItemData[] = useMemo(() => {
    return childItems.map((item) => ({
      id: item.id,
      text: String(item.props?.children || item.props?.text || item.props?.textValue || "Item"),
      isSelected: Boolean(item.props?.isSelected),
      isDisabled: Boolean(item.props?.isDisabled),
    }));
  }, [childItems]);

  // 드롭다운 높이 계산
  const dropdownHeight = useMemo(() => {
    const itemHeight = sizePreset.itemPaddingY * 2 + sizePreset.fontSize;
    const maxItems = Math.min(itemsData.length, 5);
    return maxItems * itemHeight + sizePreset.paddingY * 2;
  }, [itemsData.length, sizePreset]);

  // Input 영역 그리기
  const drawInput = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, sizePreset.inputWidth, inputHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });
      g.stroke();
    },
    [colorPreset, sizePreset, inputHeight]
  );

  // Chevron 버튼 그리기
  const drawButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const btnSize = sizePreset.buttonSize;
      const bgColor = colorPreset.buttonBgColor;

      g.roundRect(0, 0, btnSize, btnSize, 4);
      g.fill({ color: bgColor });

      // Chevron down 아이콘
      const chevronSize = btnSize * 0.4;
      const cx = btnSize / 2;
      const cy = btnSize / 2;
      g.setStrokeStyle({ width: 2, color: colorPreset.textColor });
      g.moveTo(cx - chevronSize / 2, cy - chevronSize / 4);
      g.lineTo(cx, cy + chevronSize / 4);
      g.lineTo(cx + chevronSize / 2, cy - chevronSize / 4);
      g.stroke();
    },
    [colorPreset, sizePreset.buttonSize]
  );

  // 드롭다운 배경 그리기
  const drawDropdown = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isOpen) return;

      g.roundRect(0, 0, sizePreset.inputWidth, dropdownHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.dropdownBgColor });
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });
      g.stroke();
    },
    [isOpen, colorPreset, sizePreset, dropdownHeight]
  );

  // 아이템 배경 그리기
  const drawItemBackground = useCallback(
    (g: PixiGraphics, item: ComboBoxItemData) => {
      g.clear();
      const itemHeight = sizePreset.itemPaddingY * 2 + sizePreset.fontSize;

      let bgColor = 0x00000000; // 투명
      if (item.isSelected) {
        bgColor = colorPreset.itemSelectedBgColor;
      }

      if (bgColor !== 0x00000000) {
        g.roundRect(
          sizePreset.paddingX / 2,
          0,
          sizePreset.inputWidth - sizePreset.paddingX,
          itemHeight,
          4
        );
        g.fill({ color: bgColor });
      }
    },
    [colorPreset, sizePreset]
  );

  // 텍스트 스타일
  const labelTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.labelFontSize,
        fill: colorPreset.labelColor,
        fontWeight: "500",
      }),
    [sizePreset.labelFontSize, colorPreset.labelColor]
  );

  const valueTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: isDisabled ? 0x9ca3af : value ? colorPreset.textColor : colorPreset.placeholderColor,
        fontWeight: "400",
      }),
    [sizePreset.fontSize, isDisabled, value, colorPreset.textColor, colorPreset.placeholderColor]
  );

  const createItemTextStyle = useCallback(
    (item: ComboBoxItemData) =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: item.isDisabled
          ? 0x9ca3af
          : item.isSelected
          ? colorPreset.itemSelectedTextColor
          : colorPreset.textColor,
        fontWeight: item.isSelected ? "500" : "400",
      }),
    [sizePreset.fontSize, colorPreset]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [onClick, element.id]);

  // 🚀 Phase 19: 전체 크기 계산 (hitArea용)
  const totalHeight = labelHeight + inputHeight + (isOpen ? dropdownHeight + 4 : 0);

  // 🚀 Phase 19: 투명 히트 영역 (전체 ComboBox 영역)
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, sizePreset.inputWidth, totalHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [sizePreset.inputWidth, totalHeight]
  );

  // 아이템 높이
  const itemHeight = sizePreset.itemPaddingY * 2 + sizePreset.fontSize;

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: sizePreset.inputWidth,
  }), [sizePreset.inputWidth]);

  // 🚀 Phase 12: 입력 필드 레이아웃
  const inputContainerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: sizePreset.inputWidth,
    height: inputHeight,
    paddingLeft: sizePreset.paddingX,
    paddingRight: sizePreset.paddingX,
    position: 'relative' as const,
  }), [sizePreset.inputWidth, inputHeight, sizePreset.paddingX]);

  // 🚀 Phase 12: 드롭다운 레이아웃
  const dropdownContainerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: sizePreset.inputWidth,
    paddingTop: sizePreset.paddingY,
    paddingBottom: sizePreset.paddingY,
    marginTop: 4,
    position: 'relative' as const,
  }), [sizePreset.inputWidth, sizePreset.paddingY]);

  // 🚀 Phase 12: 아이템 레이아웃
  const itemLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: sizePreset.inputWidth,
    height: itemHeight,
    paddingLeft: sizePreset.itemPaddingX,
    paddingRight: sizePreset.itemPaddingX,
    position: 'relative' as const,
  }), [sizePreset.inputWidth, itemHeight, sizePreset.itemPaddingX]);

  return (
    <pixiContainer layout={rootLayout}>
      {/* 라벨 */}
      {label && (
        <pixiText text={label} style={labelTextStyle} layout={{ isLeaf: true }} />
      )}

      {/* ComboBox 그룹 */}
      <pixiContainer layout={{ display: 'flex', flexDirection: 'column' }}>
        {/* Input 영역 */}
        <pixiContainer layout={inputContainerLayout}>
          <pixiGraphics
            draw={drawInput}
            layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />

          {/* 값 또는 placeholder */}
          <pixiText
            text={value || placeholder}
            style={valueTextStyle}
            layout={{ isLeaf: true, flexGrow: 1 }}
          />

          {/* Chevron 버튼 */}
          <pixiGraphics draw={drawButton} />
        </pixiContainer>

        {/* 드롭다운 (isOpen일 때만) */}
        {isOpen && (
          <pixiContainer layout={dropdownContainerLayout}>
            {/* 드롭다운 배경 */}
            <pixiGraphics
              draw={drawDropdown}
              layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />

            {/* 아이템들 */}
            {itemsData.map((item) => (
              <pixiContainer key={item.id} layout={itemLayout}>
                {/* 아이템 배경 */}
                <pixiGraphics
                  draw={(g) => drawItemBackground(g, item)}
                  layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />

                {/* 아이템 텍스트 */}
                <pixiText
                  text={item.text}
                  style={createItemTextStyle(item)}
                  layout={{ isLeaf: true }}
                />
              </pixiContainer>
            ))}
          </pixiContainer>
        )}
      </pixiContainer>

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - 마지막에 렌더링하여 최상단 배치 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </pixiContainer>
  );
});

export default PixiComboBox;
