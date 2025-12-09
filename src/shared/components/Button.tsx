import { forwardRef } from "react";
import {
  composeRenderProps,
  Button as RACButton,
  ButtonProps as RACButtonProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import type {
  ButtonVariant,
  ComponentSize,
} from "../../types/builder/componentVariants.types";
import { Skeleton } from "./Skeleton";
import "./styles/Button.css";

export interface ButtonProps extends RACButtonProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  /** Show loading skeleton instead of content */
  isLoading?: boolean;
  /** Accessible label shown during loading */
  loadingLabel?: string;
}

const button = tv({
  base: "react-aria-Button",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      tertiary: "tertiary",
      error: "error",
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
    // 포커스 가시성 variant 추가
    isFocusVisible: {
      true: "focus-visible",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      isLoading,
      loadingLabel = "Loading...",
      children,
      size = "sm",
      ...restProps
    } = props;
    const { focusProps, isFocusVisible } = useFocusRing();

    return (
      <RACButton
        ref={ref}
        {...mergeProps(restProps, focusProps)}
        type={props.type}
        isDisabled={isLoading || props.isDisabled}
        data-focus-visible={isFocusVisible}
        data-loading={isLoading || undefined}
        aria-busy={isLoading || undefined}
        className={composeRenderProps(
          props.className,
          (className, renderProps) => {
            const generatedClass = button({
              ...renderProps,
              variant: props.variant,
              size,
              isFocusVisible,
              className,
            });
            return generatedClass;
          }
        )}
      >
        {isLoading ? (
          <>
            <Skeleton
              componentVariant="button"
              size={size}
              aria-label={loadingLabel}
            />
            <span className="sr-only">{loadingLabel}</span>
          </>
        ) : (
          children
        )}
      </RACButton>
    );
  }
);

export { Slider } from "./Slider";
