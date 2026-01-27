import { forwardRef } from "react";
import {
  composeRenderProps,
  Button as RACButton,
  ButtonProps as RACButtonProps,
} from "react-aria-components";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import type {
  ButtonVariant,
  ComponentSize,
} from "../types";
import { Skeleton } from "./Skeleton";
import "./styles/Button.css";

/**
 * Size별 border-radius 매핑 (CSS 변수 값 기준)
 * --radius-sm: 0.25rem = 4px
 * --radius-md: 0.375rem = 6px
 * --radius-lg: 0.5rem = 8px
 */
const SIZE_BORDER_RADIUS: Record<ComponentSize, number> = {
  xs: 4,  // --radius-sm
  sm: 4,  // --radius-sm
  md: 6,  // --radius-md
  lg: 8,  // --radius-lg
  xl: 8,  // --radius-lg
};

export interface ButtonProps extends RACButtonProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  /** Show loading skeleton instead of content */
  isLoading?: boolean;
  /** Accessible label shown during loading */
  loadingLabel?: string;
}

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성으로 스타일 적용
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      isLoading,
      loadingLabel = "Loading...",
      children,
      variant = "default",
      size = "sm",
      className,
      style,
      ...restProps
    } = props;
    const { focusProps, isFocusVisible } = useFocusRing();

    // Size에 따른 border-radius 인라인 스타일 적용
    const borderRadius = SIZE_BORDER_RADIUS[size];

    return (
      <RACButton
        ref={ref}
        {...mergeProps(restProps, focusProps)}
        type={props.type}
        isDisabled={isLoading || props.isDisabled}
        data-variant={variant}
        data-size={size}
        data-focus-visible={isFocusVisible || undefined}
        data-loading={isLoading || undefined}
        aria-busy={isLoading || undefined}
        className={composeRenderProps(className, (cls) =>
          cls ? `react-aria-Button ${cls}` : "react-aria-Button"
        )}
        style={composeRenderProps(style, (baseStyle) => ({
          ...baseStyle,
          borderRadius: baseStyle?.borderRadius ?? borderRadius,
        }))}
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
