import React from "react";
import { tv } from "tailwind-variants";
import type { BadgeVariant, ComponentSize } from "../../types/componentVariants";
import { Skeleton } from "./Skeleton";
import "./styles/Badge.css";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: BadgeVariant;
  /**
   * Size variant
   * @default 'sm'
   */
  size?: ComponentSize;
  /**
   * Badge content (text or number)
   */
  children?: React.ReactNode;
  /**
   * Whether badge is a dot indicator (no content)
   * @default false
   */
  isDot?: boolean;
  /**
   * Whether badge should pulse (for notifications)
   * @default false
   */
  isPulsing?: boolean;
  /**
   * Show loading skeleton instead of content
   * @default false
   */
  isLoading?: boolean;
}

const badge = tv({
  base: "react-aria-Badge",
  variants: {
    variant: {
      primary: "primary",
      secondary: "secondary",
      tertiary: "tertiary",
      error: "error",
      surface: "surface",
    },
    size: {
      sm: "sm",
      md: "md",
      lg: "lg",
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
    variant: "primary",
    size: "sm",
    isDot: false,
    isPulsing: false,
  },
});

/**
 * Badge Component with Material Design 3 support
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, surface
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Status indicators and labels
 * - Dot mode for minimal indicators
 * - Pulsing animation for notifications
 * - Compact and legible design
 *
 * @example
 * <Badge variant="primary" size="sm">New</Badge>
 * <Badge variant="error" size="md">5</Badge>
 * <Badge variant="secondary" isDot isPulsing />
 */
export function Badge({
  variant = "primary",
  size = "sm",
  isDot = false,
  isPulsing = false,
  isLoading = false,
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

  if (isLoading) {
    return (
      <Skeleton
        componentVariant="badge"
        size={size}
        className={className}
        aria-label="Loading badge..."
      />
    );
  }

  return (
    <span {...props} className={badgeClassName} data-badge>
      {!isDot && children}
    </span>
  );
}
