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
import "./styles/Button.css";

export interface ButtonProps extends RACButtonProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
}

const button = tv({
  base: "react-aria-Button",
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

export function Button(props: ButtonProps) {
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <RACButton
      {...mergeProps(props, focusProps)}
      type={props.type}
      data-focus-visible={isFocusVisible}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          const generatedClass = button({
            ...renderProps,
            variant: props.variant,
            size: props.size,
            isFocusVisible, // 포커스 상태 추가
            className,
          });
          return generatedClass;
        }
      )}
    />
  );
}

export { Slider } from "./Slider";
