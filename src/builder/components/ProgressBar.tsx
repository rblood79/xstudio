/**
 * ProgressBar Component
 *
 * A visual indicator for showing progress of a task
 * Based on React Aria Components ProgressBar
 */

import {
  Label,
  ProgressBar as AriaProgressBar,
  ProgressBarProps as AriaProgressBarProps,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { ComponentSizeSubset, ProgressBarVariant } from '../../types/componentVariants';

import './styles/ProgressBar.css';

export interface ProgressBarProps extends AriaProgressBarProps {
  label?: string;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: ProgressBarVariant;
  /**
   * Size of the progress bar
   * @default 'md'
   */
  size?: ComponentSizeSubset;
}

const progressBar = tv({
  base: 'react-aria-ProgressBar',
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

export function ProgressBar({ label, variant = 'default', size = 'md', ...props }: ProgressBarProps) {
  return (
    <AriaProgressBar
      {...props}
      className={composeRenderProps(
        props.className,
        (className) => progressBar({ variant, size, className })
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
    </AriaProgressBar>
  );
}
