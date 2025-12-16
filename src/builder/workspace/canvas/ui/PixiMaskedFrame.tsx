/**
 * Pixi MaskedFrame
 *
 * 🚀 Phase 6.9: @pixi/ui MaskedFrame 래퍼
 *
 * @pixi/ui의 MaskedFrame 컴포넌트를 xstudio Element 시스템과 통합
 * 다양한 마스크 형태로 이미지를 클리핑합니다.
 *
 * @since 2025-12-13 Phase 6.9
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { MaskedFrame } from '@pixi/ui';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiMaskedFrameProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

type MaskShape = 'circle' | 'rounded' | 'ellipse' | 'rectangle';

// ============================================
// Style Conversion
// ============================================

interface MaskedFrameLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
  maskShape: MaskShape;
}

function convertToMaskedFrameStyle(style: CSSStyle | undefined, props: Record<string, unknown> | undefined): MaskedFrameLayoutStyle {
  // maskShape 결정
  let maskShape: MaskShape = 'rounded';
  if (props?.maskShape) {
    const shape = String(props.maskShape).toLowerCase();
    if (shape === 'circle') maskShape = 'circle';
    else if (shape === 'ellipse') maskShape = 'ellipse';
    else if (shape === 'rectangle' || shape === 'rect') maskShape = 'rectangle';
    else maskShape = 'rounded';
  } else if (style?.borderRadius === '50%' || style?.borderRadius === '100%') {
    maskShape = 'circle';
  }

  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 100),
    height: parseCSSSize(style?.height, undefined, 100),
    borderColor: cssColorToHex(style?.borderColor, 0xe5e7eb),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 0),
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 8),
    maskShape,
  };
}

// ============================================
// Graphics Creation
// ============================================

/**
 * 마스크 그래픽 생성
 */
function createMaskGraphics(
  width: number,
  height: number,
  shape: MaskShape,
  borderRadius: number
): Graphics {
  const g = new Graphics();

  switch (shape) {
    case 'circle': {
      const radius = Math.min(width, height) / 2;
      g.circle(width / 2, height / 2, radius);
      break;
    }
    case 'ellipse': {
      g.ellipse(width / 2, height / 2, width / 2, height / 2);
      break;
    }
    case 'rectangle': {
      g.rect(0, 0, width, height);
      break;
    }
    case 'rounded':
    default: {
      g.roundRect(0, 0, width, height, borderRadius);
      break;
    }
  }

  g.fill({ color: 0xffffff, alpha: 1 });
  return g;
}

/**
 * 플레이스홀더 이미지 생성 (그라데이션)
 */
function createPlaceholderGraphics(
  width: number,
  height: number
): Graphics {
  const g = new Graphics();

  // 체커보드 패턴으로 플레이스홀더 표시
  const gridSize = 10;
  for (let x = 0; x < width; x += gridSize) {
    for (let y = 0; y < height; y += gridSize) {
      const isEven = ((x / gridSize) + (y / gridSize)) % 2 === 0;
      g.rect(x, y, gridSize, gridSize);
      g.fill({ color: isEven ? 0xf3f4f6 : 0xe5e7eb, alpha: 1 });
    }
  }

  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiMaskedFrame
 *
 * @pixi/ui의 MaskedFrame을 사용하여 마스킹된 이미지 렌더링
 *
 * @example
 * <PixiMaskedFrame
 *   element={maskedFrameElement}
 *   onClick={(id) => handleClick(id)}
 * />
 */
export const PixiMaskedFrame = memo(function PixiMaskedFrame({
  element,
  isSelected,
  onClick,
}: PixiMaskedFrameProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<pixiContainer | null>(null);
  const maskedFrameRef = useRef<MaskedFrame | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // MaskedFrame 스타일
  const layoutStyle = useMemo(() => convertToMaskedFrameStyle(style, props), [style, props]);

  // 이미지 URL
  const imageUrl = useMemo(() => {
    return String(props?.src || props?.image || props?.url || '');
  }, [props?.src, props?.image, props?.url]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // MaskedFrame 생성 및 관리
  useEffect(() => {
    if (!app?.stage) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 마스크 생성
    const mask = createMaskGraphics(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.maskShape,
      layoutStyle.borderRadius
    );

    // 타겟 스프라이트/그래픽 생성
    let target: Sprite | Graphics;

    if (imageUrl) {
      // 이미지 로드
      const texture = Texture.from(imageUrl);
      target = new Sprite(texture);
      target.width = layoutStyle.width;
      target.height = layoutStyle.height;
    } else {
      // 플레이스홀더
      target = createPlaceholderGraphics(
        layoutStyle.width,
        layoutStyle.height
      );
    }

    // @pixi/ui MaskedFrame 생성
    const maskedFrame = new MaskedFrame({
      target,
      mask,
      borderWidth: layoutStyle.borderWidth,
      borderColor: layoutStyle.borderColor,
    });

    // 컨테이너에 추가
    container.addChild(maskedFrame);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    maskedFrameRef.current = maskedFrame;

    return () => {
      app.stage.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      maskedFrameRef.current = null;
    };
  }, [app, layoutStyle, imageUrl, handleClick]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiMaskedFrame;
