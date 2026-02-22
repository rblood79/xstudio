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
import { convertStyle, cssColorToHex, cssColorToAlpha, buildSkiaEffects, parseTransformOrigin, applyTransformOrigin, parseClipPath, type CSSStyle } from './styleConverter';
import { parseZIndex, createsStackingContext } from '../layout/engines/cssStackingContext';
import { parsePadding, getContentBounds } from './paddingUtils';
import { drawBox, parseBorderConfig } from '../utils';
import { useSkiaNode } from '../skia/useSkiaNode';
import { LayoutComputedSizeContext } from '../layoutContext';
import { isFillV2Enabled } from '../../../../utils/featureFlags';
import { fillsToSkiaFillColor, fillsToSkiaFillStyle, cssBgImageToSkia } from '../../../panels/styles/utils/fillToSkia';
import { useElementScrollState } from '../../../stores/scrollState';


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

  // W3-5: overflow:scroll/auto 요소의 스크롤 상태 구독
  // useElementScrollState는 scrollMap 변경 시 리렌더를 트리거하여
  // skiaNodeData useMemo가 최신 scrollOffset을 반영하도록 한다.
  const overflow = style?.overflow;
  const isScrollable = overflow === 'scroll' || overflow === 'auto';
  const scrollState = useElementScrollState(isScrollable ? element.id : null);

  const { fill, borderRadius } = converted;
  const transform = useMemo(() => {
    if (!computedContainerSize) return converted.transform;

    const styleWidth = style?.width;
    const styleHeight = style?.height;
    const usesLayoutWidth = styleWidth === undefined || styleWidth === 'auto' ||
      styleWidth === 'fit-content' || styleWidth === 'min-content' || styleWidth === 'max-content' ||
      (typeof styleWidth === 'string' && styleWidth.endsWith('%'));
    const usesLayoutHeight = styleHeight === undefined || styleHeight === 'auto' ||
      styleHeight === 'fit-content' || styleHeight === 'min-content' || styleHeight === 'max-content' ||
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
      drawBox(g, {
        width: transform.width,
        height: transform.height,
        backgroundColor: fill.color,
        backgroundAlpha: fill.alpha,
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

  // P7.1: 텍스트 위치 (padding 적용 후 콘텐츠 영역)
  const contentBounds = useMemo(
    () => getContentBounds(transform.width, transform.height, padding),
    [transform.width, transform.height, padding]
  );
  const textX = contentBounds.x + contentBounds.width / 2;
  // verticalAlign에 따른 텍스트 Y 위치 조정
  const textY = useMemo(() => {
    const va = style?.verticalAlign;
    if (va === 'top') return contentBounds.y;
    if (va === 'bottom') return contentBounds.y + contentBounds.height;
    // middle(기본) → 중앙
    return contentBounds.y + contentBounds.height / 2;
  }, [style?.verticalAlign, contentBounds]);

  // Phase 6: Interaction 속성
  // pointer-events: none → eventMode="none" (이벤트 완전 무시)
  const isPointerEventsNone = style?.pointerEvents === 'none';
  // cursor: CSS 커서 값을 PixiJS cursor로 직접 매핑 (PixiJS 8은 CSS cursor 값을 그대로 지원)
  const pixiCursor = style?.cursor ?? 'default';

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

    // CSS background-image: url(...) → Skia ImageFill (Phase 4)
    // Fill V2가 없고 style.backgroundImage가 url() 형식일 때 처리
    // gradientFill이 이미 있으면 우선순위상 스킵
    let cssBgImageFill = gradientFill ? undefined
      : (() => {
          const bgImg = style?.backgroundImage;
          if (!bgImg || !bgImg.startsWith('url(')) return undefined;
          // url("...") 또는 url(...) 에서 순수 URL 추출
          const urlMatch = bgImg.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
          if (!urlMatch) return undefined;
          const url = urlMatch[1];
          return cssBgImageToSkia(
            url,
            transform.width,
            transform.height,
            style?.backgroundSize,
            style?.backgroundPosition,
            style?.backgroundRepeat,
          ) ?? undefined;
        })();

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

    // CSS transform → CanvasKit 3x3 matrix (transform-origin 적용)
    let skiaTransform: Float32Array | undefined;
    if (skiaEffects.transform) {
      const [ox, oy] = parseTransformOrigin(
        style?.transformOrigin,
        transform.width,
        transform.height,
      );
      skiaTransform = applyTransformOrigin(skiaEffects.transform, ox, oy);
    }

    const zIndex = parseZIndex(style?.zIndex);
    const isStackingCtx = createsStackingContext(style as Record<string, unknown>);

    return {
      type: 'box' as const,
      x: transform.x,
      y: transform.y,
      width: transform.width,
      height: transform.height,
      visible: style?.display !== 'none' && style?.display !== 'contents' && style?.visibility !== 'hidden' && style?.visibility !== 'collapse',
      ...((style?.overflow === 'hidden' || style?.overflow === 'clip' || style?.overflow === 'scroll' || style?.overflow === 'auto')
        ? { clipChildren: true }
        : {}),
      ...((style?.overflow === 'scroll' || style?.overflow === 'auto')
        ? (() => {
            // W3-5: scrollState는 useElementScrollState hook으로 구독하여 갱신 시 리렌더됨
            const scroll = scrollState;
            if (!scroll) return {};
            const result: Record<string, unknown> = {
              scrollOffset: { scrollTop: scroll.scrollTop, scrollLeft: scroll.scrollLeft },
            };
            // Phase E: 스크롤바 UI 데이터 (maxScroll > 0 일 때만)
            const w = transform.width;
            const h = transform.height;
            const scrollbar: Record<string, unknown> = {};
            if (scroll.maxScrollTop > 0) {
              const contentH = h + scroll.maxScrollTop;
              const thumbH = Math.max(20, (h / contentH) * h);
              const thumbY = scroll.maxScrollTop > 0
                ? (scroll.scrollTop / scroll.maxScrollTop) * (h - thumbH) : 0;
              scrollbar.vertical = { trackHeight: h, thumbHeight: thumbH, thumbY };
            }
            if (scroll.maxScrollLeft > 0) {
              const contentW = w + scroll.maxScrollLeft;
              const thumbW = Math.max(20, (w / contentW) * w);
              const thumbX = scroll.maxScrollLeft > 0
                ? (scroll.scrollLeft / scroll.maxScrollLeft) * (w - thumbW) : 0;
              scrollbar.horizontal = { trackWidth: w, thumbWidth: thumbW, thumbX };
            }
            if (Object.keys(scrollbar).length > 0) {
              result.scrollbar = scrollbar;
            }
            return result;
          })()
        : {}),
      ...(skiaEffects.effects ? { effects: skiaEffects.effects } : {}),
      ...(fillBlendMode ? { blendMode: fillBlendMode } : skiaEffects.blendMode ? { blendMode: skiaEffects.blendMode } : {}),
      ...(skiaTransform ? { transform: skiaTransform } : {}),
      ...(zIndex !== undefined ? { zIndex } : {}),
      ...(isStackingCtx ? { isStackingContext: true } : {}),
      ...(style?.clipPath
        ? (() => {
            const parsed = parseClipPath(style.clipPath, transform.width, transform.height);
            return parsed ? { clipPath: parsed } : {};
          })()
        : {}),
      box: {
        fillColor,
        // 우선순위: cssBgImageFill > gradientFill
        ...(cssBgImageFill ? { fill: cssBgImageFill } : gradientFill ? { fill: gradientFill } : {}),
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
        strokeStyle: borderConfig?.style !== 'solid' && borderConfig?.style !== 'none'
          ? (borderConfig?.style as 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset') : undefined,
      },
    };
  }, [transform, fill, borderRadius, borderConfig, style, skiaEffects, fills, scrollState]);

  useSkiaNode(element.id, skiaNodeData);

  return (
    <pixiContainer x={transform.x} y={transform.y}>
      <pixiGraphics
        draw={draw}
        eventMode={isPointerEventsNone ? 'none' : 'static'}
        cursor={pixiCursor}
        {...(!isPointerEventsNone && { onPointerDown: handleClick })}
      />
      {textContent && (
        <pixiText
          text={textContent}
          style={textStyle}
          x={textX}
          y={textY}
          anchor={{ x: 0.5, y: style?.verticalAlign === 'top' ? 0 : style?.verticalAlign === 'bottom' ? 1 : 0.5 }}
          eventMode="none"
        />
      )}
    </pixiContainer>
  );
});

export default BoxSprite;
