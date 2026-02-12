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
import { cssColorToHex } from '../sprites/styleConverter';
import {
  SwitcherSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

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
/**
 * 🚀 Phase 8: parseCSSSize 제거 - CSS 프리셋 값 사용
 */
function convertToSwitcherStyle(style: CSSStyle | undefined, itemCount: number, size: string, themeDefaultColor: number): SwitcherLayoutStyle {
  const defaultWidth = 240;
  const width = typeof style?.width === 'number' ? style.width : defaultWidth;

  const sizeSpec = SwitcherSpec.sizes[size] || SwitcherSpec.sizes[SwitcherSpec.defaultSize];
  const specPreset = getSpecSizePreset(sizeSpec, 'light');
  const sizePreset = {
    trackHeight: specPreset.height ?? 32,
    labelFontSize: specPreset.fontSize ?? 14,
  };

  // Switcher 높이는 Switch indicator 높이와 유사하게 설정
  const defaultHeight = sizePreset.trackHeight + 8;

  return {
    x: typeof style?.left === 'number' ? style.left : 0,
    y: typeof style?.top === 'number' ? style.top : 0,
    width,
    height: typeof style?.height === 'number' ? style.height : defaultHeight,
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xe5e7eb),
    activeColor: cssColorToHex(style?.borderColor, themeDefaultColor),
    textColor: cssColorToHex(style?.color, 0x6b7280),
    activeTextColor: 0xffffff,
    fontSize: typeof style?.fontSize === 'number' ? style.fontSize : sizePreset.labelFontSize,
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    borderRadius: typeof style?.borderRadius === 'number' ? style.borderRadius : sizePreset.trackHeight / 2,
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
  onClick,
  onChange,
}: PixiSwitcherProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const switcherRef = useRef<Switcher | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 아이템들
  const items = useMemo(() => parseSwitcherItems(props), [props]);

  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);
  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);

  const variantColors = useMemo(() => {
    const variantSpec = SwitcherSpec.variants[variant] || SwitcherSpec.variants[SwitcherSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // Switcher 스타일 (CSS 사이즈 프리셋 + 테마 색상 적용)
  const layoutStyle = useMemo(() => convertToSwitcherStyle(style, items.length, size, variantColors.bg), [style, items.length, size, variantColors.bg]);

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
      (switcher as unknown as { selectView: (index: number) => void }).selectView(activeIndex);
    }

    // 이벤트 연결 (Switcher는 show/hide 기반이므로 클릭으로 변경 처리)
    itemViews.forEach((view, index) => {
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.on('pointerdown', (e) => {
        e.stopPropagation();
        (switcher as unknown as { selectView: (index: number) => void }).selectView(index);
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

    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      // 이벤트 연결 해제
      try {
        container.off('pointerdown', handleClick);
        itemViews.forEach((view) => {
          view.off('pointerdown');
          // view 내부 children (bg Graphics, Text) destroy
          view.children.forEach((child) => {
            if ('destroy' in child && typeof child.destroy === 'function') {
              child.destroy(true);
            }
          });
        });
      } catch {
        // CanvasTextSystem race condition - 무시
      }

      // Stage에서 제거
      try {
        app.stage.removeChild(container);
      } catch {
        // ignore
      }

      // Graphics 객체 명시적 destroy (GPU 리소스 해제)
      try {
        bg.destroy(true);
      } catch {
        // ignore
      }

      // Switcher 및 Container destroy
      try {
        if (!switcher.destroyed) {
          switcher.destroy();
        }
        if (!container.destroyed) {
          container.destroy({ children: true });
        }
      } catch {
        // ignore
      }

      containerRef.current = null;
      switcherRef.current = null;
    };
  }, [app, layoutStyle, items, activeIndex, handleClick, handleChange]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiSwitcher;
