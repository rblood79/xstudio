import { ToggleButton as AriaToggleButton } from 'react-aria-components';
import type { ToggleButtonProps } from '../../types/supabase';

export default function ToggleButton(props: ToggleButtonProps) {
    // props에서 필요한 값들을 추출
    const {
        className,
        style,
        children,
        'data-element-id': dataElementId,
        isDisabled,
        ...rest
    } = props;

    return (
        <AriaToggleButton
            {...rest}
            style={style}
            data-element-id={dataElementId}
            isDisabled={isDisabled}
            className={({ isSelected, isPressed }) => `
                text-sm
                px-4 py-2 
                border border-gray-300
                rounded-md
                transition-colors
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected
                    ? isPressed
                        ? 'bg-blue-700 text-white'
                        : 'bg-blue-600 text-white'
                    : isPressed
                        ? 'bg-gray-300 text-black'
                        : 'bg-gray-200 text-black'}
                ${className || ''}
            `}
        >
            {typeof children === 'function'
                ? children
                : children}
        </AriaToggleButton>
    );
} 