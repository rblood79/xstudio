import React from "react";
import { getIconData } from "@xstudio/specs";
import type { PreviewElement, RenderContext } from "../types";

/**
 * Icon 컴포넌트 렌더러
 *
 * ADR-019: Lucide 아이콘을 SVG로 렌더링
 */

const ICON_SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export const renderIcon = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const props = element.props || {};
  const iconName = String(props.iconName || "circle");
  const size = ICON_SIZE_MAP[String(props.size || "md")] ?? 24;
  const strokeWidth = Number(props.strokeWidth) || 2;
  const color =
    (props.style as Record<string, string> | undefined)?.color ??
    "currentColor";

  const data = getIconData(iconName);
  if (!data) return null;

  return (
    <svg
      key={element.id}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={props.style as React.CSSProperties | undefined}
    >
      {data.paths.map((d: string, i: number) => (
        <path key={i} d={d} />
      ))}
      {data.circles?.map(
        (c: { cx: number; cy: number; r: number }, i: number) => (
          <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} />
        ),
      )}
    </svg>
  );
};
