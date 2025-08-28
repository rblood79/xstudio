import React from 'react';
import { PropertyFieldset } from './PropertyFieldset';

interface PropertyCheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon?: React.ComponentType<{
        color?: string;
        size?: number;
        strokeWidth?: number;
    }>;
    className?: string;
}

export function PropertyCheckbox({
    label,
    checked,
    onChange,
    icon,
    className
}: PropertyCheckboxProps) {
    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </PropertyFieldset>
    );
}
