/**
 * Icon Component — Lucide 아이콘 SVG 렌더링
 *
 * ADR-019: Preview/Publish용 React 컴포넌트
 */

import { memo } from "react";
import { getIconData } from "@xstudio/specs";

const ICON_SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export interface IconComponentProps {
  iconName?: string;
  iconFontFamily?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Icon = memo(function Icon({
  iconName = "circle",
  size = "md",
  strokeWidth = 2,
  style,
  className,
  ...rest
}: IconComponentProps) {
  const pxSize = ICON_SIZE_MAP[size] ?? 24;
  const color = style?.color ?? "currentColor";

  const data = getIconData(iconName);
  if (!data) return null;

  // data-* 속성만 전달
  const dataProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith("data-")) {
      dataProps[key] = value;
    }
  }

  return (
    <svg
      width={pxSize}
      height={pxSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      {...dataProps}
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
});
