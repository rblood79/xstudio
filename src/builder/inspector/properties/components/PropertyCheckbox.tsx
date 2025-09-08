import React from 'react';
import { PropertyFieldset } from './PropertyFieldset';
import { Checkbox, Switch } from '../../../components/list';

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
            <Checkbox
                isSelected={checked}
                onChange={(checked) => onChange(checked)}
            >

            </Checkbox>
        </PropertyFieldset>
    );
}
