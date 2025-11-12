import React from "react";
import { tv } from "tailwind-variants";
import type {
  ButtonVariant,
  ComponentSize,
} from "../../types/builder/componentVariants.types";
import "./styles/Badge.css";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ButtonVariant;
  size?: ComponentSize;
  /**
   * Badge content (text or number)
   */
  children?: React.ReactNode;
  /**
   * Whether badge is a dot indicator (no content)
   */
  isDot?: boolean;
  /**
   * Whether badge should pulse (for notifications)
   */
  isPulsing?: boolean;
}

const badge = tv({
  base: "react-aria-Badge",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      surface: "surface",
      outline: "outline",
      ghost: "ghost",
    },
    size: {
      xs: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    },
    isDot: {
      true: "dot",
      false: "",
    },
    isPulsing: {
      true: "pulsing",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
    isDot: false,
    isPulsing: false,
  },
});

export function Badge({
  variant = "default",
  size = "sm",
  isDot = false,
  isPulsing = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const badgeClassName = badge({
    variant,
    size,
    isDot,
    isPulsing,
    className,
  });

  return (
    <span {...props} className={badgeClassName} data-badge>
      {!isDot && children}
    </span>
  );
}
