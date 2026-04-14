import React from "react";
import "./styles/generated/Panel.css";

export interface PanelProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  "data-element-id"?: string;
  [key: string]: unknown;
}

export function Panel({
  children,
  className,
  style,
  title,
  ...props
}: PanelProps) {
  return (
    <div
      {...props}
      className={
        className ? `react-aria-Panel ${className}` : "react-aria-Panel"
      }
      style={style}
    >
      {title && <div className="panel-title">{title}</div>}
      <div className="panel-content">{children}</div>
    </div>
  );
}
