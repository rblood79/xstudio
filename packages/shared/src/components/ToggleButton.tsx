import type { ReactNode } from "react";
import {
  ToggleButton as RACToggleButton,
  ToggleButtonProps,
  SelectionIndicator,
  composeRenderProps,
} from "react-aria-components";
import type {
  ComponentSizeSubset,
  ToggleButtonVariant,
} from "../types";
import { useToggleButtonGroupIndicator } from "./ToggleButtonGroup";
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

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */
export function ToggleButton({
  variant = "default",
  size = "sm",
  children,
  ...props
}: ToggleButtonExtendedProps) {
  const showIndicator = useToggleButtonGroupIndicator();

  return (
    <RACToggleButton
      {...props}
      data-variant={variant}
      data-size={size}
      className={composeRenderProps(props.className, (cls) =>
        cls ? `react-aria-ToggleButton ${cls}` : "react-aria-ToggleButton"
      )}
    >
      {showIndicator && <SelectionIndicator />}
      {children as ReactNode}
    </RACToggleButton>
  );
}
