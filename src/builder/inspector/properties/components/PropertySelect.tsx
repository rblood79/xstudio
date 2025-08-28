import React from 'react';
import { Select, SelectItem } from '../../../components/list';
import { PropertyFieldset } from './PropertyFieldset';

interface PropertySelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ id: string; label: string }>;
    icon?: React.ComponentType<{
        color?: string;
        size?: number;
        strokeWidth?: number;
    }>;
    className?: string;
}

export function PropertySelect({
    label,
    value,
    onChange,
    options,
    icon,
    className
}: PropertySelectProps) {
    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            <Select
                items={options}
                selectedKey={value}
                onSelectionChange={(key) => onChange(key as string)}
            >
                {(item) => <SelectItem>{item.label}</SelectItem>}
            </Select>
        </PropertyFieldset>
    );
}
