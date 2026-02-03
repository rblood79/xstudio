/**
 * Pixi ToggleButtonGroup
 *
 * 🚀 Phase 1: ToggleButtonGroup WebGL 컴포넌트 (Pattern C)
 *
 * Store에서 자식 ToggleButton 요소들을 읽어 그룹으로 렌더링
 * - variant (default, primary, secondary, surface) 지원
 * - size (sm, md, lg) 지원
 * - selectionMode: single (기본) / multiple
 * - orientation: horizontal (기본) / vertical
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
  CanvasTextMetrics,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, cssColorToAlpha, parseCSSSize } from "../sprites/styleConverter";
import { parsePadding, parseBorderWidth } from "../sprites/paddingUtils";
import {
  getToggleButtonSizePreset,
  getVariantColors,
} from "../utils/cssVariableReader";
import { drawBox, parseBorderConfig } from "../utils";
import { useStore } from "../../../stores";
import { useThemeColors } from "../hooks/useThemeColors";

// ============================================
// Types
// ============================================

export interface PixiToggleButtonGroupProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, selectedKeys: string[]) => void;
}

interface ToggleButtonItem {
  id: string;
  value: string;
  label: string;
  isDisabled?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_GAP = 4;
const MIN_BUTTON_WIDTH = 48;

// ============================================
// Helper Functions
// ============================================

/**
 * 자식 ToggleButton 요소들에서 아이템 파싱
 */
function parseToggleButtonsFromChildren(childButtons: Element[]): ToggleButtonItem[] {
  if (childButtons.length === 0) return [];

  return childButtons
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((button, index) => {
      const props = button.props as Record<string, unknown> | undefined;
      return {
        id: button.id,
        value: String(props?.value || props?.id || button.id || index),
        label: String(props?.children || props?.label || props?.text || `Button ${index + 1}`),
        isDisabled: Boolean(props?.isDisabled),
      };
    });
}

/**
 * props.items에서 아이템 파싱
 */
function parseToggleButtonsFromProps(props: Record<string, unknown> | undefined): ToggleButtonItem[] | null {
  if (!props || !Array.isArray(props.items) || props.items.length === 0) {
    return null;
  }

  return props.items.map((item: unknown, index: number) => {
    if (typeof item === "string") {
      return { id: String(index), value: item, label: item };
    }
    if (typeof item === "object" && item !== null) {
      const itemObj = item as Record<string, unknown>;
      return {
        id: String(itemObj.id || index),
        value: String(itemObj.value || itemObj.id || index),
        label: String(itemObj.label || itemObj.name || itemObj.text || `Button ${index + 1}`),
        isDisabled: Boolean(itemObj.isDisabled),
      };
    }
    return { id: String(index), value: String(index), label: String(item) };
  });
}

// ============================================
// Sub-Component: ToggleButtonItem
// ============================================

/** Variant colors type for ToggleButtonGroup */
interface VariantColors {
  bg: number;
  text: number;
}

interface ToggleButtonItemProps {
  item: ToggleButtonItem;
  isItemSelected: boolean;
  width: number;
  height: number;
  sizePreset: ReturnType<typeof getToggleButtonSizePreset>;
  variantColors: VariantColors;
  borderColor: number;
  onPress: (value: string) => void;
}

const ToggleButtonItemComponent = memo(function ToggleButtonItemComponent({
  item,
  isItemSelected,
  width,
  height,
  sizePreset,
  variantColors,
  borderColor,
  onPress,
}: ToggleButtonItemProps) {
  // 🚀 테마 색상 사용: 선택 상태에 따른 색상 결정
  const bgColor = isItemSelected ? variantColors.bg : 0xffffff;
  const borderCol = isItemSelected ? variantColors.bg : borderColor;
  const textCol = isItemSelected ? 0xffffff : variantColors.text;

  // 버튼 그리기
  const drawButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      drawBox(g, {
        width,
        height,
        backgroundColor: bgColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
        border: {
          width: 1,
          color: borderCol,
          alpha: 1,
          style: "solid",
          radius: sizePreset.borderRadius,
        },
      });
    },
    [width, height, bgColor, borderCol, sizePreset.borderRadius]
  );

  // 텍스트 스타일
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: textCol,
        align: "center",
      }),
    [sizePreset.fontSize, textCol]
  );

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    if (!item.isDisabled) {
      onPress(item.value);
    }
  }, [item.value, item.isDisabled, onPress]);

  const cursorStyle = item.isDisabled ? "not-allowed" : "pointer";
  const alpha = item.isDisabled ? 0.5 : 1;

  // 🚀 Phase 12: 버튼 레이아웃
  const buttonLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width,
    height,
    position: 'relative' as const,
  }), [width, height]);

  return (
    <pixiContainer layout={buttonLayout} alpha={alpha}>
      {/* 버튼 배경 - position: absolute */}
      <pixiGraphics
        draw={drawButton}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handlePointerDown}
      />

      {/* 버튼 텍스트 */}
      <pixiText
        text={item.label}
        style={textStyle}
        layout={{ isLeaf: true }}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handlePointerDown}
      />
    </pixiContainer>
  );
});

// ============================================
// Main Component
// ============================================

export const PixiToggleButtonGroup = memo(function PixiToggleButtonGroup({
  element,
  onClick,
  onChange,
}: PixiToggleButtonGroupProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // Store에서 자식 ToggleButton 요소들 가져오기
  const elements = useStore((state) => state.elements);
  const childButtons = useMemo(() => {
    return elements.filter(
      (el) => el.parent_id === element.id && el.tag === "ToggleButton"
    );
  }, [elements, element.id]);

  // 아이템들: 자식 요소 > props.items > 기본값
  const items = useMemo(() => {
    // 1. 자식 ToggleButton 요소들이 있으면 사용
    const fromChildren = parseToggleButtonsFromChildren(childButtons);
    if (fromChildren.length > 0) return fromChildren;

    // 2. props.items가 있으면 사용
    const fromProps = parseToggleButtonsFromProps(props);
    if (fromProps) return fromProps;

    // 3. 기본값
    return [
      { id: "1", value: "option1", label: "Option 1" },
      { id: "2", value: "option2", label: "Option 2" },
    ];
  }, [childButtons, props]);

  // variant와 size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 CSS에서 사이즈 프리셋 읽기
  const sizePreset = useMemo(() => getToggleButtonSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상 (default, primary, secondary, tertiary, error, surface)
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors) as VariantColors,
    [variant, themeColors]
  );

  // 기본 테두리 색상 (gray-300)
  const defaultBorderColor = 0xd1d5db;

  // selectionMode: "single" (기본) | "multiple"
  const selectionMode = useMemo(() => {
    return String(props?.selectionMode || "single");
  }, [props?.selectionMode]);

  // 선택된 키들
  const selectedKeys = useMemo(() => {
    // props.selectedKeys가 있으면 사용
    const keys = props?.selectedKeys || props?.value || props?.defaultSelectedKeys;

    if (Array.isArray(keys)) {
      return keys.map(String);
    }

    if (typeof keys === "string" || typeof keys === "number") {
      return [String(keys)];
    }

    // 자식 요소 중 isSelected가 true인 항목 찾기
    const selectedFromChildren = childButtons
      .filter((btn) => {
        const btnProps = btn.props as Record<string, unknown> | undefined;
        return Boolean(btnProps?.isSelected);
      })
      .map((btn) => {
        const btnProps = btn.props as Record<string, unknown> | undefined;
        return String(btnProps?.value || btn.id);
      });

    if (selectedFromChildren.length > 0) {
      return selectedFromChildren;
    }

    return [];
  }, [props?.selectedKeys, props?.value, props?.defaultSelectedKeys, childButtons]);

  // 방향: horizontal (기본) | vertical
  const isHorizontal = useMemo(() => {
    const orientation = String(props?.orientation || "horizontal");
    const flexDirection = (style as Record<string, unknown>)?.flexDirection;
    return orientation === "horizontal" || flexDirection === "row";
  }, [props?.orientation, style]);

  // gap
  // 🚀 Phase 8: parseCSSSize 제거 - fallback 값 직접 사용
  const gap = typeof style?.gap === 'number' ? style.gap : DEFAULT_GAP;

  // 🚀 Phase 13: 사용자 정의 스타일 파싱
  // backgroundColor
  const styleBackgroundColor = useMemo(() => {
    return cssColorToHex(style?.backgroundColor, 0xffffff);
  }, [style?.backgroundColor]);

  const styleBackgroundAlpha = useMemo(() => {
    if (!style?.backgroundColor) return 0.3; // 기본값
    return cssColorToAlpha(style.backgroundColor);
  }, [style?.backgroundColor]);

  // border
  const styleBorderConfig = useMemo(() => parseBorderConfig(style), [style]);

  // borderRadius
  const styleBorderRadius = useMemo(() => {
    const parsed = parseCSSSize(style?.borderRadius, undefined, undefined);
    return parsed ?? (sizePreset.borderRadius + 2);
  }, [style?.borderRadius, sizePreset.borderRadius]);

  // padding
  const stylePadding = useMemo(() => parsePadding(style), [style]);

  // 버튼 크기 계산 (텍스트 기반)
  const buttonSizes = useMemo(() => {
    const textStyle = new TextStyle({
      fontFamily: "Pretendard, sans-serif",
      fontSize: sizePreset.fontSize,
    });

    return items.map((item) => {
      const metrics = CanvasTextMetrics.measureText(item.label, textStyle);
      const width = Math.max(MIN_BUTTON_WIDTH, metrics.width + sizePreset.paddingX * 2);
      const height = metrics.height + sizePreset.paddingY * 2;
      return { width, height };
    });
  }, [items, sizePreset.fontSize, sizePreset.paddingX, sizePreset.paddingY]);

  // 전체 그룹 배경 크기 계산 (배경 그리기용)
  // 🚀 Phase 13: fit-content 지원
  // Yoga layout에서 padding을 처리하므로, 여기서는 content 크기만 계산
  const contentWidth = useMemo(() => {
    if (isHorizontal) {
      return buttonSizes.reduce((sum, s) => sum + s.width, 0) + gap * (items.length - 1);
    }
    return Math.max(...buttonSizes.map((s) => s.width));
  }, [isHorizontal, buttonSizes, gap, items.length]);

  const contentHeight = useMemo(() => {
    if (isHorizontal) {
      return Math.max(...buttonSizes.map((s) => s.height));
    }
    return buttonSizes.reduce((sum, s) => sum + s.height, 0) + gap * (items.length - 1);
  }, [isHorizontal, buttonSizes, gap, items.length]);

  // 배경 그리기용 총 크기 (padding 포함)
  const backgroundWidth = contentWidth + stylePadding.left + stylePadding.right;
  const backgroundHeight = contentHeight + stylePadding.top + stylePadding.bottom;

  // 그룹 배경 그리기 (pill 형태)
  // 🚀 Phase 13: 사용자 정의 스타일 적용
  // 🚀 Phase 14: Yoga 계산 크기 동적 사용
  const drawGroupBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 🚀 Phase 14: 부모 container의 Yoga 계산된 크기 사용
      // Yoga가 자동 계산한 fit-content 크기 (또는 축소된 크기)
      const parent = g.parent as { layout?: { computedWidth?: number; computedHeight?: number } } | undefined;
      const actualWidth = parent?.layout?.computedWidth ?? backgroundWidth;
      const actualHeight = parent?.layout?.computedHeight ?? backgroundHeight;

      // border 설정 (사용자 스타일 우선, 없으면 기본값)
      const borderConfig = styleBorderConfig ?? {
        width: 1,
        color: defaultBorderColor,
        alpha: 0.5,
        style: "solid" as const,
        radius: styleBorderRadius,
      };

      drawBox(g, {
        width: actualWidth,
        height: actualHeight,
        backgroundColor: styleBackgroundColor,
        backgroundAlpha: styleBackgroundAlpha,
        borderRadius: styleBorderRadius,
        border: borderConfig,
      });
    },
    [backgroundWidth, backgroundHeight, styleBackgroundColor, styleBackgroundAlpha, styleBorderRadius, styleBorderConfig, defaultBorderColor]
  );

  // 그룹 클릭 핸들러
  const handleGroupClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 아이템 선택 핸들러
  const handleItemPress = useCallback(
    (value: string) => {
      onClick?.(element.id);

      let newSelectedKeys: string[];

      if (selectionMode === "multiple") {
        // 다중 선택: 토글
        if (selectedKeys.includes(value)) {
          newSelectedKeys = selectedKeys.filter((k) => k !== value);
        } else {
          newSelectedKeys = [...selectedKeys, value];
        }
      } else {
        // 단일 선택: 이미 선택되어 있으면 유지, 아니면 새로 선택
        if (selectedKeys.includes(value)) {
          newSelectedKeys = selectedKeys; // 유지 (또는 빈 배열로 토글하려면 [])
        } else {
          newSelectedKeys = [value];
        }
      }

      onChange?.(element.id, newSelectedKeys);
    },
    [element.id, onClick, onChange, selectionMode, selectedKeys]
  );

  // 🚀 Phase 8: 주 컨테이너 layout (iframe CSS와 동기화)
  // CSS: .react-aria-ToggleButtonGroup { display: flex }
  // 🚀 Phase 13: fit-content 지원
  // - Yoga가 자식 크기에 기반하여 자동 계산 (width/height 생략)
  // - flexShrink: 1로 부모 영역 부족 시 축소
  // - padding: 자식들이 padding 안쪽에 배치되도록
  const groupLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: (isHorizontal ? 'row' : 'column') as 'row' | 'column',
    justifyContent: 'flex-start' as const,  // 자식들 main axis 시작점 정렬
    alignItems: 'flex-start' as const,      // 자식들 cross axis 시작점 정렬
    gap,
    // width/height 생략 - Yoga가 자식 기반으로 자동 계산 (fit-content)
    // padding: 자식들이 padding 안쪽에 배치되도록
    paddingTop: stylePadding.top,
    paddingRight: stylePadding.right,
    paddingBottom: stylePadding.bottom,
    paddingLeft: stylePadding.left,
    position: 'relative' as const,
    // fit-content: 부모 flex에서 늘어나지 않고, 부모 부족 시 축소
    flexGrow: 0,
    flexShrink: 1,
    alignSelf: 'flex-start' as const,
  }), [isHorizontal, gap, stylePadding]);

  return (
    <pixiContainer
      layout={groupLayout}
      eventMode="static"
      onPointerDown={handleGroupClick}
    >
      {/* 그룹 배경 - layout 제거하여 flex에서 제외 (PixiButton 패턴) */}
      <pixiGraphics
        draw={drawGroupBackground}
        eventMode="none"
      />

      {/* 토글 버튼 아이템들 */}
      {items.map((item, index) => {
        const isItemSelected = selectedKeys.includes(item.value);

        return (
          <ToggleButtonItemComponent
            key={item.id}
            item={item}
            isItemSelected={isItemSelected}
            width={buttonSizes[index].width}
            height={buttonSizes[index].height}
            sizePreset={sizePreset}
            variantColors={variantColors}
            borderColor={defaultBorderColor}
            onPress={handleItemPress}
          />
        );
      })}
    </pixiContainer>
  );
});

export default PixiToggleButtonGroup;
