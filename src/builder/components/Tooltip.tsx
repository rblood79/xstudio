import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipProps as AriaTooltipProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { composeRenderProps } from 'react-aria-components';
import type { TooltipVariant, ComponentSize } from '../types/componentVariants';

import './styles/Tooltip.css';

export type TooltipProps = AriaTooltipProps & {
  id?: string;
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: TooltipVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
};

const tooltipStyles = tv({
  base: 'react-aria-Tooltip',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

/**
 * Tooltip Component with Material Design 3 support
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, filled
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Automatic positioning
 * - Arrow indicator
 * - Smooth animations
 * - Keyboard accessible
 *
 * @example
 * <TooltipTrigger>
 *   <Button>Hover me</Button>
 *   <Tooltip variant="primary" size="md">
 *     This is a tooltip
 *   </Tooltip>
 * </TooltipTrigger>
 */
export function Tooltip({ id, variant = 'primary', size = 'md', children, ...props }: TooltipProps) {
  const tooltipClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return tooltipStyles({
        ...renderProps,
        variant,
        size,
        className,
      });
    }
  );

  return (
    // @ts-expect-error - AriaTooltip children type compatibility
    <AriaTooltip id={id} {...props} className={tooltipClassName}>
      <OverlayArrow>
        <svg width={8} height={8} viewBox="0 0 8 8">
          <path d="M0 0 L4 4 L8 0" />
        </svg>
      </OverlayArrow>
      {children as React.ReactNode}
    </AriaTooltip>
  );
}
