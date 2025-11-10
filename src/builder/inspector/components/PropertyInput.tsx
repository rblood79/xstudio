import React, { useState, useEffect } from 'react';
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
    disabled?: boolean; // Disable input (read-only)
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
    max,
    disabled
}: PropertyInputProps) {
    // Local state for input value (debounced save)
    const [inputValue, setInputValue] = useState<string>(String(value || ''));

    // Sync local state with prop value when it changes externally
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInputValue(String(value || ''));
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Select all text on focus for easier editing
        e.target.select();
    };

    const handleChange = (newValue: string) => {
        // Update local state immediately for responsive UI
        setInputValue(newValue);
    };

    const handleBlur = () => {
        // Save to parent only on blur (reduces DB calls)
        if (inputValue !== String(value || '')) {
            onChange(inputValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !multiline) {
            // Save on Enter (only for single-line inputs)
            e.preventDefault();
            if (inputValue !== String(value || '')) {
                onChange(inputValue);
            }
            // Blur the input to confirm the change
            (e.target as HTMLInputElement | HTMLTextAreaElement).blur();
        }
    };

    return (
        <PropertyFieldset legend={label} icon={icon} className={className}>
            {multiline ? (
                <textarea
                    className='react-aria-TextArea resize-y' // Added resize-y for vertical resizing
                    value={inputValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={4} // Default rows for textarea
                    disabled={disabled}
                />
            ) : (
                <input
                    className='react-aria-Input'
                    type={type}
                    value={inputValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    disabled={disabled}
                />
            )}
        </PropertyFieldset>
    );
}


