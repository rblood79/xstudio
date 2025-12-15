/**
 * Pixi Checkbox
 *
 * 🚀 Phase 11 B2.4: @pixi/layout 기반 Checkbox
 *
 * @pixi/layout의 LayoutContainer를 사용하여 CSS 스타일 직접 적용
 *
 * @since 2025-12-11 Phase 11 B2.4
 * @updated 2025-12-11 - @pixi/layout LayoutContainer 기반으로 리팩토링
 * @updated 2025-12-13 P5: pixiContainer 래퍼로 이벤트 처리 (GitHub #126 workaround)
 */

// @pixi/layout 컴포넌트 extend (JSX 사용 전 필수)
import '../pixiSetup';
// @pixi/layout React 타입 선언
import '@pixi/layout/react';

import { memo, useCallback, useMemo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiCheckboxProps {
  element: Element;
  isSelected?: boolean;
  onChange?: (elementId: string, checked: boolean) => void;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

function convertToCheckboxLayout(style: CSSStyle | undefined, isChecked: boolean) {
  const size = parseCSSSize(style?.width, undefined, 20);
  const primaryColor = cssColorToHex(style?.backgroundColor, 0x3b82f6);

  return {
    box: {
      width: size,
      height: size,
      backgroundColor: isChecked ? primaryColor : 0xffffff,
      borderRadius: parseCSSSize(style?.borderRadius, undefined, 4),
      borderWidth: 2,
      borderColor: isChecked ? primaryColor : 0xd1d5db,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    container: {
      left: parseCSSSize(style?.left, undefined, 0),
      top: parseCSSSize(style?.top, undefined, 0),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    label: {
      fill: cssColorToHex(style?.color, 0x000000),
      fontSize: parseCSSSize(style?.fontSize, undefined, 14),
      fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    },
    checkmark: {
      fill: 0xffffff,
      fontSize: size * 0.7,
    },
  };
}

// ============================================
// Component
// ============================================

export const PixiCheckbox = memo(function PixiCheckbox({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiCheckboxProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 체크 상태
  const isChecked = useMemo(() => {
    return Boolean(props?.isSelected || props?.checked || props?.defaultSelected);
  }, [props]);

  // 라벨 텍스트
  const labelText = useMemo(() => {
    return String(props?.children || props?.label || props?.text || '');
  }, [props]);

  // @pixi/layout 스타일
  const layoutStyles = useMemo(
    () => convertToCheckboxLayout(style, isChecked),
    [style, isChecked]
  );

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    onClick?.(element.id);
    onChange?.(element.id, !isChecked);
  }, [element.id, onClick, onChange, isChecked]);

  // P5 Workaround: pixiContainer로 이벤트 처리 (GitHub #126)
  return (
    <pixiContainer
      x={layoutStyles.container.left}
      y={layoutStyles.container.top}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handlePointerDown}
    >
      <layoutContainer
        layout={{
          flexDirection: layoutStyles.container.flexDirection,
          alignItems: layoutStyles.container.alignItems,
          gap: layoutStyles.container.gap,
        }}
      >
        {/* 체크박스 박스 */}
        <layoutContainer
          layout={{
            width: layoutStyles.box.width,
            height: layoutStyles.box.height,
            backgroundColor: layoutStyles.box.backgroundColor,
            borderRadius: layoutStyles.box.borderRadius,
            borderWidth: layoutStyles.box.borderWidth,
            borderColor: layoutStyles.box.borderColor,
            justifyContent: layoutStyles.box.justifyContent,
            alignItems: layoutStyles.box.alignItems,
          }}
        >
          {/* 체크마크 */}
          {isChecked && (
            <layoutText
              text="✓"
              style={{
                fill: layoutStyles.checkmark.fill,
                fontSize: layoutStyles.checkmark.fontSize,
                fontFamily: 'sans-serif',
              }}
              layout={true}
            />
          )}
        </layoutContainer>

        {/* 라벨 */}
        {labelText && (
          <layoutText
            text={labelText}
            style={{
              fill: layoutStyles.label.fill,
              fontSize: layoutStyles.label.fontSize,
              fontFamily: layoutStyles.label.fontFamily,
            }}
            layout={true}
          />
        )}

      </layoutContainer>
    </pixiContainer>
  );
});

export default PixiCheckbox;
