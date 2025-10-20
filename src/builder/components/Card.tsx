import React from "react";
import "./components.css";

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "elevated" | "outlined";
  size?: "small" | "medium" | "large";
  isQuiet?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isFocused?: boolean;
  onClick?: () => void;
  title?: string;
  description?: string;
}

export function Card({
  children,
  title = "Title",
  description = "This is a card description. You can edit this content.",
  className = "",
  style,
  variant = "default",
  size = "medium",
  isQuiet = false,
  isSelected = false,
  isDisabled = false,
  isFocused = false,
  onClick,
  ...props
}: CardProps) {
  const baseClasses = "react-aria-Card";

  const variantClasses = {
    default: "",
    elevated: "elevated",
    outlined: "outlined",
  };

  const sizeClasses = {
    small: "sm",
    medium: "md",
    large: "lg",
  };

  const stateClasses = [
    isQuiet ? "quiet" : "",
    isSelected ? "selected" : "",
    isDisabled ? "disabled" : "",
    isFocused ? "focused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const finalClassName = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    stateClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={finalClassName}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      {...props}
    >
      {title && (
        <div className="card-header">
          <div className="card-title">{title}</div>
        </div>
      )}
      <div className="card-content">
        {description && <div className="card-description">{description}</div>}
        {children}
      </div>
    </div>
  );
}

export { Card as MyCard };
