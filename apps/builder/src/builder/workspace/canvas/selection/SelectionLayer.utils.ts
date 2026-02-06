import { getLassoBounds } from './LassoSelection.utils';

export function findElementsInLasso(
  elements: { id: string; props?: { style?: Record<string, unknown> } }[],
  lassoStart: { x: number; y: number },
  lassoCurrent: { x: number; y: number }
): string[] {
  const lassoBounds = getLassoBounds(lassoStart, lassoCurrent);

  const intersects = (
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): boolean => {
    return !(
      ax + aw < bx ||
      ax > bx + bw ||
      ay + ah < by ||
      ay > by + bh
    );
  };

  return elements
    .filter((element) => {
      const style = element.props?.style;
      if (!style) return false;

      const x = Number(style.left ?? 0);
      const y = Number(style.top ?? 0);
      const width = Number(style.width ?? 0);
      const height = Number(style.height ?? 0);

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
        return false;
      }
      if (width <= 0 || height <= 0) return false;

      return intersects(
        x,
        y,
        width,
        height,
        lassoBounds.x,
        lassoBounds.y,
        lassoBounds.width,
        lassoBounds.height
      );
    })
    .map((element) => element.id);
}
