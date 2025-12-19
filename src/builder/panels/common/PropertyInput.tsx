import React, { useState, useEffect, useRef, memo } from 'react';
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
    description?: string; // Optional description (not displayed)
}

export const PropertyInput = memo(function PropertyInput({
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
    
    // ⭐ useRef로 변경: 즉시 반영되는 플래그 (useState는 비동기!)
    const justSavedViaEnterRef = useRef(false);

    // Sync local state with prop value when it changes externally
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInputValue(String(value || ''));
        // Reset the flag when value changes from parent
        justSavedViaEnterRef.current = false;
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Select all text on focus for easier editing
        e.target.select();
        // Reset flag on focus (new editing session)
        justSavedViaEnterRef.current = false;
    };

    const handleChange = (newValue: string) => {
        // Update local state immediately for responsive UI
        setInputValue(newValue);
    };

    const handleBlur = () => {
        // ⭐ Skip save if we just saved via Enter key (useRef는 즉시 반영됨!)
        if (justSavedViaEnterRef.current) {
            justSavedViaEnterRef.current = false;
            return;
        }
        
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
                // ⭐ useRef로 즉시 플래그 설정 (setState와 달리 동기적!)
                justSavedViaEnterRef.current = true;
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
}, (prevProps, nextProps) => {
    // ⭐ 커스텀 비교: onChange 함수 참조는 무시하고 실제 값만 비교
    return (
        prevProps.label === nextProps.label &&
        prevProps.value === nextProps.value &&
        prevProps.type === nextProps.type &&
        prevProps.placeholder === nextProps.placeholder &&
        prevProps.className === nextProps.className &&
        prevProps.multiline === nextProps.multiline &&
        prevProps.min === nextProps.min &&
        prevProps.max === nextProps.max &&
        prevProps.disabled === nextProps.disabled &&
        prevProps.icon === nextProps.icon
    );
});


