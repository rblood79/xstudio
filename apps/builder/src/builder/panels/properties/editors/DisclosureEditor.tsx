import { memo, useMemo } from "react";
import { ChevronDown, Tag, PointerOff } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
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
        </>
    );
});
