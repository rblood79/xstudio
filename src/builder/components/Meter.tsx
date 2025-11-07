/**
 * Meter Component
 *
 * A visual indicator for showing a measurement value
 * Based on React Aria Components Meter
 */

import {
  Label,
  Meter as AriaMeter,
  MeterProps as AriaMeterProps,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { ComponentSizeSubset, MeterVariant } from '../../types/componentVariants';

import './styles/Meter.css';

export interface MeterProps extends AriaMeterProps {
  label?: string;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: MeterVariant;
  /**
   * Size of the meter
   * @default 'md'
   */
  size?: ComponentSizeSubset;
}

const meter = tv({
  base: 'react-aria-Meter',
  variants: {
    variant: {
      default: '',
      primary: 'primary',
      secondary: 'secondary',
      surface: 'surface',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export function Meter({ label, variant = 'default', size = 'md', ...props }: MeterProps) {
  return (
    <AriaMeter
      {...props}
      className={composeRenderProps(
        props.className,
        (className) => meter({ variant, size, className })
      )}
    >
      {({ percentage, valueText }) => (
        <>
          <Label>{label}</Label>
          <span className="value">{valueText}</span>
          <div className="bar">
            <div className="fill" style={{ width: percentage + '%' }} />
          </div>
        </>
      )}
    </AriaMeter>
  );
}
