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

import { memo, useCallback, useMemo } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
  CanvasTextMetrics,
  Container as PixiContainer,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getToggleButtonSizePreset,
  getToggleButtonColorPreset,
} from "../utils/cssVariableReader";
import { drawBox } from "../utils";
import { useStore } from "../../../stores";

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

interface ToggleButtonItemProps {
  item: ToggleButtonItem;
  isItemSelected: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  sizePreset: ReturnType<typeof getToggleButtonSizePreset>;
  colorPreset: ReturnType<typeof getToggleButtonColorPreset>;
  onPress: (value: string) => void;
}

const ToggleButtonItemComponent = memo(function ToggleButtonItemComponent({
  item,
  isItemSelected,
  x,
  y,
  width,
  height,
  sizePreset,
  colorPreset,
  onPress,
}: ToggleButtonItemProps) {
  // 현재 상태에 따른 색상 선택
  const bgColor = isItemSelected
    ? colorPreset.selectedBackground
    : colorPreset.background;
  const borderCol = isItemSelected
    ? colorPreset.selectedBorder
    : colorPreset.border;
  const textCol = isItemSelected
    ? colorPreset.selectedText
    : colorPreset.text;

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

  // 텍스트 중앙 정렬
  const textMetrics = CanvasTextMetrics.measureText(item.label, textStyle);
  const textX = (width - textMetrics.width) / 2;
  const textY = (height - textMetrics.height) / 2;

  const cursorStyle = item.isDisabled ? "not-allowed" : "pointer";
  const alpha = item.isDisabled ? 0.5 : 1;

  return (
    <pixiContainer x={x} y={y} alpha={alpha}>
      {/* 버튼 배경 */}
      <pixiGraphics
        draw={drawButton}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handlePointerDown}
      />

      {/* 버튼 텍스트 */}
      <pixiText
        text={item.label}
        style={textStyle}
        x={textX}
        y={textY}
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

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getToggleButtonSizePreset(size), [size]);
  const colorPreset = useMemo(() => getToggleButtonColorPreset(variant), [variant]);

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
  const gap = parseCSSSize(style?.gap, undefined, DEFAULT_GAP);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

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

  // 전체 그룹 배경 (옵션)
  const groupWidth = useMemo(() => {
    if (isHorizontal) {
      return buttonSizes.reduce((sum, s) => sum + s.width, 0) + gap * (items.length - 1);
    }
    return Math.max(...buttonSizes.map((s) => s.width));
  }, [isHorizontal, buttonSizes, gap, items.length]);

  const groupHeight = useMemo(() => {
    if (isHorizontal) {
      return Math.max(...buttonSizes.map((s) => s.height));
    }
    return buttonSizes.reduce((sum, s) => sum + s.height, 0) + gap * (items.length - 1);
  }, [isHorizontal, buttonSizes, gap, items.length]);

  // 그룹 배경 그리기 (pill 형태)
  const drawGroupBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      drawBox(g, {
        width: groupWidth,
        height: groupHeight,
        backgroundColor: colorPreset.background,
        backgroundAlpha: 0.3,
        borderRadius: sizePreset.borderRadius + 2,
        border: {
          width: 1,
          color: colorPreset.border,
          alpha: 0.5,
          style: "solid",
          radius: sizePreset.borderRadius + 2,
        },
      });
    },
    [groupWidth, groupHeight, colorPreset.background, colorPreset.border, sizePreset.borderRadius]
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

  // 아이템 위치 계산
  const itemPositions = useMemo(() => {
    let currentPos = 0;
    return buttonSizes.map((size) => {
      const pos = currentPos;
      currentPos += (isHorizontal ? size.width : size.height) + gap;
      return pos;
    });
  }, [buttonSizes, isHorizontal, gap]);

  return (
    <pixiContainer
      x={posX}
      y={posY}
      eventMode="static"
      onPointerDown={handleGroupClick}
    >
      {/* 그룹 배경 */}
      <pixiGraphics draw={drawGroupBackground} eventMode="none" />

      {/* 토글 버튼 아이템들 */}
      {items.map((item, index) => {
        const isItemSelected = selectedKeys.includes(item.value);
        const itemX = isHorizontal ? itemPositions[index] : 0;
        const itemY = isHorizontal ? 0 : itemPositions[index];

        return (
          <ToggleButtonItemComponent
            key={item.id}
            item={item}
            isItemSelected={isItemSelected}
            x={itemX}
            y={itemY}
            width={buttonSizes[index].width}
            height={buttonSizes[index].height}
            sizePreset={sizePreset}
            colorPreset={colorPreset}
            onPress={handleItemPress}
          />
        );
      })}
    </pixiContainer>
  );
});

export default PixiToggleButtonGroup;
