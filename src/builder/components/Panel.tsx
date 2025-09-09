import React from 'react';
import './components.css';

export interface PanelProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    variant?: 'default' | 'tab' | 'sidebar' | 'card' | 'modal';
    'data-element-id'?: string;
    [key: string]: unknown;
}

export function Panel({
    children,
    className = '',
    style,
    title,
    variant = 'default',
    ...props
}: PanelProps) {
    const baseClasses = 'react-aria-Panel';
    const variantClasses = {
        default: 'panel-default',
        tab: 'panel-tab',
        sidebar: 'panel-sidebar',
        card: 'panel-card',
        modal: 'panel-modal'
    };

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

    return (
        <div {...props} className={combinedClasses} style={style}>
            {title && <div className="panel-title">{title}</div>}
            <div className="panel-content">
                {children}
            </div>
        </div>
    );
}
