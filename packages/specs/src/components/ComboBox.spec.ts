/**
 * ComboBox Component Spec
 *
 * Material Design 3 기반 콤보박스 컴포넌트 (입력 + 드롭다운)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * ComboBox Props
 */
export interface ComboBoxProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
  inputValue?: string;
  selectedText?: string;
  description?: string;
  errorMessage?: string;
  isOpen?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  /** 드롭다운 아이템 목록 */
  items?: string[];
  /** 선택된 아이템 인덱스 (하이라이트용) */
  selectedIndex?: number;
  children?: string;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite에서 주입: 자식 Element 존재 시 spec shapes에서 label 렌더링 스킵 */
  _hasChildren?: boolean;
}

/**
 * ComboBox Component Spec
 */
export const ComboBoxSpec: ComponentSpec<ComboBoxProps> = {
  name: 'ComboBox',
  description: 'Material Design 3 기반 콤보박스 컴포넌트 (입력 + 드롭다운)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error-hover}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 10,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 4,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 18,
      gap: 6,
    },
    lg: {
      height: 48,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 22,
      gap: 8,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const width = (props.style?.width as number) || 200;
      const chevronSize = size.iconSize ?? 18;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      const bgColor = props.style?.backgroundColor
                    ?? (state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background);

      const borderColor = props.style?.borderColor
                        ?? ((state === 'hover' && variant.borderHover)
                            ? variant.borderHover
                            : variant.border);

      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : defaultBw;

      // size.fontSize는 TokenRef 문자열('{typography.text-md}')일 수 있으므로
      // resolveToken으로 숫자 변환 후 산술 연산에 사용
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 14;

      // CSS 정합성: React-Aria ComboBox 실제 렌더링 기준
      // .react-aria-Label: fontSize=14, lineHeight=1.5 → height=21
      // gap: 8px (flex gap)
      // input: height = fontSize + paddingY*2 = 30px (md 기준)
      const labelLineHeight = Math.ceil(fontSize * 1.5);
      const labelGap = 8;
      const labelOffset = labelLineHeight + labelGap; // 29px for md
      const inputHeight = fontSize + (size.paddingY as number) * 2; // 30px for md

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const textColor = props.style?.color
                      ?? variant.text;

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      const shapes: Shape[] = [];
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      // 라벨 — 자식 Element가 있으면 스킵 (TextSprite가 렌더링)
      // 자식이 없으면 (기존 요소 호환) spec shapes에서 직접 렌더링
      if (props.label && !hasChildren) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 입력 영역 배경 — CSS 정합: y=labelOffset(29), height=inputHeight(30)
      const inputY = props.label ? labelOffset : 0;
      shapes.push({
        id: 'input',
        type: 'roundRect' as const,
        x: 0,
        y: inputY,
        width,
        height: inputHeight,
        radius: borderRadius,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'input',
          borderWidth,
          color: props.isInvalid ? ('{color.error}' as TokenRef) : borderColor,
          radius: borderRadius,
        });
      }

      // 입력 텍스트
      const displayText = props.inputValue || props.placeholder || '';
      if (displayText) {
        shapes.push({
          type: 'text' as const,
          x: paddingX,
          y: inputY + inputHeight / 2,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fill: props.inputValue
            ? textColor
            : ('{color.on-surface-variant}' as TokenRef),
          align: textAlign,
          baseline: 'middle' as const,
        });
      }

      // 쉐브론 아이콘 (Lucide chevron-down SVG 경로)
      const chevX = width - paddingX - chevronSize / 2;
      const chevY = inputY + inputHeight / 2;
      shapes.push({
        type: 'icon_font' as const,
        iconName: 'chevron-down',
        x: chevX,
        y: chevY,
        fontSize: chevronSize,
        fill: '{color.on-surface-variant}' as TokenRef,
        strokeWidth: 2,
      });

      // 드롭다운 패널 (열린 상태)
      if (props.isOpen) {
        // inputValue로 아이템 필터링 (입력값이 있으면 포함된 항목만 표시)
        const allItems = props.items ?? ['Option 1', 'Option 2', 'Option 3'];
        const filterText = props.inputValue?.toLowerCase() ?? '';
        const dropdownItems = filterText
          ? allItems.filter((item) => item.toLowerCase().includes(filterText))
          : allItems;

        const itemH = 36;
        const dropdownPaddingY = 4;
        const dropdownHeight = dropdownItems.length > 0
          ? dropdownItems.length * itemH + dropdownPaddingY * 2
          : itemH + dropdownPaddingY * 2;
        const dropdownY = inputY + inputHeight + 4;

        shapes.push({
          type: 'shadow' as const,
          target: 'dropdown',
          offsetX: 0,
          offsetY: 4,
          blur: 8,
          color: 'rgba(0, 0, 0, 0.1)',
          alpha: 0.1,
        });
        shapes.push({
          id: 'dropdown',
          type: 'roundRect' as const,
          x: 0,
          y: dropdownY,
          width,
          height: dropdownHeight,
          radius: borderRadius,
          fill: '{color.surface-container}' as TokenRef,
        });
        shapes.push({
          type: 'border' as const,
          target: 'dropdown',
          borderWidth: 1,
          color: '{color.outline-variant}' as TokenRef,
          radius: borderRadius,
        });

        if (dropdownItems.length === 0) {
          // 결과 없음 텍스트
          shapes.push({
            type: 'text' as const,
            x: paddingX,
            y: dropdownY + dropdownPaddingY + itemH / 2,
            text: 'No results',
            fontSize,
            fontFamily: ff,
            fontWeight: 400,
            fill: '{color.on-surface-variant}' as TokenRef,
            align: 'left' as const,
            baseline: 'middle' as const,
          });
        } else {
          // 선택 인덱스 결정
          const selectedIdx = props.selectedIndex
            ?? (props.selectedText != null
                ? allItems.indexOf(props.selectedText)
                : -1);

          dropdownItems.forEach((item, i) => {
            const itemY = dropdownY + dropdownPaddingY + i * itemH;
            const isSelected = selectedIdx >= 0
              && allItems[selectedIdx] === item;

            // 선택된 아이템 하이라이트 배경
            if (isSelected) {
              shapes.push({
                type: 'roundRect' as const,
                x: 4,
                y: itemY + 2,
                width: width - 8,
                height: itemH - 4,
                radius: borderRadius,
                fill: '{color.primary-container}' as TokenRef,
              });
            }

            // 아이템 텍스트
            shapes.push({
              type: 'text' as const,
              x: paddingX,
              y: itemY + itemH / 2,
              text: String(item),
              fontSize,
              fontFamily: ff,
              fontWeight: isSelected ? 600 : 400,
              fill: isSelected
                ? ('{color.on-primary-container}' as TokenRef)
                : ('{color.on-surface}' as TokenRef),
              align: textAlign,
              baseline: 'middle' as const,
            });
          });
        }
      }

      // 설명 / 에러 메시지
      const descText = props.isInvalid && props.errorMessage ? props.errorMessage : props.description;
      if (descText) {
        const allItems = props.items ?? ['Option 1', 'Option 2', 'Option 3'];
        const filterText = props.inputValue?.toLowerCase() ?? '';
        const visibleCount = props.isOpen
          ? (filterText
              ? allItems.filter((item) => item.toLowerCase().includes(filterText)).length
              : allItems.length)
          : 0;
        const descY = props.isOpen
          ? inputY + inputHeight + 4
              + Math.max(visibleCount, 1) * 36 + 8 + 4
          : inputY + inputHeight + 4;
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: descY,
          text: descText,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: props.isInvalid ? ('{color.error}' as TokenRef) : ('{color.on-surface-variant}' as TokenRef),
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-open': props.isOpen || undefined,
      'data-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      'data-required': props.isRequired || undefined,
      role: 'combobox',
      'aria-expanded': props.isOpen || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
