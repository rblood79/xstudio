import {
  ToggleButton as RACToggleButton,
  ToggleButtonProps,
  composeRenderProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import type {
  ComponentSizeSubset,
  ToggleButtonVariant,
} from "../../types/builder/componentVariants.types";
import "./styles/ToggleButton.css";

export interface ToggleButtonExtendedProps extends ToggleButtonProps {
  /**
   * Visual variant of the toggle button
   * @default 'default'
   */
  variant?: ToggleButtonVariant;
  /**
   * Size of the toggle button
   * @default 'md'
   */
  size?: ComponentSizeSubset;
}

const toggleButtonStyles = tv({
  base: "react-aria-ToggleButton",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      surface: "surface",
    },
    size: {
      sm: "sm",
      md: "md",
      lg: "lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

export function ToggleButton({
  variant = "default",
  size = "sm",
  ...props
}: ToggleButtonExtendedProps) {
  const toggleButtonClassName = composeRenderProps(
    props.className,
    (className) => toggleButtonStyles({ variant, size, className })
  );

  return <RACToggleButton {...props} className={toggleButtonClassName} />;
}
