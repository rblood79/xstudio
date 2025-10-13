import React from 'react';
import {
    Select as AriaSelect,
    Button,
    SelectValue,
    Popover,
    ListBox,
    ListBoxItem
} from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import { iconProps } from '../../../utils/uiConstants';

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
}

export function PropertySelect({
    label,
    value,
    onChange,
    options,
    icon: Icon,
    className
}: PropertySelectProps) {
    return (
        <fieldset className={`properties-aria ${className || ''}`}>
            <legend className='fieldset-legend'>{label}</legend>
            <div className='react-aria-control react-aria-Group'>
                <AriaSelect
                    className='react-aria-Select'
                    selectedKey={value}
                    onSelectionChange={(key) => onChange(key as string)}
                    aria-label={label}
                >
                    <Button className="react-aria-Button">
                        {Icon && (
                            <label className='control-label'>
                                <Icon
                                    color={iconProps.color}
                                    size={iconProps.size}
                                    strokeWidth={iconProps.stroke}
                                />
                            </label>
                        )}
                        <SelectValue />
                        <span aria-hidden="true" className="select-chevron">
                            <ChevronDown size={16} />
                        </span>
                    </Button>
                    <Popover className="react-aria-Popover">
                        <ListBox className="react-aria-ListBox">
                            {options.map((option) => (
                                <ListBoxItem
                                    key={option.value}
                                    id={option.value}
                                    className="react-aria-ListBoxItem"
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
}
