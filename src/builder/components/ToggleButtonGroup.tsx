import { ToggleButtonGroup as AriaToggleButtonGroup } from 'react-aria-components';
import type { ToggleButtonGroupProps } from '../../types/supabase';

export default function ToggleButtonGroup(props: ToggleButtonGroupProps) {
    // props에서 필요한 값들을 추출
    const {
        className,
        style,
        children,
        'data-element-id': dataElementId,
        isDisabled,
        orientation = 'horizontal',
        selectionMode = 'multiple',
        ...rest
    } = props;

    return (
        <AriaToggleButtonGroup
            {...rest}
            style={style}
            data-element-id={dataElementId}
            isDisabled={isDisabled}
            orientation={orientation}
            selectionMode={selectionMode}
            className={`
                ${className || ''}
                flex ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}
                p-0 border-0 rounded-none
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            {children}
        </AriaToggleButtonGroup>
    );
} 