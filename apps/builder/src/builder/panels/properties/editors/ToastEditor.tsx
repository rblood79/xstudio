import { memo, useMemo } from "react";
import { Bell, Tag, FileText, Clock, Layout } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { useStore } from '../../../stores';

export const ToastEditor = memo(function ToastEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="toast_provider_1"
                />
            </PropertySection>

            {/* Content Section */}
            <PropertySection title="Default Toast Content">
                <PropertyInput
                    label="Default Title"
                    value={String(currentProps.defaultTitle || '')}
                    onChange={(value) => updateProp('defaultTitle', value || undefined)}
                    icon={Tag}
                    placeholder="Notification"
                />

                <PropertyInput
                    label="Default Description"
                    value={String(currentProps.defaultDescription || '')}
                    onChange={(value) => updateProp('defaultDescription', value || undefined)}
                    icon={FileText}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">
                <PropertyInput
                    label="Default Timeout (ms)"
                    value={String(currentProps.timeout || '5000')}
                    onChange={(value) => updateProp('timeout', value ? Number(value) : undefined)}
                    icon={Clock}
                    placeholder="5000"
                />

                <PropertyInput
                    label="Max Toasts"
                    value={String(currentProps.maxToasts || '5')}
                    onChange={(value) => updateProp('maxToasts', value ? Number(value) : undefined)}
                    icon={Bell}
                    placeholder="5"
                />
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">
                <PropertySelect
                    label="Default Variant"
                    value={String(currentProps.variant || 'info')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'info', label: 'Info' },
                        { value: 'success', label: 'Success' },
                        { value: 'warning', label: 'Warning' },
                        { value: 'error', label: 'Error' }
                    ]}
                    icon={Bell}
                />

                <PropertySelect
                    label="Position"
                    value={String(currentProps.position || 'top-right')}
                    onChange={(value) => updateProp('position', value)}
                    options={[
                        { value: 'top-right', label: 'Top Right' },
                        { value: 'top-left', label: 'Top Left' },
                        { value: 'top-center', label: 'Top Center' },
                        { value: 'bottom-right', label: 'Bottom Right' },
                        { value: 'bottom-left', label: 'Bottom Left' },
                        { value: 'bottom-center', label: 'Bottom Center' }
                    ]}
                    icon={Layout}
                />
            </PropertySection>
        </>
    );
});
