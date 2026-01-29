import React, { memo, useState, useCallback } from 'react';
import {
    Select as AriaSelect,
    Button,
    SelectValue,
    Popover,
    ListBox,
    ListBoxItem
} from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import { iconProps } from '../../../utils/ui/uiConstants';

interface PropertySelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    icon?: React.ComponentType<{
        color?: string;
        size?: number;
        strokeWidth?: number;
    }>;
    className?: string;
    description?: string; // Optional description (not displayed)
}

// 🚀 Phase 21: memo + 커스텀 비교 함수 적용
export const PropertySelect = memo(function PropertySelect({
    label,
    value,
    onChange,
    options,
    icon: Icon,
    className
}: PropertySelectProps) {
    // 🚀 Fix: 명시적 isOpen 관리로 "reset" 선택 시 팝업 닫힘 보장
    // React Aria의 controlled Select에서 onSelectionChange 내 onChange("") 호출이
    // 상태 변경을 유발하여 팝업 자동 닫힘을 방해하는 문제 해결
    const [isOpen, setIsOpen] = useState(false);

    const handleChange = useCallback((key: React.Key | null) => {
        const selectedValue = key as string;
        // "reset" 선택 시 inline style 제거 (빈 문자열 전달)
        if (selectedValue === "reset") {
            onChange("");
        } else {
            onChange(selectedValue);
        }
    }, [onChange]);

    return (
        <fieldset className={`properties-aria ${className || ''}`}>
            <legend className='fieldset-legend'>{label}</legend>
            <div className='react-aria-control react-aria-Group'>
                <AriaSelect
                    className='react-aria-Select'
                    isOpen={isOpen}
                    onOpenChange={setIsOpen}
                    selectedKey={value === "" ? (options.some(opt => opt.value === "reset") ? "reset" : null) : value}
                    onSelectionChange={handleChange}
                    aria-label={label}
                >
                    <Button className="react-aria-Button">
                        {Icon && (
                            <label className='control-label'>
                                <Icon
                                    color={iconProps.color}
                                    size={iconProps.size}
                                    strokeWidth={iconProps.strokeWidth}
                                />
                            </label>
                        )}
                        <SelectValue />
                        <span aria-hidden="true" className="select-chevron">
                            <ChevronDown size={iconProps.size} />
                        </span>
                    </Button>
                    <Popover className="react-aria-Popover">
                        <ListBox className="react-aria-ListBox" onAction={() => setIsOpen(false)}>
                            {options.map((option) => (
                                <ListBoxItem
                                    key={option.value}
                                    id={option.value}
                                    className="react-aria-ListBoxItem"
                                    textValue={option.label}
                                >
                                    {option.label}
                                </ListBoxItem>
                            ))}
                        </ListBox>
                    </Popover>
                </AriaSelect>
            </div>
        </fieldset>
    );
}, (prevProps, nextProps) => {
    // 커스텀 비교: onChange 함수 참조는 무시하고 실제 값만 비교
    return (
        prevProps.label === nextProps.label &&
        prevProps.value === nextProps.value &&
        prevProps.className === nextProps.className &&
        prevProps.icon === nextProps.icon &&
        prevProps.options === nextProps.options
    );
});
