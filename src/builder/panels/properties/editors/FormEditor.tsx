import { memo, useMemo } from "react";
import { FormInput, Focus, RotateCcw, CheckSquare, Type, Hash, Globe, Send } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const FormEditor = memo(function FormEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="form_1"
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">
                <PropertySwitch
                    label="Auto Focus"
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />

                <PropertySwitch
                    label="Restore Focus"
                    isSelected={Boolean(currentProps.restoreFocus)}
                    onChange={(checked) => updateProp('restoreFocus', checked)}
                    icon={RotateCcw}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
                    value={String(currentProps.validationBehavior || 'native')}
                    onChange={(value) => updateProp('validationBehavior', value)}
                    options={[
                        { value: 'native', label: 'Native' },
                        { value: 'aria', label: 'ARIA' }
                    ]}
                    icon={CheckSquare}
                />
            </PropertySection>

            {/* Form Submission Section */}
            <PropertySection title="Submission">
                <PropertyInput
                    label="Action"
                    value={String(currentProps.action || '')}
                    onChange={(value) => updateProp('action', value || undefined)}
                    icon={Send}
                    placeholder="/api/submit"
                />

                <PropertySelect
                    label="Method"
                    value={String(currentProps.method || 'post')}
                    onChange={(value) => updateProp('method', value)}
                    options={[
                        { value: 'get', label: 'GET' },
                        { value: 'post', label: 'POST' },
                        { value: 'dialog', label: 'Dialog' }
                    ]}
                    icon={FormInput}
                />

                <PropertySelect
                    label="Encoding Type"
                    value={String(currentProps.encType || '')}
                    onChange={(value) => updateProp('encType', value || undefined)}
                    options={[
                        { value: '', label: 'Default' },
                        { value: 'application/x-www-form-urlencoded', label: 'URL Encoded' },
                        { value: 'multipart/form-data', label: 'Multipart (File Upload)' },
                        { value: 'text/plain', label: 'Plain Text' }
                    ]}
                />

                <PropertySelect
                    label="Target"
                    value={String(currentProps.target || '')}
                    onChange={(value) => updateProp('target', value || undefined)}
                    options={[
                        { value: '', label: 'Default' },
                        { value: '_self', label: 'Same Window (_self)' },
                        { value: '_blank', label: 'New Tab (_blank)' },
                        { value: '_parent', label: 'Parent Frame (_parent)' },
                        { value: '_top', label: 'Top Frame (_top)' }
                    ]}
                    icon={Globe}
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">
                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Form label for screen readers"
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
