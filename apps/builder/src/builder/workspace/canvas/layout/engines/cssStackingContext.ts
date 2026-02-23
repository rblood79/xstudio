/**
 * CSS Stacking Context 판정 및 z-index 파싱
 */

interface StackingContextMeta {
  isFlexItem?: boolean;
  isGridItem?: boolean;
}

/**
 * 요소가 새로운 stacking context를 생성하는지 판정 (CSS 명세 기반)
 */
export function createsStackingContext(
  style: Record<string, unknown> | undefined,
  meta?: StackingContextMeta,
): boolean {
  if (!style) return false;
  const position = style.position as string | undefined;
  const zIndex = style.zIndex;
  const zIndexSpecified = zIndex !== undefined && zIndex !== 'auto';

  if (position === 'fixed' || position === 'sticky') return true;
  if ((position === 'relative' || position === 'absolute') && zIndexSpecified) return true;
  if ((meta?.isFlexItem || meta?.isGridItem) && zIndexSpecified) return true;

  if (style.opacity !== undefined) {
    const op = typeof style.opacity === 'string' ? parseFloat(style.opacity as string) : style.opacity as number;
    if (typeof op === 'number' && op < 1) return true;
  }
  if (style.transform && style.transform !== 'none') return true;
  if (style.filter && style.filter !== 'none') return true;
  return false;
}

/**
 * z-index 파싱: auto -> undefined, number/string -> number
 */
export function parseZIndex(value: number | string | undefined): number | undefined {
  if (value === undefined || value === 'auto') return undefined;
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}
