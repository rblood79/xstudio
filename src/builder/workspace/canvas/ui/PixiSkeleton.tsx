/**
 * PixiSkeleton - WebGL Skeleton Loading Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Loading placeholder
 *
 * CSS 동기화:
 * - getSkeletonSizePreset(): height, borderRadius, avatarSize
 * - getSkeletonColorPreset(): baseColor, shimmerColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getSkeletonSizePreset,
  getSkeletonColorPreset,
} from '../utils/cssVariableReader';

export interface PixiSkeletonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiSkeleton - Loading placeholder skeleton
 */
export function PixiSkeleton({
  element,
  isSelected = false,
  onClick,
}: PixiSkeletonProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const skeletonVariant = (props.skeletonVariant as string) || 'text'; // text, avatar, card, list

  // Get presets from CSS
  const sizePreset = useMemo(() => getSkeletonSizePreset(size), [size]);
  const colorPreset = useMemo(() => getSkeletonColorPreset(variant), [variant]);

  // Calculate dimensions based on variant
  const getSkeletonDimensions = () => {
    switch (skeletonVariant) {
      case 'avatar':
        return {
          width: sizePreset.avatarSize,
          height: sizePreset.avatarSize,
          isCircle: true,
        };
      case 'card':
        return {
          width: (props.width as number) || 240,
          height: (props.height as number) || 120,
          isCircle: false,
        };
      case 'list':
        return {
          width: (props.width as number) || 280,
          height: sizePreset.lineHeight * 3 + sizePreset.lineGap * 2,
          isCircle: false,
        };
      case 'text':
      default:
        return {
          width: (props.width as number) || 200,
          height: sizePreset.height,
          isCircle: false,
        };
    }
  };

  const dimensions = getSkeletonDimensions();

  // Draw skeleton based on variant
  const drawSkeleton = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      switch (skeletonVariant) {
        case 'avatar':
          // Circle avatar
          g.circle(dimensions.width / 2, dimensions.height / 2, dimensions.width / 2);
          g.fill({ color: colorPreset.baseColor });
          break;

        case 'card': {
          // Card skeleton with image placeholder and text lines
          g.roundRect(0, 0, dimensions.width, dimensions.height, sizePreset.borderRadius);
          g.fill({ color: colorPreset.baseColor });

          // Image area (top half)
          const imageHeight = dimensions.height * 0.5;
          g.roundRect(0, 0, dimensions.width, imageHeight, sizePreset.borderRadius);
          g.fill({ color: colorPreset.shimmerColor });

          // Text lines (bottom half)
          const textStartY = imageHeight + sizePreset.lineGap;
          const textPadding = 12;

          // Title line
          g.roundRect(textPadding, textStartY, dimensions.width * 0.7, sizePreset.lineHeight, 4);
          g.fill({ color: colorPreset.shimmerColor });

          // Description line
          g.roundRect(textPadding, textStartY + sizePreset.lineHeight + sizePreset.lineGap / 2, dimensions.width * 0.5, sizePreset.lineHeight * 0.8, 4);
          g.fill({ color: colorPreset.shimmerColor });
          break;
        }

        case 'list':
          // List with avatar and text lines
          for (let i = 0; i < 3; i++) {
            const rowY = i * (sizePreset.avatarSize + sizePreset.lineGap);

            // Avatar placeholder
            g.circle(sizePreset.avatarSize / 2, rowY + sizePreset.avatarSize / 2, sizePreset.avatarSize / 2);
            g.fill({ color: colorPreset.baseColor });

            // Text lines
            const textX = sizePreset.avatarSize + sizePreset.lineGap;
            g.roundRect(textX, rowY + 4, dimensions.width * 0.5, sizePreset.lineHeight, 4);
            g.fill({ color: colorPreset.baseColor });

            g.roundRect(textX, rowY + sizePreset.lineHeight + 8, dimensions.width * 0.3, sizePreset.lineHeight * 0.8, 4);
            g.fill({ color: colorPreset.shimmerColor });
          }
          break;

        case 'text':
        default:
          // Simple text line
          g.roundRect(0, 0, dimensions.width, dimensions.height, sizePreset.borderRadius);
          g.fill({ color: colorPreset.baseColor });
          break;
      }

      // Selection indicator
      if (isSelected) {
        if (dimensions.isCircle) {
          g.circle(dimensions.width / 2, dimensions.height / 2, dimensions.width / 2 + 4);
          g.stroke({ color: 0x3b82f6, width: 2 });
        } else {
          g.roundRect(-2, -2, dimensions.width + 4, dimensions.height + 4, sizePreset.borderRadius + 2);
          g.stroke({ color: 0x3b82f6, width: 2 });
        }
      }
    },
    [dimensions, sizePreset, colorPreset, skeletonVariant, isSelected]
  );

  // Draw shimmer effect overlay (static representation)
  const drawShimmer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Draw a subtle gradient overlay to indicate shimmer
      const shimmerWidth = dimensions.width * 0.3;

      if (skeletonVariant === 'avatar') {
        // Circular shimmer for avatar
        g.arc(dimensions.width / 2, dimensions.height / 2, dimensions.width / 2, -0.5, 0.5);
        g.fill({ color: colorPreset.shimmerColor, alpha: 0.5 });
      } else if (skeletonVariant !== 'list') {
        // Rectangular shimmer highlight
        g.roundRect(dimensions.width * 0.3, 0, shimmerWidth, dimensions.height, sizePreset.borderRadius);
        g.fill({ color: colorPreset.shimmerColor, alpha: 0.5 });
      }
    },
    [dimensions, sizePreset, colorPreset, skeletonVariant]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onpointertap={() => onClick?.(element.id)}
    >
      {/* Skeleton base */}
      <pixiGraphics draw={drawSkeleton} />

      {/* Shimmer effect */}
      <pixiGraphics draw={drawShimmer} />
    </pixiContainer>
  );
}
