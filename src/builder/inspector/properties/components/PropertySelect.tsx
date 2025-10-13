import React from 'react';
import { Select, SelectItem } from '../../../components/list';
import { PropertyFieldset } from './PropertyFieldset';

interface PropertySelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>; // id -> value 변경
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
    const mappedOptions = options.map(option => ({ ...option, id: option.value })); // id 추가

    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            <Select
                items={mappedOptions} // mappedOptions 사용
                selectedKey={value}
                onSelectionChange={(key) => onChange(key as string)}
                itemKey="value" // value를 key로 사용하도록 명시
            >

                {(item) => <SelectItem key={item.id}>{item.label}</SelectItem>}
            </Select>
        </PropertyFieldset>
    );
}
