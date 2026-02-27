/**
 * Pixi ListBox
 *
 * 투명 히트 영역 전용 컴포넌트
 * Skia가 모든 시각적 렌더링을 담당하므로 @pixi/ui ScrollBox는 불필요.
 * 이벤트 히트 영역만 제공합니다.
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from "react";
import { Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { useStore } from "../../../stores";

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
    const fromChildren = parseListBoxItemsFromChildren(childItems);
    if (fromChildren.length > 0) return fromChildren;

    const fromProps = parseListBoxItemsFromProps(props);
    if (fromProps) return fromProps;

    return [
      { id: "1", value: "item1", label: "Item 1" },
      { id: "2", value: "item2", label: "Item 2" },
      { id: "3", value: "item3", label: "Item 3" },
    ];
  }, [childItems, props]);

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
  const containerWidth = typeof style?.width === 'number' ? style.width : 200;
  const containerHeight = typeof style?.height === 'number' ? style.height : 200;

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
        if (selectedKeys.includes(value)) {
          newSelectedKeys = selectedKeys.filter((k) => k !== value);
        } else {
          newSelectedKeys = [...selectedKeys, value];
        }
      } else {
        if (selectedKeys.includes(value)) {
          newSelectedKeys = selectedKeys;
        } else {
          newSelectedKeys = [value];
        }
      }

      onChange?.(element.id, newSelectedKeys);
    },
    [element.id, onClick, onChange, selectionMode, selectedKeys]
  );

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, containerWidth, containerHeight);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [containerWidth, containerHeight]
  );

  // 아이템별 히트 영역 그리기
  const itemHeight = 36;
  const containerPadding = 8;

  const drawItemHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const itemWidth = containerWidth - containerPadding * 2;
      g.rect(0, 0, itemWidth, itemHeight);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [containerWidth]
  );

  return (
    <pixiContainer
      eventMode="static"
      onPointerDown={handleContainerClick}
    >
      {/* 컨테이너 히트 영역 */}
      <pixiGraphics
        draw={drawHitArea}
        x={0}
        y={0}
        eventMode="none"
      />

      {/* 아이템별 히트 영역 */}
      {items.map((item) => (
        <pixiGraphics
          key={item.id}
          draw={drawItemHitArea}
          eventMode="static"
          cursor="pointer"
          onPointerDown={() => handleItemPress(item.value)}
        />
      ))}
    </pixiContainer>
  );
});

export default PixiListBox;
