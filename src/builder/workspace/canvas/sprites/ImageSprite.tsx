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

// ============================================
// Types
// ============================================

export interface ImageSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
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

  // Image source
  const src = useMemo(() => {
    const props = element.props as Record<string, unknown> | undefined;
    return String(props?.src || props?.source || '');
  }, [element.props]);

  // Texture state
  const [texture, setTexture] = useState<Texture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Load texture
  useEffect(() => {
    if (!src) {
      setTexture(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    Assets.load(src)
      .then((loadedTexture: Texture) => {
        if (!cancelled) {
          setTexture(loadedTexture);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn(`[ImageSprite] Failed to load: ${src}`, error);
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Draw placeholder/error state
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

      // Icon (simple image placeholder)
      const iconSize = Math.min(transform.width, transform.height) * 0.3;
      const iconX = (transform.width - iconSize) / 2;
      const iconY = (transform.height - iconSize) / 2;

      if (hasError) {
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
    [transform, borderRadius, hasError, isSelected]
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

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  return (
    <pixiContainer
      x={transform.x}
      y={transform.y}
    >
      {/* Image or Placeholder - clickable */}
      {texture && !hasError ? (
        <>
          <pixiSprite
            texture={texture}
            width={transform.width}
            height={transform.height}
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

      {/* Loading indicator - v8 Pattern: shape → fill */}
      {isLoading && (
        <pixiGraphics
          draw={(g) => {
            g.clear();
            const size = Math.min(transform.width, transform.height) * 0.2;
            g.circle(transform.width / 2, transform.height / 2, size);
            g.fill({ color: 0x3b82f6, alpha: 0.3 });
          }}
        />
      )}
    </pixiContainer>
  );
}

export default ImageSprite;
