import React from 'react';
import { tv } from 'tailwind-variants';
import type { PanelVariant } from '../../types/componentVariants';
import './styles/Panel.css';

export interface PanelProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    variant?: PanelVariant;
    'data-element-id'?: string;
    [key: string]: unknown;
}

const panel = tv({
    base: 'react-aria-Panel',
    variants: {
        variant: {
            default: 'panel-default',
            tab: 'panel-tab',
            sidebar: 'panel-sidebar',
            card: 'panel-card',
            modal: 'panel-modal',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

export function Panel({
    children,
    className,
    style,
    title,
    variant = 'default',
    ...props
}: PanelProps) {
    return (
        <div {...props} className={panel({ variant, className })} style={style}>
            {title && <div className="panel-title">{title}</div>}
            <div className="panel-content">
                {children}
            </div>
        </div>
    );
}
