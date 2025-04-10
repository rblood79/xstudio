import React from 'react';
import { composeRenderProps, Button as RACButton, ButtonProps as RACButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';

export interface ButtonProps extends RACButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'surface' | 'icon';
}

export const buttonStyles = tv({
  extend: focusRing,
  base: 'px-4 py-2 text-sm text-center transition rounded-md border border-gray-200 dark:border-white/10 dark:shadow-none cursor-default',
  variants: {
    variant: {
      primary: 'bg-blue-500 text-white hover:bg-blue-700 pressed:bg-blue-800',
      secondary: 'bg-gray-100 text-gray-800 dark:bg-zinc-600 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-500 pressed:bg-gray-300 dark:pressed:bg-zinc-400',
      destructive: 'bg-red-700 text-white hover:bg-red-800 pressed:bg-red-900',
      surface: 'bg-white text-gray-800 dark:bg-zinc-600 dark:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-500 pressed:bg-gray-100 dark:pressed:bg-zinc-400',
      icon: 'border-0 p-1 flex items-center justify-center text-gray-600 dark:text-zinc-400 hover:bg-black/[5%] dark:hover:bg-white/10 pressed:bg-black/10 dark:pressed:bg-white/20',
    },
    isDisabled: {
      true: 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 border-black/5 dark:border-white/5',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        buttonStyles({ ...renderProps, variant: props.variant, className })
      )}
    />
  );
}