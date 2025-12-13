/**
 * Pixi Button
 *
 * 🚀 Phase 11 B2.4: @pixi/layout 기반 Button
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

export interface PixiButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

/**
 * CSS 스타일을 @pixi/layout 형식으로 변환
 */
function convertToLayoutStyle(style: CSSStyle | undefined) {
  if (!style) {
    return {
      width: 120,
      height: 40,
      backgroundColor: 0x3b82f6,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };
  }

  return {
    // 위치
    left: parseCSSSize(style.left, undefined, 0),
    top: parseCSSSize(style.top, undefined, 0),
    // 크기
    width: parseCSSSize(style.width, undefined, 120),
    height: parseCSSSize(style.height, undefined, 40),
    // 배경 & 테두리 (CSS 스타일 직접 적용!)
    backgroundColor: cssColorToHex(style.backgroundColor, 0x3b82f6),
    borderRadius: parseCSSSize(style.borderRadius, undefined, 8),
    // Flex 정렬 (버튼 텍스트 중앙)
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    // 패딩
    paddingLeft: parseCSSSize(style.paddingLeft || style.padding, undefined, 16),
    paddingRight: parseCSSSize(style.paddingRight || style.padding, undefined, 16),
    paddingTop: parseCSSSize(style.paddingTop || style.padding, undefined, 8),
    paddingBottom: parseCSSSize(style.paddingBottom || style.padding, undefined, 8),
  };
}

/**
 * 텍스트 스타일 변환
 */
function convertToTextLayout(style: CSSStyle | undefined) {
  return {
    fill: cssColorToHex(style?.color, 0xffffff),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
  };
}

// ============================================
// Component
// ============================================

/**
 * PixiButton
 *
 * @pixi/layout의 LayoutContainer를 사용하여 버튼 렌더링
 * CSS 스타일(backgroundColor, borderRadius)이 직접 적용됨
 *
 * @example
 * <PixiButton element={buttonElement} onClick={handleClick} />
 */
export const PixiButton = memo(function PixiButton({
  element,
  isSelected,
  onClick,
}: PixiButtonProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || 'Button');
  }, [props]);

  // @pixi/layout 스타일
  const layoutStyle = useMemo(() => convertToLayoutStyle(style), [style]);
  const textStyle = useMemo(() => convertToTextLayout(style), [style]);

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 선택 테두리 (별도 Graphics로 표시)
  const selectionStyle = useMemo(() => {
    if (!isSelected) return null;
    return {
      position: 'absolute' as const,
      left: -2,
      top: -2,
      width: layoutStyle.width + 4,
      height: layoutStyle.height + 4,
      borderColor: 0x3b82f6,
      borderWidth: 2,
      borderRadius: layoutStyle.borderRadius + 2,
    };
  }, [isSelected, layoutStyle]);

  // P5 Workaround: pixiContainer로 이벤트 처리 (GitHub #126)
  // @pixi/layout v3.2.0 LayoutContainer가 eventMode를 무시하는 버그 회피
  return (
    <pixiContainer
      x={layoutStyle.left}
      y={layoutStyle.top}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handlePointerDown}
    >
      <layoutContainer
        layout={{
          width: layoutStyle.width,
          height: layoutStyle.height,
          backgroundColor: layoutStyle.backgroundColor,
          borderRadius: layoutStyle.borderRadius,
          justifyContent: layoutStyle.justifyContent,
          alignItems: layoutStyle.alignItems,
          paddingLeft: layoutStyle.paddingLeft,
          paddingRight: layoutStyle.paddingRight,
          paddingTop: layoutStyle.paddingTop,
          paddingBottom: layoutStyle.paddingBottom,
          debug: false,
        }}
      >
        {/* 버튼 텍스트 */}
        <layoutText
          text={buttonText}
          style={{
            fill: textStyle.fill,
            fontSize: textStyle.fontSize,
            fontFamily: textStyle.fontFamily,
          }}
          layout={true}
        />

        {/* 선택 표시 (오버레이) */}
        {selectionStyle && (
          <layoutContainer
            layout={{
              position: 'absolute',
              left: selectionStyle.left,
              top: selectionStyle.top,
              width: selectionStyle.width,
              height: selectionStyle.height,
              borderColor: selectionStyle.borderColor,
              borderWidth: selectionStyle.borderWidth,
              borderRadius: selectionStyle.borderRadius,
            }}
          />
        )}
      </layoutContainer>
    </pixiContainer>
  );
});

export default PixiButton;
