import React from "react";
import type { PanelVariant } from "../types";
import "./styles/generated/Panel.css";

export interface PanelProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  variant?: PanelVariant;
  "data-element-id"?: string;
  [key: string]: unknown;
}

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant 속성 사용
 */
export function Panel({
  children,
  className,
  style,
  title,
  variant = "default",
  ...props
}: PanelProps) {
  return (
    <div
      {...props}
      className={
        className ? `react-aria-Panel ${className}` : "react-aria-Panel"
      }
      style={style}
      data-variant={variant}
    >
      {title && <div className="panel-title">{title}</div>}
      <div className="panel-content">{children}</div>
    </div>
  );
}
