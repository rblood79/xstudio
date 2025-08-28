import React from 'react';
import { PropertyFieldset } from './PropertyFieldset';

interface PropertyInputProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: 'text' | 'number' | 'color';
    icon?: React.ComponentType<{
        color?: string;
        size?: number;
        strokeWidth?: number;
    }>;
    placeholder?: string;
    className?: string;
}

export function PropertyInput({
    label,
    value,
    onChange,
    type = 'text',
    icon,
    placeholder,
    className
}: PropertyInputProps) {
    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            <input
                className='control-input'
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </PropertyFieldset>
    );
}


