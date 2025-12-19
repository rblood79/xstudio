/**
 * Image Sprite
 *
 * 🚀 Phase 10 B1.2: Image 이미지 스프라이트
 * 🚀 Border-Box v2: border-box 방식 렌더링 대비
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-15 Border-Box v2 - drawBox 유틸리티 적용
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { useCallback, useMemo, useState, useEffect, memo } from 'react';
import { Graphics as PixiGraphics, Texture, Assets } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, type CSSStyle } from './styleConverter';
import { parsePadding, getContentBounds } from './paddingUtils';
import { drawBox, parseBorderConfig } from '../utils';

// ============================================
// Types
// ============================================

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface ImageSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
}

// ============================================
// Placeholder texture
// ============================================

const PLACEHOLDER_COLOR = 0xe5e7eb; // gray-200

// ============================================
// Component
// ============================================

export const ImageSprite = memo(function ImageSprite({ element, onClick }: ImageSpriteProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);
  const { transform, borderRadius } = converted;

  // Border-Box v2: border 지원 대비
  const borderConfig = useMemo(() => parseBorderConfig(style), [style]);
  const effectiveBorderRadius = typeof borderRadius === 'number' ? borderRadius : borderRadius?.[0] ?? 0;

  // Padding (paddingUtils 사용)
  const padding = useMemo(() => parsePadding(style), [style]);
  const contentBounds = useMemo(
    () => getContentBounds(transform.width, transform.height, padding),
    [transform.width, transform.height, padding]
  );

  // Image source
  const src = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    return String(props?.src || props?.source || '');
  }, [element.props]);

  // Texture state
  const [loaded, setLoaded] = useState<{ src: string; texture: Texture } | null>(null);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);

  // Load texture
  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    let loadedTextureRef: Texture | null = null;

    Assets.load(src)
      .then((loadedTexture: Texture) => {
        if (cancelled) {
          // 취소되었으면 로드된 텍스처 즉시 정리
          if (loadedTexture && !loadedTexture.destroyed) {
            loadedTexture.destroy(true);
          }
          return;
        }
        loadedTextureRef = loadedTexture;
        setLoaded({ src, texture: loadedTexture });
        setErrorSrc(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn(`[ImageSprite] Failed to load: ${src}`, error);
        setErrorSrc(src);
        setLoaded(null);
      });

    return () => {
      cancelled = true;
      // 이전 텍스처 정리 (Assets 캐시에서 제거하지 않고 참조만 해제)
      if (loadedTextureRef && !loadedTextureRef.destroyed) {
        // Note: destroy(true)는 baseTexture도 파괴함
        // Assets 캐시에 있는 경우 문제가 될 수 있으므로 false 사용
        loadedTextureRef.destroy(false);
        loadedTextureRef = null;
      }
    };
  }, [src]);

  const activeTexture = loaded?.src === src ? loaded.texture : null;
  const errorState = errorSrc === src;
  const loadingState = Boolean(src) && !activeTexture && !errorState;

  // Border-Box v2: Draw placeholder/error state with drawBox
  const drawPlaceholder = useCallback(
    (g: PixiGraphics) => {
      // Background with border-box support
      drawBox(g, {
        width: transform.width,
        height: transform.height,
        backgroundColor: PLACEHOLDER_COLOR,
        backgroundAlpha: 1,
        borderRadius: effectiveBorderRadius,
        border: borderConfig,
      });

      // Icon (simple image placeholder) - contentBounds 내에 배치
      const iconSize = Math.min(contentBounds.width, contentBounds.height) * 0.3;
      const iconX = contentBounds.x + (contentBounds.width - iconSize) / 2;
      const iconY = contentBounds.y + (contentBounds.height - iconSize) / 2;

      if (errorState) {
        // X mark for error - v8 Pattern: shape → stroke
        g.setStrokeStyle({ width: 3, color: 0xef4444 }); // red-500
        g.moveTo(iconX, iconY);
        g.lineTo(iconX + iconSize, iconY + iconSize);
        g.moveTo(iconX + iconSize, iconY);
        g.lineTo(iconX, iconY + iconSize);
        g.stroke();
      } else {
        // Mountain/sun icon for placeholder - v8 Pattern: shape → fill
        g.moveTo(iconX, iconY + iconSize);
        g.lineTo(iconX + iconSize * 0.3, iconY + iconSize * 0.5);
        g.lineTo(iconX + iconSize * 0.5, iconY + iconSize * 0.7);
        g.lineTo(iconX + iconSize * 0.7, iconY + iconSize * 0.3);
        g.lineTo(iconX + iconSize, iconY + iconSize);
        g.closePath();
        g.fill({ color: 0x9ca3af, alpha: 1 }); // gray-400

        // Sun - v8 Pattern: shape → fill
        g.circle(iconX + iconSize * 0.7, iconY + iconSize * 0.25, iconSize * 0.1);
        g.fill({ color: 0x9ca3af, alpha: 1 }); // gray-400
      }
    },
    [transform.width, transform.height, effectiveBorderRadius, borderConfig, errorState, contentBounds]
  );

  // Draw border for loaded image (selection handled by SelectionBox)
  const drawOverlay = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      // Border or other overlay effects can be added here if needed
    },
    [transform]
  );

  const handleClick = useCallback((e: unknown) => {
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
  }, [element.id, onClick]);

  return (
    <pixiContainer
      x={transform.x}
      y={transform.y}
    >
      {/* Image or Placeholder - clickable (padding 적용) */}
      {activeTexture && !errorState ? (
        <>
          <pixiSprite
            texture={activeTexture}
            x={contentBounds.x}
            y={contentBounds.y}
            width={contentBounds.width}
            height={contentBounds.height}
            eventMode="static"
            cursor="pointer"
            onPointerDown={handleClick}
          />
          <pixiGraphics draw={drawOverlay} />
        </>
      ) : (
        <pixiGraphics
          draw={drawPlaceholder}
          eventMode="static"
          cursor="pointer"
          onPointerDown={handleClick}
        />
      )}

      {/* Loading indicator - v8 Pattern: shape → fill (padding 적용) */}
      {loadingState && (
        <pixiGraphics
          draw={(g) => {
            g.clear();
            const size = Math.min(contentBounds.width, contentBounds.height) * 0.2;
            const centerX = contentBounds.x + contentBounds.width / 2;
            const centerY = contentBounds.y + contentBounds.height / 2;
            g.circle(centerX, centerY, size);
            g.fill({ color: 0x3b82f6, alpha: 0.3 });
          }}
        />
      )}
    </pixiContainer>
  );
});

export default ImageSprite;
