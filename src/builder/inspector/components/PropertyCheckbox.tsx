import React from 'react';
import { PropertyFieldset } from './PropertyFieldset';
import { Checkbox } from '../../components/list';

interface PropertyCheckboxProps {
    label: string;
    isSelected: boolean; // checked -> isSelected
    onChange: (isSelected: boolean) => void;
    icon?: React.ComponentType<{
        color?: string;
        size?: number;
        strokeWidth?: number;
    }>;
    className?: string;
}

export function PropertyCheckbox({
    label,
    isSelected,
    onChange,
    icon,
    className
}: PropertyCheckboxProps) {
    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            <Checkbox
                isSelected={isSelected}
                onChange={(val) => onChange(val)}
            >
                {label}
            </Checkbox>
        </PropertyFieldset>
    );
}
