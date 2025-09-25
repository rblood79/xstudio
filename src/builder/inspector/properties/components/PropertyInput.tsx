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
    multiline?: boolean; // New prop for multiline input
}

export function PropertyInput({
    label,
    value,
    onChange,
    type = 'text',
    icon,
    placeholder,
    className,
    multiline // Destructure the new prop
}: PropertyInputProps) {
    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            {multiline ? (
                <textarea
                    className='control-input resize-y' // Added resize-y for vertical resizing
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4} // Default rows for textarea
                />
            ) : (
                <input
                    className='control-input'
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            )}
        </PropertyFieldset>
    );
}


