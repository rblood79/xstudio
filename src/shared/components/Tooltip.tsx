import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipProps as AriaTooltipProps,
  composeRenderProps
} from 'react-aria-components';
import type { TooltipVariant, ComponentSize } from '../../types/componentVariants';

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

/**
 * Tooltip Component with Material Design 3 support
 *
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
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
    (className) => className ? `react-aria-Tooltip ${className}` : 'react-aria-Tooltip'
  );

  return (
    // @ts-expect-error - AriaTooltip children type compatibility
    <AriaTooltip id={id} {...props} className={tooltipClassName} data-variant={variant} data-size={size}>
      <OverlayArrow>
        <svg width={8} height={8} viewBox="0 0 8 8">
          <path d="M0 0 L4 4 L8 0" />
        </svg>
      </OverlayArrow>
      {children as React.ReactNode}
    </AriaTooltip>
  );
}
