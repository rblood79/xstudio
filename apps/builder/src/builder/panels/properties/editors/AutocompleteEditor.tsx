import { memo, useMemo } from "react";
import { Search, Tag, PointerOff, Focus, Type } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const AutocompleteEditor = memo(function AutocompleteEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const customId = useMemo(() => {
        const element = useStore.getState().elementsMap.get(elementId);
        return element?.customId || "";
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    return (
        <>
            {/* Basic */}
            <PropertySection title="Basic">
                <PropertyCustomId
                    label="ID"
                    value={customId}
                    elementId={elementId}
                    onChange={updateCustomId}
                    placeholder="autocomplete_1"
                />
            </PropertySection>

            {/* Content Section */}
            <PropertySection title="Content">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value || undefined)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value || undefined)}
                    icon={Search}
                    placeholder="Search..."
                />

                <PropertyInput
                    label="Default Input Value"
                    value={String(currentProps.defaultInputValue || '')}
                    onChange={(value) => updateProp('defaultInputValue', value || undefined)}
                    icon={Type}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">
                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label="Disable Auto Focus First"
                    isSelected={Boolean(currentProps.disableAutoFocusFirst)}
                    onChange={(checked) => updateProp('disableAutoFocusFirst', checked)}
                    icon={Focus}
                />

                <PropertySwitch
                    label="Disable Virtual Focus"
                    isSelected={Boolean(currentProps.disableVirtualFocus)}
                    onChange={(checked) => updateProp('disableVirtualFocus', checked)}
                    icon={Focus}
                />
            </PropertySection>

            {/* Filter Section */}
            <PropertySection title="Filtering">
                <PropertySelect
                    label="Filter Sensitivity"
                    value={String(currentProps.filterSensitivity || 'base')}
                    onChange={(value) => updateProp('filterSensitivity', value)}
                    options={[
                        { value: 'base', label: 'Base (Case insensitive)' },
                        { value: 'case', label: 'Case sensitive' },
                        { value: 'accent', label: 'Accent sensitive' },
                        { value: 'variant', label: 'Full sensitivity' }
                    ]}
                    icon={Search}
                />
            </PropertySection>
        </>
    );
});
