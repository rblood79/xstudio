/**
 * Switch Component
 *
 * A toggle switch for on/off states
 * Based on React Aria Components Switch
 */

import {
  Switch as AriaSwitch,
  SwitchProps as AriaSwitchProps,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { useFocusRing } from '@react-aria/focus';
import { mergeProps } from '@react-aria/utils';
import type { ComponentSizeSubset, SwitchVariant } from '../../types/builder/componentVariants.types';
import { Skeleton } from './Skeleton';

import './styles/Switch.css';

export interface SwitchProps extends Omit<AriaSwitchProps, 'children'> {
  children: React.ReactNode;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: SwitchVariant;
  /**
   * Size of the switch
   * @default 'md'
   */
  size?: ComponentSizeSubset;
  /**
   * Show loading skeleton instead of switch
   * @default false
   */
  isLoading?: boolean;
}

const switchStyles = tv({
  base: 'react-aria-Switch',
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
    isFocusVisible: {
      true: 'focus-visible',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export function Switch({ children, variant = 'default', size = 'md', isLoading, ...props }: SwitchProps) {
  const { focusProps, isFocusVisible } = useFocusRing();

  if (isLoading) {
    return (
      <Skeleton
        componentVariant="switch"
        size={size}
        aria-label="Loading switch..."
      />
    );
  }

  return (
    <AriaSwitch
      {...mergeProps(props, focusProps)}
      data-focus-visible={isFocusVisible}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => switchStyles({
          ...renderProps,
          variant,
          size,
          isFocusVisible,
          className
        })
      )}
    >
      <div className="indicator" />
      {children}
    </AriaSwitch>
  );
}
