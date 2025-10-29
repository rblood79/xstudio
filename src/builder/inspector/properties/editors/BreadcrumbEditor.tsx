import { Tag, Link } from 'lucide-react';
import { PropertyInput, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function BreadcrumbEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

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
        <div className="component-props">
            <fieldset className="properties-aria">
                <PropertyCustomId
                    label="ID"
                    value={customId}
                    elementId={elementId}
                    onChange={updateCustomId}
                    placeholder="breadcrumb_1"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label="Href"
                    value={String(currentProps.href || '')}
                    onChange={(value) => updateProp('href', value)}
                    placeholder="/"
                    icon={Link}
                />
            </fieldset>
        </div>
    );
}
