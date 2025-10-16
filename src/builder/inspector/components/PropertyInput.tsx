import React from 'react';
import { PropertyFieldset } from './PropertyFieldset';


interface PropertyInputProps {
    label?: string;
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
    multiline?: boolean; // New prop for multiline input
    min?: string | number; // 최소값
    max?: string | number; // 최대값
}

export function PropertyInput({
    label,
    value,
    onChange,
    type = 'text',
    icon,
    placeholder,
    className,
    multiline, // Destructure the new prop
    min,
    max
}: PropertyInputProps) {
    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            {multiline ? (
                <textarea
                    className='react-aria-TextArea resize-y' // Added resize-y for vertical resizing
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4} // Default rows for textarea
                />
            ) : (
                <input
                    className='react-aria-Input'
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                />
            )}
        </PropertyFieldset>
    );
}


