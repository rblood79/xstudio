/**
 * Group - Element grouping container
 *
 * Phase 4: Grouping & Organization - Group Selection
 * Container component for grouping multiple elements together
 */

import { ReactNode } from "react";
import { tv } from "tailwind-variants";
import { composeRenderProps } from "react-aria-components";

export interface GroupProps {
  /** Group content (children elements) */
  children?: ReactNode;
  /** CSS class name */
  className?: string;
  /** Group label (optional, for inspector) */
  label?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

const groupStyles = tv({
  base: "react-aria-Group",
});

/**
 * Group component
 *
 * Provides a container for grouping multiple elements with optional styling
 *
 * @example
 * ```tsx
 * <Group label="Header Elements">
 *   <Button>Login</Button>
 *   <Button>Signup</Button>
 * </Group>
 * ```
 */
export function Group({
  children,
  className,
  label,
  style,
  ...props
}: GroupProps) {
  return (
    <div
      {...props}
      className={groupStyles({ className })}
      style={style}
      data-group-label={label}
    >
      {children}
    </div>
  );
}
