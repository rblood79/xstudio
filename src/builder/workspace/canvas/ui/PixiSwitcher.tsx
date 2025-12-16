/**
 * Pixi Switcher
 *
 * 🚀 Phase 6.6: @pixi/ui Switcher 래퍼
 *
 * @pixi/ui의 Switcher 컴포넌트를 xstudio Element 시스템과 통합
 * 여러 뷰 사이를 전환하는 탭/세그먼트 컨트롤을 제공합니다.
 *
 * @since 2025-12-13 Phase 6.6
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { Switcher } from '@pixi/ui';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';
import { getSwitchSizePreset } from '../utils/cssVariableReader';

// ============================================
// Types
// ============================================

export interface PixiSwitcherProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, activeIndex: number) => void;
}

interface SwitcherItem {
  label: string;
  value?: string;
}

// ============================================
// Style Conversion
// ============================================

interface SwitcherLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  activeColor: number;
  textColor: number;
  activeTextColor: number;
  fontSize: number;
  fontFamily: string;
  borderRadius: number;
  itemWidth: number;
}

/**
 * CSS 스타일을 Switcher 레이아웃 스타일로 변환
 * 🚀 Phase 0: CSS 동기화 - getSwitchSizePreset() 사용
 */
function convertToSwitcherStyle(style: CSSStyle | undefined, itemCount: number, size: string): SwitcherLayoutStyle {
  const width = parseCSSSize(style?.width, undefined, 240);

  // 🚀 CSS에서 사이즈 프리셋 읽기
  const sizePreset = getSwitchSizePreset(size);

  // Switcher 높이는 Switch indicator 높이와 유사하게 설정
  const defaultHeight = sizePreset.indicatorHeight + 8; // 약간의 패딩 추가

  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width,
    height: parseCSSSize(style?.height, undefined, defaultHeight),
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xe5e7eb),
    activeColor: cssColorToHex(style?.borderColor, 0x3b82f6),
    textColor: cssColorToHex(style?.color, 0x6b7280),
    activeTextColor: 0xffffff,
    fontSize: parseCSSSize(style?.fontSize, undefined, sizePreset.fontSize),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    borderRadius: parseCSSSize(style?.borderRadius, undefined, sizePreset.indicatorHeight / 2),
    itemWidth: itemCount > 0 ? width / itemCount : width,
  };
}

function parseSwitcherItems(props: Record<string, unknown> | undefined): SwitcherItem[] {
  if (!props) return [{ label: 'Tab 1' }, { label: 'Tab 2' }];

  if (Array.isArray(props.items)) {
    return props.items.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return { label: item, value: item };
      }
      if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        return {
          label: String(itemObj.label || itemObj.name || `Tab ${index + 1}`),
          value: String(itemObj.value || itemObj.id || index),
        };
      }
      return { label: `Tab ${index + 1}`, value: String(index) };
    });
  }

  // children 배열 처리
  if (Array.isArray(props.children)) {
    return props.children.map((child: unknown, index: number) => {
      if (typeof child === 'string') {
        return { label: child, value: child };
      }
      return { label: `Tab ${index + 1}`, value: String(index) };
    });
  }

  return [{ label: 'Tab 1' }, { label: 'Tab 2' }];
}

// ============================================
// Graphics Creation
// ============================================

/**
 * Switcher 배경 생성
 */
function createSwitcherBackground(
  width: number,
  height: number,
  color: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();
  g.roundRect(0, 0, width, height, borderRadius);
  g.fill({ color, alpha: 1 });
  return g;
}

/**
 * Switcher 아이템 뷰 생성
 */
function createItemView(
  width: number,
  height: number,
  label: string,
  isActive: boolean,
  style: SwitcherLayoutStyle
): Container {
  const container = new Container();

  // 배경
  const bg = new Graphics();
  bg.roundRect(2, 2, width - 4, height - 4, style.borderRadius - 2);
  bg.fill({
    color: isActive ? style.activeColor : style.backgroundColor,
    alpha: isActive ? 1 : 0,
  });
  container.addChild(bg);

  // 텍스트
  const textStyle = new TextStyle({
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fill: isActive ? style.activeTextColor : style.textColor,
  });
  const text = new Text({ text: label, style: textStyle });
  text.x = (width - text.width) / 2;
  text.y = (height - text.height) / 2;
  container.addChild(text);

  return container;
}

// ============================================
// Component
// ============================================

/**
 * PixiSwitcher
 *
 * @pixi/ui의 Switcher를 사용하여 탭/세그먼트 컨트롤 렌더링
 *
 * @example
 * <PixiSwitcher
 *   element={switcherElement}
 *   onChange={(id, activeIndex) => handleChange(id, activeIndex)}
 * />
 */
export const PixiSwitcher = memo(function PixiSwitcher({
  element,
  isSelected,
  onClick,
  onChange,
}: PixiSwitcherProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<pixiContainer | null>(null);
  const switcherRef = useRef<Switcher | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 아이템들
  const items = useMemo(() => parseSwitcherItems(props), [props]);

  // 🚀 Phase 0: size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // Switcher 스타일 (CSS 사이즈 프리셋 적용)
  const layoutStyle = useMemo(() => convertToSwitcherStyle(style, items.length, size), [style, items.length, size]);

  // 활성 인덱스
  const activeIndex = useMemo(() => {
    const idx = Number(props?.activeIndex ?? props?.value ?? 0);
    return Math.max(0, Math.min(items.length - 1, idx));
  }, [props?.activeIndex, props?.value, items.length]);

  // 이벤트 핸들러
  const handleChange = useCallback(
    (newIndex: number) => {
      onChange?.(element.id, newIndex);
    },
    [element.id, onChange]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // Switcher 생성 및 관리
  useEffect(() => {
    if (!app?.stage || items.length === 0) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 배경
    const bg = createSwitcherBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.backgroundColor,
      layoutStyle.borderRadius
    );
    container.addChild(bg);

    // 아이템 뷰 생성
    const itemViews = items.map((item, index) =>
      createItemView(
        layoutStyle.itemWidth,
        layoutStyle.height,
        item.label,
        index === activeIndex,
        layoutStyle
      )
    );

    // @pixi/ui Switcher 생성
    const switcher = new Switcher(itemViews);

    // 초기 선택
    if (activeIndex >= 0 && activeIndex < items.length) {
      switcher.show(activeIndex);
    }

    // 이벤트 연결 (Switcher는 show/hide 기반이므로 클릭으로 변경 처리)
    itemViews.forEach((view, index) => {
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.on('pointerdown', (e) => {
        e.stopPropagation();
        switcher.show(index);
        handleChange(index);
      });
    });

    // 아이템 위치 설정 및 컨테이너에 추가
    itemViews.forEach((view, index) => {
      view.x = index * layoutStyle.itemWidth;
      container.addChild(view);
    });

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    switcherRef.current = switcher;

    return () => {
      app.stage.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      switcherRef.current = null;
    };
  }, [app, layoutStyle, items, activeIndex, handleClick, handleChange]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiSwitcher;
