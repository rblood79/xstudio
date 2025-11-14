import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipProps as AriaTooltipProps
} from 'react-aria-components';

import './styles/Tooltip.css';

export type TooltipProps = AriaTooltipProps & {
  id?: string;
};

export function Tooltip({ id, children, ...props }: TooltipProps) {
  return (
    // @ts-expect-error - AriaTooltip children type compatibility
    <AriaTooltip id={id} {...props}>
      <OverlayArrow>
        <svg width={8} height={8} viewBox="0 0 8 8">
          <path d="M0 0 L4 4 L8 0" />
        </svg>
      </OverlayArrow>
      {children as React.ReactNode}
    </AriaTooltip>
  );
}
