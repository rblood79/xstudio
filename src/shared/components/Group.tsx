/**
 * Group - Element grouping container
 *
 * Phase 4: Grouping & Organization - Group Selection
 * Based on React Aria Group component for accessible grouping
 *
 * @see https://react-spectrum.adobe.com/react-aria/Group.html
 */

import { ReactNode } from "react";
import { Group as AriaGroup, type GroupProps as AriaGroupProps } from "react-aria-components";
import { tv } from "tailwind-variants";
import { composeRenderProps } from "react-aria-components";

export interface GroupProps extends Omit<AriaGroupProps, 'className' | 'style'> {
  /** Group content (children elements) */
  children?: ReactNode;
  /** CSS class name */
  className?: string;
  /** Group label (optional, for builder display) */
  label?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Disable all child controls */
  isDisabled?: boolean;
  /** Mark group as invalid */
  isInvalid?: boolean;
  /** Mark group as read-only */
  isReadOnly?: boolean;
  /** Accessible label */
  "aria-label"?: string;
  /** ID of element that labels this group */
  "aria-labelledby"?: string;
  /** ARIA role (group, region, or presentation) */
  role?: "group" | "region" | "presentation";
}

const groupStyles = tv({
  base: "react-aria-Group",
  variants: {
    isDisabled: {
      true: "disabled",
    },
    isInvalid: {
      true: "invalid",
    },
    isReadOnly: {
      true: "read-only",
    },
  },
});

/**
 * Group component
 *
 * A set of related UI controls with support for interactive states.
 * Commonly used to visually unite adjoined elements.
 *
 * @example
 * ```tsx
 * <Group label="Header Elements" aria-label="Navigation">
 *   <Button>Login</Button>
 *   <Button>Signup</Button>
 * </Group>
 * ```
 *
 * @example
 * ```tsx
 * <TextField>
 *   <Label>Email</Label>
 *   <Group>
 *     <Input />
 *     <Button aria-label="Add email">
 *       <Plus size={16} />
 *     </Button>
 *   </Group>
 * </TextField>
 * ```
 */
export function Group({
  children,
  className,
  label,
  style,
  isDisabled,
  isInvalid,
  isReadOnly,
  role = "group",
  ...props
}: GroupProps) {
  return (
    <AriaGroup
      {...props}
      role={role}
      isDisabled={isDisabled}
      className={composeRenderProps(className, (className, renderProps) => {
        return groupStyles({
          ...renderProps,
          isDisabled,
          isInvalid,
          isReadOnly,
          className,
        });
      })}
      style={style}
      data-group-label={label}
    >
      {children}
    </AriaGroup>
  );
}
