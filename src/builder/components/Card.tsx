import React from "react";
import { tv } from "tailwind-variants";
import type { CardVariant, ComponentSizeSubset } from "../../types/componentVariants";
import './styles/Card.css';

export interface CardProps {
  id?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: CardVariant;
  size?: ComponentSizeSubset;
  isQuiet?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  title?: string;
  description?: string;
}

const card = tv({
  base: "react-aria-Card",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      surface: "surface",
      elevated: "elevated",
      outlined: "outlined",
    },
    size: {
      sm: "sm",
      md: "md",
      lg: "lg",
    },
    isQuiet: {
      true: "quiet",
    },
    isDisabled: {
      true: "disabled",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export function Card({
  id,
  children,
  title = "Title",
  description = "This is a card description. You can edit this content.",
  className,
  style,
  variant = "default",
  size = "md",
  isQuiet = false,
  isDisabled = false,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      id={id}
      className={card({
        variant,
        size,
        isQuiet,
        isDisabled,
        className,
      })}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
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
