/**
 * Pixi Select
 *
 * 🚀 Phase 6.3: @pixi/ui Select 래퍼
 *
 * @pixi/ui의 Select 컴포넌트를 xstudio Element 시스템과 통합
 * 드롭다운 선택 UI를 제공합니다.
 *
 * @since 2025-12-13 Phase 6.3
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { Select } from '@pixi/ui';
import { Container, Graphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';
import { drawBox } from '../utils';
import { getSelectSizePreset } from '../utils/cssVariableReader';

// ============================================
// Types
// ============================================

export interface PixiSelectProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================
// Style Conversion
// ============================================

interface SelectLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  paddingLeft: number;
  paddingRight: number;
  chevronSize: number;
}

/**
 * CSS 스타일을 Select 레이아웃 스타일로 변환
 * 🚀 Phase 0: CSS 동기화 - getSelectSizePreset() 사용
 */
function convertToSelectStyle(style: CSSStyle | undefined, size: string): SelectLayoutStyle {
  // 🚀 CSS에서 사이즈 프리셋 읽기
  const sizePreset = getSelectSizePreset(size);

  // 높이 계산: fontSize + paddingY * 2 + border (대략적 추정)
  const defaultHeight = sizePreset.fontSize + sizePreset.paddingY * 2 + 8;

  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 200),
    height: parseCSSSize(style?.height, undefined, defaultHeight),
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xffffff),
    borderColor: cssColorToHex(style?.borderColor, 0xd1d5db),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 1),
    borderRadius: parseCSSSize(style?.borderRadius, undefined, sizePreset.borderRadius),
    textColor: cssColorToHex(style?.color, 0x000000),
    fontSize: parseCSSSize(style?.fontSize, undefined, sizePreset.fontSize),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    paddingLeft: parseCSSSize(style?.paddingLeft || style?.padding, undefined, sizePreset.paddingX),
    paddingRight: parseCSSSize(style?.paddingRight || style?.padding, undefined, sizePreset.paddingX),
    chevronSize: sizePreset.chevronSize,
  };
}

function parseSelectOptions(props: Record<string, unknown> | undefined): SelectOption[] {
  if (!props) return [];

  if (Array.isArray(props.options)) {
    return props.options.map((opt: unknown, index: number) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      if (typeof opt === 'object' && opt !== null) {
        const optObj = opt as Record<string, unknown>;
        return {
          value: String(optObj.value || optObj.id || index),
          label: String(optObj.label || optObj.name || optObj.value || ''),
        };
      }
      return { value: String(index), label: String(opt) };
    });
  }

  return [];
}

// ============================================
// Graphics Creation
// ============================================

/**
 * Select 버튼 배경 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
 */
function createSelectBackground(
  width: number,
  height: number,
  backgroundColor: number,
  borderColor: number,
  borderWidth: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();

  // Border-Box v2: drawBox 유틸리티 사용
  drawBox(g, {
    width,
    height,
    backgroundColor,
    backgroundAlpha: 1,
    borderRadius,
    border: {
      width: borderWidth,
      color: borderColor,
      alpha: 1,
      style: 'solid',
      radius: borderRadius,
    },
  });

  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiSelect
 *
 * @pixi/ui의 Select를 사용하여 드롭다운 렌더링
 *
 * @example
 * <PixiSelect
 *   element={selectElement}
 *   onChange={(id, value) => handleValueChange(id, value)}
 * />
 */
export const PixiSelect = memo(function PixiSelect({
  element,
  onClick,
  onChange,
}: PixiSelectProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<pixiContainer | null>(null);
  const selectRef = useRef<Select | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 🚀 Phase 0: size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // Select 스타일 (CSS 사이즈 프리셋 적용)
  const layoutStyle = useMemo(() => convertToSelectStyle(style, size), [style, size]);

  // 옵션들
  const options = useMemo(() => parseSelectOptions(props), [props]);

  // 선택된 값
  const selectedValue = useMemo(
    () => String(props?.value || props?.selectedValue || props?.defaultValue || ''),
    [props?.value, props?.selectedValue, props?.defaultValue]
  );

  // 이벤트 핸들러
  const handleChange = useCallback(
    (_index: number, value: string) => {
      onChange?.(element.id, value);
    },
    [element.id, onChange]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // Select 생성 및 관리
  useEffect(() => {
    if (!app?.stage || options.length === 0) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 텍스트 스타일
    const textStyle = new TextStyle({
      fontSize: layoutStyle.fontSize,
      fontFamily: layoutStyle.fontFamily,
      fill: layoutStyle.textColor,
    });

    // @pixi/ui Select 생성
    const select = new Select({
      closedBG: createSelectBackground(
        layoutStyle.width,
        layoutStyle.height,
        layoutStyle.backgroundColor,
        layoutStyle.borderColor,
        layoutStyle.borderWidth,
        layoutStyle.borderRadius
      ),
      openBG: createSelectBackground(
        layoutStyle.width,
        layoutStyle.height * (options.length + 1),
        layoutStyle.backgroundColor,
        layoutStyle.borderColor,
        layoutStyle.borderWidth,
        layoutStyle.borderRadius
      ),
      textStyle,
      items: {
        items: options.map((opt) => opt.label),
        backgroundColor: 0xf9fafb,
        hoverColor: 0xe5e7eb,
        width: layoutStyle.width,
        height: layoutStyle.height,
        textOffset: [layoutStyle.paddingLeft, 0],
      },
      scrollBox: {
        width: layoutStyle.width,
        height: layoutStyle.height * Math.min(options.length, 5),
      },
    });

    // 초기 값 설정
    const selectedIndex = options.findIndex((opt) => opt.value === selectedValue);
    if (selectedIndex >= 0) {
      select.value = selectedIndex;
    }

    // 이벤트 연결
    select.onSelect.connect(handleChange);

    // 컨테이너에 추가
    container.addChild(select);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    selectRef.current = select;

    return () => {
      // 이벤트 연결 해제
      select.onSelect.disconnectAll();
      container.off('pointerdown', handleClick);

      // Stage에서 제거
      app.stage.removeChild(container);

      // Select 내부 Graphics는 Select destroy시 자동 처리됨
      // Select 및 Container destroy
      select.destroy({ children: true });
      container.destroy({ children: true });

      containerRef.current = null;
      selectRef.current = null;
    };
  }, [app, layoutStyle, options, selectedValue, handleClick, handleChange]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiSelect;
