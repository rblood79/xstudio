import { Button as AriaButton } from 'react-aria-components';
import type { ButtonProps } from '../../types/supabase';

export default function Button(props: ButtonProps) {
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
        <AriaButton
            {...rest}
            style={style}
            data-element-id={dataElementId}
            isDisabled={isDisabled}
            className={({ isPressed }) => `
                text-sm
                px-4 py-2 
                border border-gray-300
                rounded-md
                transition-colors
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isPressed
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-600 text-white'}
                ${className || ''}
            `}
        >
            {typeof children === 'function'
                ? children
                : children}
        </AriaButton>
    );
} 