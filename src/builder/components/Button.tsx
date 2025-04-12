import React from 'react';
import { composeRenderProps, Button as RACButton, ButtonProps as RACButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';
import './components.css';
export interface ButtonProps extends RACButtonProps {
  variant?: 'primary' | 'secondary' | 'surface' | 'icon';
}

const button = tv({
  extend: focusRing,
  base: 'aria-Button',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      surface: 'surface',
      icon: 'icon',
    },
    isDisabled: {
      true: 'disabled',
    },
  },
  defaultVariants: {
    variant: 'primary',
    isDisabled: false,
  },
});

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => button({ ...renderProps, variant: props.variant, className })
      )} />
  );
}
