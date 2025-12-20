import { memo, useMemo } from "react";
import { ChevronDown, Tag, PointerOff, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const DisclosureEditor = memo(function DisclosureEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="disclosure_1"
                />
            </PropertySection>

            {/* Content Section */}
            <PropertySection title="Content">
                <PropertyInput
                    label="Title"
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value || undefined)}
                    icon={Tag}
                    placeholder="Click to expand"
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">
                <PropertySwitch
                    label="Default Expanded"
                    isSelected={Boolean(currentProps.defaultExpanded)}
                    onChange={(checked) => updateProp('defaultExpanded', checked)}
                    icon={ChevronDown}
                />

                <PropertySwitch
                    label="Expanded (Controlled)"
                    isSelected={Boolean(currentProps.isExpanded)}
                    onChange={(checked) => updateProp('isExpanded', checked)}
                    icon={ChevronDown}
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
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">
                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'primary')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'primary', label: 'Primary' },
                        { value: 'secondary', label: 'Secondary' }
                    ]}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'md')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'sm', label: 'Small' },
                        { value: 'md', label: 'Medium' },
                        { value: 'lg', label: 'Large' }
                    ]}
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">
                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Disclosure label for screen readers"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                    placeholder="label-element-id"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                    placeholder="description-element-id"
                />
            </PropertySection>
        </>
    );
});
