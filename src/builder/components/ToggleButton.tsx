import React from 'react';
import { ToggleButton as RACToggleButton, ToggleButtonProps as RACToggleButtonProps, composeRenderProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';
import './components.css';

interface ToggleButtonProps extends RACToggleButtonProps {
    variant?: 'primary' | 'secondary';
}

const styles = tv({
    extend: focusRing,
    base: 'aria-toggle-button',
    variants: {
        variant: {
            primary: 'primary',
            secondary: 'secondary',
        },

        isDisabled: {
            true: 'bg-gray-100 dark:bg-zinc-800 forced-colors:bg-[ButtonFace]! text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText]! border-black/5 dark:border-white/5 forced-colors:border-[GrayText]'
        }
    }
});

export function ToggleButton(props: ToggleButtonProps) {
    return (
        <RACToggleButton
            {...props}
            className={composeRenderProps(
                props.className,
                (className, renderProps) => styles({ ...renderProps, variant: props.variant, className })
            )} />
    );
}
