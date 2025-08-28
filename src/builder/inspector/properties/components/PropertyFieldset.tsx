import React from 'react';
import { iconProps } from '../../../../utils/uiConstants';

interface PropertyFieldsetProps {
    legend: string;
    icon?: React.ComponentType<{
        color?: string;
        size?: number;
        strokeWidth?: number;
    }>;
    children: React.ReactNode;
    className?: string;
}

export function PropertyFieldset({ legend, icon: Icon, children, className = '' }: PropertyFieldsetProps) {
    return (
        <fieldset className={`properties-aria ${className}`}>
            <legend className='fieldset-legend'>{legend}</legend>
            <div className='react-aria-control react-aria-Group'>
                {Icon && (
                    <label className='control-label'>
                        <Icon color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                    </label>
                )}
                {children}
            </div>
        </fieldset>
    );
}
