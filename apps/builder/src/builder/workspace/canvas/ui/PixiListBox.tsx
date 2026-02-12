/**
 * Pixi ListBox
 *
 * 🚀 Phase 1: ListBox WebGL 컴포넌트 (Pattern C + Scroll)
 *
 * Store에서 자식 ListBoxItem 요소들을 읽어 선택 가능한 리스트 렌더링
 * - variant (primary, secondary, tertiary, error, filled, surface) 지원
 * - size (sm, md, lg) 지원
 * - selectionMode: single (기본) / multiple
 * - ScrollBox를 사용한 스크롤 지원
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
  Container as PixiContainer,
} from "pixi.js";
import { ScrollBox } from "@pixi/ui";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { toLayoutSize } from "../layout/styleToLayout";
import { drawBox } from "../utils";
import { useStore } from "../../../stores";

// 🚀 Spec Migration
import { resolveTokenColor } from '../hooks/useSpecRenderer';
import {
  ListBoxSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';
import type { TokenRef } from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiListBoxProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, selectedKeys: string[]) => void;
}

interface ListBoxItem {
  id: string;
  value: string;
  label: string;
  isDisabled?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * 자식 ListBoxItem 요소들에서 아이템 파싱
 */
function parseListBoxItemsFromChildren(childItems: Element[]): ListBoxItem[] {
  if (childItems.length === 0) return [];

  return childItems
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((item, index) => {
      const props = item.props as Record<string, unknown> | undefined;
      return {
        id: item.id,
        value: String(props?.value || props?.id || item.id || index),
        label: String(props?.children || props?.textValue || props?.label || props?.text || `Item ${index + 1}`),
        isDisabled: Boolean(props?.isDisabled),
      };
    });
}

/**
 * props.items에서 아이템 파싱
 */
function parseListBoxItemsFromProps(props: Record<string, unknown> | undefined): ListBoxItem[] | null {
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
        label: String(itemObj.label || itemObj.name || itemObj.text || `Item ${index + 1}`),
        isDisabled: Boolean(itemObj.isDisabled),
      };
    }
    return { id: String(index), value: String(index), label: String(item) };
  });
}

// ============================================
// Sub-Component: ListBoxItemComponent
// ============================================

interface ListBoxItemComponentProps {
  item: ListBoxItem;
  isItemSelected: boolean;
  width: number;
  height: number;
  sizePreset: {
    fontSize: number;
    height: number;
    paddingX: number;
    paddingY: number;
    borderRadius: number;
    gap: number;
    containerPadding: number;
    itemHeight: number;
    itemPaddingX: number;
  };
  colorPreset: {
    containerBackground: number;
    containerBorder: number;
    itemBackground: number;
    itemHoverBackground: number;
    itemSelectedBackground: number;
    textColor: number;
    selectedTextColor: number;
  };
  onPress: (value: string) => void;
}

const ListBoxItemComponent = memo(function ListBoxItemComponent({
  item,
  isItemSelected,
  width,
  height,
  sizePreset,
  colorPreset,
  onPress,
}: ListBoxItemComponentProps) {
  // 현재 상태에 따른 색상 선택
  const bgColor = isItemSelected
    ? colorPreset.itemSelectedBackground
    : colorPreset.itemBackground;
  const textCol = isItemSelected
    ? colorPreset.selectedTextColor
    : colorPreset.textColor;

  // 호버 상태 ref
  const isHoveredRef = useRef(false);
  const graphicsRef = useRef<PixiGraphics | null>(null);

  // 아이템 그리기
  const drawItem = useCallback(
    (g: PixiGraphics) => {
      graphicsRef.current = g;
      g.clear();

      const currentBgColor = isHoveredRef.current && !isItemSelected
        ? colorPreset.itemHoverBackground
        : bgColor;

      drawBox(g, {
        width,
        height,
        backgroundColor: currentBgColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
      });
    },
    [width, height, bgColor, isItemSelected, colorPreset.itemHoverBackground, sizePreset.borderRadius]
  );

  // 텍스트 스타일
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: textCol,
        fontWeight: isItemSelected ? "600" : "400",
      }),
    [sizePreset.fontSize, textCol, isItemSelected]
  );

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    if (!item.isDisabled) {
      onPress(item.value);
    }
  }, [item.value, item.isDisabled, onPress]);

  // 호버 핸들러
  const handlePointerOver = useCallback(() => {
    if (!item.isDisabled && graphicsRef.current) {
      isHoveredRef.current = true;
      const g = graphicsRef.current;
      g.clear();
      drawBox(g, {
        width,
        height,
        backgroundColor: isItemSelected ? bgColor : colorPreset.itemHoverBackground,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
      });
    }
  }, [item.isDisabled, isItemSelected, bgColor, colorPreset.itemHoverBackground, width, height, sizePreset.borderRadius]);

  const handlePointerOut = useCallback(() => {
    if (graphicsRef.current) {
      isHoveredRef.current = false;
      const g = graphicsRef.current;
      g.clear();
      drawBox(g, {
        width,
        height,
        backgroundColor: bgColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
      });
    }
  }, [bgColor, width, height, sizePreset.borderRadius]);

  const cursorStyle = item.isDisabled ? "not-allowed" : "pointer";
  const alpha = item.isDisabled ? 0.5 : 1;

  // 🚀 Phase 12: 아이템 레이아웃
  const itemLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width,
    height,
    paddingLeft: sizePreset.itemPaddingX,
    paddingRight: sizePreset.itemPaddingX,
    position: 'relative' as const,
  }), [width, height, sizePreset.itemPaddingX]);

  // 체크마크 스타일
  const checkmarkStyle = useMemo(() => new TextStyle({
    fontFamily: "Pretendard, sans-serif",
    fontSize: sizePreset.fontSize,
    fill: textCol,
    fontWeight: "600",
  }), [sizePreset.fontSize, textCol]);

  return (
    <pixiContainer layout={itemLayout} alpha={alpha}>
      {/* 아이템 배경 - position: absolute */}
      <pixiGraphics
        draw={drawItem}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* 아이템 텍스트 */}
      <pixiText
        text={item.label}
        style={textStyle}
        layout={{ isLeaf: true }}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handlePointerDown}
      />

      {/* 선택 체크마크 */}
      {isItemSelected && (
        <pixiText
          text="✓"
          style={checkmarkStyle}
          layout={{ isLeaf: true }}
          eventMode="none"
        />
      )}
    </pixiContainer>
  );
});

// ============================================
// Main Component
// ============================================

export const PixiListBox = memo(function PixiListBox({
  element,
  onClick,
  onChange,
}: PixiListBoxProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // Store에서 자식 ListBoxItem 요소들 가져오기
  const elements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return elements.filter(
      (el) => el.parent_id === element.id && el.tag === "ListBoxItem"
    );
  }, [elements, element.id]);

  // 아이템들: 자식 요소 > props.items > 기본값
  const items = useMemo(() => {
    // 1. 자식 ListBoxItem 요소들이 있으면 사용
    const fromChildren = parseListBoxItemsFromChildren(childItems);
    if (fromChildren.length > 0) return fromChildren;

    // 2. props.items가 있으면 사용
    const fromProps = parseListBoxItemsFromProps(props);
    if (fromProps) return fromProps;

    // 3. 기본값
    return [
      { id: "1", value: "item1", label: "Item 1" },
      { id: "2", value: "item2", label: "Item 2" },
      { id: "3", value: "item3", label: "Item 3" },
    ];
  }, [childItems, props]);

  // variant와 size
  const variant = useMemo(() => String(props?.variant || "primary"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);

  // 🚀 CSS / Spec에서 프리셋 읽기
  const sizePreset = useMemo(() => {
    const sizeSpec = ListBoxSpec.sizes[size] || ListBoxSpec.sizes[ListBoxSpec.defaultSize];
    const specPreset = getSpecSizePreset(sizeSpec, 'light');
    return {
      ...specPreset,
      containerPadding: specPreset.paddingX,
      itemHeight: specPreset.height,
      itemPaddingX: specPreset.paddingX,
      gap: specPreset.gap ?? 4,
    };
  }, [size]);

  const colorPreset = useMemo(() => {
    const variantSpec = ListBoxSpec.variants[variant] || ListBoxSpec.variants[ListBoxSpec.defaultVariant];
    const vc = getSpecVariantColors(variantSpec, 'light');
    return {
      containerBackground: vc.bg,
      containerBorder: vc.border ?? 0x79747e,
      itemBackground: vc.bg,
      itemHoverBackground: vc.bgHover,
      itemSelectedBackground: resolveTokenColor('{color.secondary-container}' as TokenRef, 'light'),
      textColor: vc.text,
      selectedTextColor: resolveTokenColor('{color.on-secondary-container}' as TokenRef, 'light'),
    };
  }, [variant]);

  // selectionMode: "single" (기본) | "multiple"
  const selectionMode = useMemo(() => {
    return String(props?.selectionMode || "single");
  }, [props?.selectionMode]);

  // 선택된 키들
  const selectedKeys = useMemo(() => {
    const keys = props?.selectedKeys || props?.value || props?.defaultSelectedKeys;

    if (Array.isArray(keys)) {
      return keys.map(String);
    }

    if (typeof keys === "string" || typeof keys === "number") {
      return [String(keys)];
    }

    // 자식 요소 중 isSelected가 true인 항목 찾기
    const selectedFromChildren = childItems
      .filter((item) => {
        const itemProps = item.props as Record<string, unknown> | undefined;
        return Boolean(itemProps?.isSelected);
      })
      .map((item) => {
        const itemProps = item.props as Record<string, unknown> | undefined;
        return String(itemProps?.value || item.id);
      });

    if (selectedFromChildren.length > 0) {
      return selectedFromChildren;
    }

    return [];
  }, [props?.selectedKeys, props?.value, props?.defaultSelectedKeys, childItems]);

  // 크기 계산
  // 🚀 Phase 8: parseCSSSize 제거 - fallback 값 직접 사용
  const containerWidth = typeof style?.width === 'number' ? style.width : 200;
  const containerHeight = typeof style?.height === 'number' ? style.height : 200;
  const itemWidth = containerWidth - sizePreset.containerPadding * 2;

  // layout prop용
  const containerLayoutWidth = toLayoutSize(style?.width, 200);
  const containerLayoutHeight = toLayoutSize(style?.height, 200);

  // 총 콘텐츠 높이
  const totalContentHeight = useMemo(() => {
    return items.length * (sizePreset.itemHeight + sizePreset.gap) - sizePreset.gap;
  }, [items.length, sizePreset.itemHeight, sizePreset.gap]);

  // 스크롤 필요 여부
  const needsScroll = totalContentHeight > containerHeight - sizePreset.containerPadding * 2;

  // ScrollBox ref
  const scrollBoxRef = useRef<ScrollBox | null>(null);
  const scrollContainerRef = useRef<PixiContainer | null>(null);

  // 컨테이너 배경 그리기
  const drawContainerBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      drawBox(g, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: colorPreset.containerBackground,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius + 4,
        border: {
          width: 1,
          color: colorPreset.containerBorder,
          alpha: 1,
          style: "solid",
          radius: sizePreset.borderRadius + 4,
        },
      });
    },
    [containerWidth, containerHeight, colorPreset.containerBackground, colorPreset.containerBorder, sizePreset.borderRadius]
  );

  // 그룹 클릭 핸들러
  const handleContainerClick = useCallback(() => {
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
        // 단일 선택
        if (selectedKeys.includes(value)) {
          newSelectedKeys = selectedKeys; // 유지
        } else {
          newSelectedKeys = [value];
        }
      }

      onChange?.(element.id, newSelectedKeys);
    },
    [element.id, onClick, onChange, selectionMode, selectedKeys]
  );

  // ScrollBox 설정 (useEffect로 명령형 처리)
  useEffect(() => {
    if (!needsScroll || !scrollContainerRef.current) return;

    // 기존 ScrollBox 제거
    if (scrollBoxRef.current) {
      scrollContainerRef.current.removeChild(scrollBoxRef.current);
      scrollBoxRef.current.destroy();
      scrollBoxRef.current = null;
    }

    // 새 ScrollBox 생성은 필요시 여기서 처리
    // 현재는 JSX 방식으로 충분히 구현됨

    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      if (scrollBoxRef.current) {
        try {
          if (!scrollBoxRef.current.destroyed) {
            scrollBoxRef.current.destroy();
          }
        } catch {
          // ignore
        }
        scrollBoxRef.current = null;
      }
    };
  }, [needsScroll]);

  // 🚀 Phase 8: 주 컨테이너 layout (iframe CSS와 동기화)
  // CSS: .react-aria-ListBox { display: flex; flex-direction: column; padding: var(--spacing-xs); gap: var(--spacing-2xs); }
  const containerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: containerLayoutWidth,
    height: containerLayoutHeight,
    padding: sizePreset.containerPadding,
    gap: sizePreset.gap,
    // 콘텐츠 크기에 맞춤 (부모 flex에서 늘어나지 않도록)
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start' as const,
  }), [containerLayoutWidth, containerLayoutHeight, sizePreset.containerPadding, sizePreset.gap]);

  // 🚀 Phase 12: 아이템 목록 컨테이너 레이아웃
  const itemsContainerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: sizePreset.gap,
    paddingTop: sizePreset.containerPadding,
    paddingBottom: sizePreset.containerPadding,
    paddingLeft: sizePreset.containerPadding,
    paddingRight: sizePreset.containerPadding,
  }), [sizePreset.containerPadding, sizePreset.gap]);

  return (
    <pixiContainer
      layout={containerLayout}
      eventMode="static"
      onPointerDown={handleContainerClick}
    >
      {/* 컨테이너 배경 - position: absolute */}
      <pixiGraphics
        draw={drawContainerBackground}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        eventMode="none"
      />

      {/* 아이템 컨테이너 */}
      <pixiContainer
        layout={itemsContainerLayout}
        ref={(c: PixiContainer | null) => {
          scrollContainerRef.current = c;
        }}
      >
        {/* 마스크 (스크롤 영역 클리핑) */}
        {needsScroll && (
          <pixiGraphics
            draw={(g: PixiGraphics) => {
              g.clear();
              g.rect(0, 0, containerWidth - sizePreset.containerPadding * 2, containerHeight - sizePreset.containerPadding * 2);
              g.fill({ color: 0xffffff });
            }}
            layout={{ position: 'absolute', top: 0, left: 0 }}
            eventMode="none"
          />
        )}

        {/* ListBox 아이템들 */}
        {items.map((item) => {
          const isItemSelected = selectedKeys.includes(item.value);

          return (
            <ListBoxItemComponent
              key={item.id}
              item={item}
              isItemSelected={isItemSelected}
              width={itemWidth}
              height={sizePreset.itemHeight}
              sizePreset={sizePreset}
              colorPreset={colorPreset}
              onPress={handleItemPress}
            />
          );
        })}
      </pixiContainer>
    </pixiContainer>
  );
});

export default PixiListBox;
