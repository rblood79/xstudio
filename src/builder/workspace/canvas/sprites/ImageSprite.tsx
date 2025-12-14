/**
 * Image Sprite
 *
 * 🚀 Phase 10 B1.2: Image 이미지 스프라이트
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Graphics as PixiGraphics, Texture, Assets } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { convertStyle, type CSSStyle } from './styleConverter';
import { parsePadding, getContentBounds } from './paddingUtils';

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

export function ImageSprite({ element, isSelected, onClick }: ImageSpriteProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const converted = useMemo(() => convertStyle(style), [style]);
  const { transform, borderRadius } = converted;

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

    Assets.load(src)
      .then((loadedTexture: Texture) => {
        if (cancelled) return;
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
    };
  }, [src]);

  const activeTexture = loaded?.src === src ? loaded.texture : null;
  const errorState = errorSrc === src;
  const loadingState = Boolean(src) && !activeTexture && !errorState;

  // Draw placeholder/error state (padding 적용)
  const drawPlaceholder = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background - v8 Pattern: shape → fill
      if (borderRadius && typeof borderRadius === 'number' && borderRadius > 0) {
        g.roundRect(0, 0, transform.width, transform.height, borderRadius);
      } else {
        g.rect(0, 0, transform.width, transform.height);
      }
      g.fill({ color: PLACEHOLDER_COLOR, alpha: 1 });

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

      // Selection highlight
      if (isSelected) {
        g.setStrokeStyle({ width: 2, color: 0x3b82f6, alpha: 1 });
        g.rect(-1, -1, transform.width + 2, transform.height + 2);
        g.stroke();
      }
    },
    [transform, borderRadius, errorState, isSelected, contentBounds]
  );

  // Draw border/selection for loaded image
  const drawOverlay = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (isSelected) {
        g.setStrokeStyle({ width: 2, color: 0x3b82f6, alpha: 1 });
        g.rect(-1, -1, transform.width + 2, transform.height + 2);
        g.stroke();
      }
    },
    [transform, isSelected]
  );

  const handleClick = useCallback((e: { metaKey?: boolean; shiftKey?: boolean; ctrlKey?: boolean }) => {
    onClick?.(element.id, {
      metaKey: e.metaKey ?? false,
      shiftKey: e.shiftKey ?? false,
      ctrlKey: e.ctrlKey ?? false,
    });
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
}

export default ImageSprite;
