/**
 * Box Sprite
 *
 * 🚀 Phase 10 B1.2: Box, Flex, Grid 컨테이너 스프라이트
 * 🚀 P7.1: Padding 지원 추가 (TextSprite와 일관성)
 * 🚀 P7.9: borderStyle (dashed, dotted, double) 지원
 * 🚀 Border-Box v2: border-box 방식 렌더링
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-13 P7.1 - padding 속성 지원
 * @updated 2025-12-13 P7.9 - borderStyle 속성 지원
 * @updated 2025-12-15 Border-Box v2 - drawBox 유틸리티 적용
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { useCallback, useMemo, memo, useContext, useRef } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, cssColorToHex, cssColorToAlpha, buildSkiaEffects, type CSSStyle } from './styleConverter';
import { parsePadding, getContentBounds } from './paddingUtils';
import { drawBox, parseBorderConfig } from '../utils';
import { useSkiaNode } from '../skia/useSkiaNode';
import { LayoutComputedSizeContext } from '../layoutContext';
import { isFillV2Enabled, isDebugHitAreas, DEBUG_HIT_AREA_COLORS } from '../../../../utils/featureFlags';
import { fillsToSkiaFillColor, fillsToSkiaFillStyle } from '../../../panels/styles/utils/fillToSkia';


// ============================================
// Types
// ============================================

export interface BoxSpriteProps {
  element: Element;
  isSelected?: boolean;
  /** onClick callback with modifier keys for multi-select */
  onClick?: (elementId: string, modifiers?: { metaKey: boolean; shiftKey: boolean; ctrlKey: boolean }) => void;
  onDoubleClick?: (elementId: string) => void;
}

// ============================================
// Component
// ============================================

export const BoxSprite = memo(function BoxSprite({ element, onClick, onDoubleClick }: BoxSpriteProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);
  const computedContainerSize = useContext(LayoutComputedSizeContext);

  const { fill, borderRadius } = converted;
  const transform = useMemo(() => {
    if (!computedContainerSize) return converted.transform;

    const styleWidth = style?.width;
    const styleHeight = style?.height;
    const usesLayoutWidth = styleWidth === undefined || styleWidth === 'auto' ||
      (typeof styleWidth === 'string' && styleWidth.endsWith('%'));
    const usesLayoutHeight = styleHeight === undefined || styleHeight === 'auto' ||
      (typeof styleHeight === 'string' && styleHeight.endsWith('%'));

    if (!usesLayoutWidth && !usesLayoutHeight) return converted.transform;

    return {
      ...converted.transform,
      width: usesLayoutWidth ? computedContainerSize.width : converted.transform.width,
      height: usesLayoutHeight ? computedContainerSize.height : converted.transform.height,
    };
  }, [computedContainerSize, converted.transform, style?.height, style?.width]);

  // Border-Box v2: parseBorderConfig로 border 정보 추출
  const borderConfig = useMemo(() => parseBorderConfig(style), [style]);

  // 텍스트 내용 (children, text, label 등)
  const textContent = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    const content = props?.children || props?.text || props?.label;
    return content ? String(content) : '';
  }, [element.props]);

  // 텍스트 스타일
  const textStyle = useMemo(() => {
    return new TextStyle({
      fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
      fontSize: typeof style?.fontSize === 'number' ? style.fontSize : 14,
      fontWeight: (style?.fontWeight as 'normal' | 'bold') || 'normal',
      fill: cssColorToHex(style?.color, 0x000000),
      align: 'center',
    });
  }, [style]);

  // P7.1: Padding 파싱 (paddingUtils 사용)
  const padding = useMemo(() => parsePadding(style), [style]);

  // Border-Box v2: drawBox 유틸리티 사용
  const draw = useCallback(
    (g: PixiGraphics) => {
      const debug = isDebugHitAreas();
      const debugAlpha = (debug && fill.alpha === 0)
        ? DEBUG_HIT_AREA_COLORS.box.alpha : undefined;
      const debugColor = (debug && fill.alpha === 0)
        ? DEBUG_HIT_AREA_COLORS.box.color : undefined;
      drawBox(g, {
        width: transform.width,
        height: transform.height,
        backgroundColor: debugColor ?? fill.color,
        backgroundAlpha: debugAlpha ?? fill.alpha,
        borderRadius: typeof borderRadius === 'number' ? borderRadius : borderRadius?.[0] ?? 0,
        border: borderConfig,
      });
      // Selection highlight는 SelectionLayer에서 처리
    },
    [transform.width, transform.height, fill.color, fill.alpha, borderRadius, borderConfig]
  );

  const lastPointerDownRef = useRef(0);
  const handleClick = useCallback((e: unknown) => {
    const now = Date.now();
    const isDouble = now - lastPointerDownRef.current < 300;
    lastPointerDownRef.current = now;

    // PixiJS FederatedPointerEvent has modifier keys directly
    const pixiEvent = e as {
      metaKey?: boolean;
      shiftKey?: boolean;
      ctrlKey?: boolean;
      nativeEvent?: MouseEvent | PointerEvent;
    };

    // Try direct properties first (PixiJS v8), fallback to nativeEvent
    const metaKey = pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
    const shiftKey = pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
    const ctrlKey = pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

    onClick?.(element.id, { metaKey, shiftKey, ctrlKey });

    if (isDouble) {
      onDoubleClick?.(element.id);
    }
  }, [element.id, onClick, onDoubleClick]);

  // P7.1: 텍스트 위치 (padding 적용 후 콘텐츠 영역 중앙)
  const contentBounds = useMemo(
    () => getContentBounds(transform.width, transform.height, padding),
    [transform.width, transform.height, padding]
  );
  const textX = contentBounds.x + contentBounds.width / 2;
  const textY = contentBounds.y + contentBounds.height / 2;

  // Skia effects (opacity, boxShadow, filter, backdropFilter, mixBlendMode)
  const skiaEffects = useMemo(() => buildSkiaEffects(style), [style]);

  // Phase 5: Skia 렌더 데이터 부착
  // Fill V2: element.fills → fillsToSkiaFillColor 우선 사용
  const fills = element.fills;
  const skiaNodeData = useMemo(() => {
    // Fill V2: Feature Flag ON + fills 존재 시 fills 배열에서 fillColor 추출
    let fillColor: Float32Array;
    const fillV2Color = isFillV2Enabled() && fills && fills.length > 0
      ? fillsToSkiaFillColor(fills)
      : null;

    // Fill V2: 그래디언트 FillStyle 추출
    const fillV2Style = isFillV2Enabled() && fills && fills.length > 0
      ? fillsToSkiaFillStyle(fills, transform.width, transform.height)
      : null;
    // 그래디언트 FillStyle이면 box.fill로 사용 (color 타입은 fillColor로 처리)
    const gradientFill = fillV2Style && fillV2Style.type !== 'color' ? fillV2Style : undefined;

    // Fill V2: 최상위 enabled fill의 blendMode 추출
    let fillBlendMode: string | undefined;
    if (isFillV2Enabled() && fills && fills.length > 0) {
      for (let i = fills.length - 1; i >= 0; i--) {
        if (fills[i].enabled && fills[i].blendMode !== 'normal') {
          fillBlendMode = fills[i].blendMode;
          break;
        }
      }
    }

    if (fillV2Color) {
      fillColor = fillV2Color;
    } else {
      // 기존 backgroundColor → fillColor 폴백
      const r = ((fill.color >> 16) & 0xff) / 255;
      const g = ((fill.color >> 8) & 0xff) / 255;
      const b = (fill.color & 0xff) / 255;
      // opacity는 Skia effect로 처리하므로, fill alpha는 backgroundColor alpha만 사용
      const bgAlpha = skiaEffects.effects?.some(e => e.type === 'opacity')
        ? cssColorToAlpha(style?.backgroundColor)
        : fill.alpha;
      fillColor = Float32Array.of(r, g, b, bgAlpha);
    }

    // 배열 borderRadius는 그대로 전달하여 개별 모서리 radius 정보를 보존
    const br = borderRadius ?? 0;

    return {
      type: 'box' as const,
      x: transform.x,
      y: transform.y,
      width: transform.width,
      height: transform.height,
      visible: style?.display !== 'none' && style?.visibility !== 'hidden',
      ...(style?.overflow === 'hidden' ? { clipChildren: true } : {}),
      ...(skiaEffects.effects ? { effects: skiaEffects.effects } : {}),
      ...(fillBlendMode ? { blendMode: fillBlendMode } : skiaEffects.blendMode ? { blendMode: skiaEffects.blendMode } : {}),
      box: {
        fillColor,
        ...(gradientFill ? { fill: gradientFill } : {}),
        borderRadius: br,
        strokeColor: borderConfig
          ? (() => {
              const sc = borderConfig.color ?? 0x000000;
              return Float32Array.of(
                ((sc >> 16) & 0xff) / 255,
                ((sc >> 8) & 0xff) / 255,
                (sc & 0xff) / 255,
                borderConfig.alpha ?? 1,
              );
            })()
          : undefined,
        strokeWidth: borderConfig?.width,
      },
    };
  }, [transform, fill, borderRadius, borderConfig, style, skiaEffects, fills]);

  useSkiaNode(element.id, skiaNodeData);

  return (
    <pixiContainer x={transform.x} y={transform.y}>
      <pixiGraphics
        draw={draw}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
      />
      {textContent && (
        <pixiText
          text={textContent}
          style={textStyle}
          x={textX}
          y={textY}
          anchor={0.5}
        />
      )}
    </pixiContainer>
  );
});

export default BoxSprite;
