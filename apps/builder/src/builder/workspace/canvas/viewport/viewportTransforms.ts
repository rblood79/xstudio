export interface ViewportPanOffset {
  x: number;
  y: number;
}

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface ViewportSize {
  height: number;
  width: number;
}

export function screenToViewportPoint(
  point: ViewportPoint,
  zoom: number,
  panOffset: ViewportPanOffset,
): ViewportPoint {
  return {
    x: (point.x - panOffset.x) / zoom,
    y: (point.y - panOffset.y) / zoom,
  };
}

export function viewportToScreenPoint(
  point: ViewportPoint,
  zoom: number,
  panOffset: ViewportPanOffset,
): ViewportPoint {
  return {
    x: point.x * zoom + panOffset.x,
    y: point.y * zoom + panOffset.y,
  };
}

export function screenToViewportSize(
  size: ViewportSize,
  zoom: number,
): ViewportSize {
  return {
    height: size.height / zoom,
    width: size.width / zoom,
  };
}

export function viewportToScreenSize(
  size: ViewportSize,
  zoom: number,
): ViewportSize {
  return {
    height: size.height * zoom,
    width: size.width * zoom,
  };
}
