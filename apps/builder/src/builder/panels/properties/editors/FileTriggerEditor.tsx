import { memo, useMemo } from "react";
import { Upload, FileType, Camera, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const FileTriggerEditor = memo(function FileTriggerEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="filetrigger_1"
                />
            </PropertySection>

            {/* File Selection Section */}
            <PropertySection title="File Selection">
                <PropertyInput
                    label="Accepted File Types"
                    value={Array.isArray(currentProps.acceptedFileTypes) ? currentProps.acceptedFileTypes.join(', ') : ''}
                    onChange={(value) => {
                        const types = value ? value.split(',').map(t => t.trim()).filter(Boolean) : undefined;
                        updateProp('acceptedFileTypes', types);
                    }}
                    icon={FileType}
                    placeholder="image/*, .pdf, .docx"
                />

                <PropertySwitch
                    label="Allow Multiple"
                    isSelected={Boolean(currentProps.allowsMultiple)}
                    onChange={(checked) => updateProp('allowsMultiple', checked)}
                    icon={Upload}
                />

                <PropertySwitch
                    label="Accept Directory"
                    isSelected={Boolean(currentProps.acceptDirectory)}
                    onChange={(checked) => updateProp('acceptDirectory', checked)}
                />
            </PropertySection>

            {/* Camera Section */}
            <PropertySection title="Camera (Mobile)">
                <PropertySelect
                    label="Default Camera"
                    value={String(currentProps.defaultCamera || '')}
                    onChange={(value) => updateProp('defaultCamera', value || undefined)}
                    options={[
                        { value: '', label: 'None' },
                        { value: 'user', label: 'Front Camera (User)' },
                        { value: 'environment', label: 'Back Camera (Environment)' }
                    ]}
                    icon={Camera}
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">
                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Upload files"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                />
            </PropertySection>
        </>
    );
});
