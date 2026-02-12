/**
 * PixiPagination - WebGL Pagination Component
 *
 * Phase 8: Notification & Color Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Page navigation controls
 *
 * CSS 동기화:
 * - getPaginationSizePreset(): fontSize, buttonSize, gap, borderRadius
 * - getPaginationColorPreset(): backgroundColor, currentBackgroundColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';

// 🚀 Component Spec
import {
  PaginationSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiPaginationProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiPagination - Page navigation controls
 */
export function PixiPagination({
  element,
  isSelected = false,
  onClick,
}: PixiPaginationProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const currentPage = (props.currentPage as number) || 1;
  const totalPages = (props.totalPages as number) || 5;
  const showInfo = (props.showInfo as boolean) ?? true;

  // 🚀 Spec Migration
  const sizePreset = useMemo(() => {
    const sizeSpec = PaginationSpec.sizes[size] || PaginationSpec.sizes[PaginationSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);
  const colorPreset = useMemo(() => {
    const variantSpec = PaginationSpec.variants[variant] || PaginationSpec.variants[PaginationSpec.defaultVariant];
    const colors = getSpecVariantColors(variantSpec, 'light');
    return {
      backgroundColor: colors.bg,
      currentBackgroundColor: colors.bgPressed,
      textColor: colors.text,
      borderColor: colors.border ?? 0xe5e7eb,
      hoverBgColor: colors.bgHover,
    };
  }, [variant]);

  // 🚀 Spec Migration: variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = PaginationSpec.variants[variant] || PaginationSpec.variants[PaginationSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // Calculate visible pages
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate dimensions
  const navButtonWidth = sizePreset.buttonSize;
  const totalWidth = navButtonWidth * 2 + sizePreset.gap * (visiblePages.length + 1) + sizePreset.buttonSize * visiblePages.length;
  const containerHeight = sizePreset.buttonSize + (showInfo ? sizePreset.fontSize + sizePreset.gap : 0);

  // Draw navigation button (prev/next)
  const drawNavButton = useCallback(
    (g: PixiGraphics, isDisabled: boolean, isNext: boolean) => {
      g.clear();

      // Background
      g.roundRect(0, 0, sizePreset.buttonSize, sizePreset.buttonSize, sizePreset.borderRadius);
      g.fill({ color: isDisabled ? colorPreset.backgroundColor : colorPreset.hoverBackgroundColor, alpha: isDisabled ? 0.5 : 1 });

      // Arrow
      const centerX = sizePreset.buttonSize / 2;
      const centerY = sizePreset.buttonSize / 2;
      const arrowSize = sizePreset.buttonSize * 0.2;

      if (isNext) {
        g.moveTo(centerX - arrowSize / 2, centerY - arrowSize);
        g.lineTo(centerX + arrowSize / 2, centerY);
        g.lineTo(centerX - arrowSize / 2, centerY + arrowSize);
      } else {
        g.moveTo(centerX + arrowSize / 2, centerY - arrowSize);
        g.lineTo(centerX - arrowSize / 2, centerY);
        g.lineTo(centerX + arrowSize / 2, centerY + arrowSize);
      }
      g.stroke({ color: isDisabled ? colorPreset.disabledTextColor : colorPreset.textColor, width: 2 });
    },
    [sizePreset, colorPreset]
  );

  // Draw page button
  const drawPageButton = useCallback(
    (g: PixiGraphics, isCurrent: boolean) => {
      g.clear();

      // Background
      g.roundRect(0, 0, sizePreset.buttonSize, sizePreset.buttonSize, sizePreset.borderRadius);
      g.fill({ color: isCurrent ? colorPreset.currentBackgroundColor : colorPreset.backgroundColor });
    },
    [sizePreset, colorPreset]
  );

  // Draw selection indicator
  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (isSelected) {
        g.roundRect(-2, -2, totalWidth + 4, containerHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [totalWidth, containerHeight, sizePreset, isSelected, variantColors.bg]
  );

  // Text styles
  const pageTextStyle = useCallback(
    (isCurrent: boolean): Partial<TextStyle> => ({
      fontSize: sizePreset.fontSize,
      fill: isCurrent ? colorPreset.currentTextColor : colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: isCurrent ? 'bold' : 'normal',
    }),
    [sizePreset, colorPreset]
  );

  const ellipsisStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.ellipsisColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  const infoStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize * 0.85,
      fill: colorPreset.ellipsisColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Calculate positions
  let currentX = 0;

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Selection indicator */}
      <pixiGraphics draw={drawSelection} />

      {/* Previous button */}
      <pixiGraphics draw={(g) => drawNavButton(g, currentPage === 1, false)} x={currentX} y={0} />
      {(() => { currentX += sizePreset.buttonSize + sizePreset.gap; return null; })()}

      {/* Page buttons */}
      {visiblePages.map((page, index) => {
        const x = currentX;
        currentX += (typeof page === 'number' ? sizePreset.buttonSize : sizePreset.buttonSize * 0.6) + sizePreset.gap;

        if (typeof page === 'string') {
          return (
            <pixiText
              key={`ellipsis-${index}`}
              text="..."
              style={ellipsisStyle}
              x={x + sizePreset.buttonSize * 0.2}
              y={(sizePreset.buttonSize - sizePreset.fontSize) / 2}
            />
          );
        }

        const isCurrent = page === currentPage;
        return (
          <pixiContainer key={page} x={x} y={0}>
            <pixiGraphics draw={(g) => drawPageButton(g, isCurrent)} />
            <pixiText
              text={String(page)}
              style={pageTextStyle(isCurrent)}
              x={sizePreset.buttonSize / 2}
              y={sizePreset.buttonSize / 2}
              anchor={{ x: 0.5, y: 0.5 }}
            />
          </pixiContainer>
        );
      })}

      {/* Next button */}
      <pixiGraphics draw={(g) => drawNavButton(g, currentPage === totalPages, true)} x={currentX} y={0} />

      {/* Page info */}
      {showInfo && (
        <pixiText
          text={`Page ${currentPage} of ${totalPages}`}
          style={infoStyle}
          x={totalWidth / 2}
          y={sizePreset.buttonSize + sizePreset.gap}
          anchor={{ x: 0.5, y: 0 }}
        />
      )}
    </pixiContainer>
  );
}
