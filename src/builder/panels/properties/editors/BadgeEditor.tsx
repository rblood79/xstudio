import { Type, Parentheses, Circle, Activity } from 'lucide-react';
import { PropertyEditorProps } from '../types/editorTypes';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../../inspector/components';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function BadgeEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="badge_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Type}
                    placeholder="5"
                />
            </fieldset>

            {/* Design Section */}
            <fieldset className="properties-design">
                <legend>Design</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.VARIANT_SURFACE },
                        { value: 'outline', label: PROPERTY_LABELS.VARIANT_OUTLINE },
                        { value: 'ghost', label: PROPERTY_LABELS.VARIANT_GHOST },
                    ]}
                    icon={Parentheses}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'sm')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'xs', label: PROPERTY_LABELS.SIZE_XS },
                        { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                        { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                        { value: 'lg', label: PROPERTY_LABELS.SIZE_LG },
                        { value: 'xl', label: PROPERTY_LABELS.SIZE_XL },
                    ]}
                    icon={Parentheses}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySwitch
                    label="Dot Badge"
                    isSelected={Boolean(currentProps.isDot)}
                    onChange={(checked) => updateProp('isDot', checked)}
                    icon={Circle}
                />

                <PropertySwitch
                    label="Pulsing Animation"
                    isSelected={Boolean(currentProps.isPulsing)}
                    onChange={(checked) => updateProp('isPulsing', checked)}
                    icon={Activity}
                />
            </fieldset>
        </div>
    );
}

export default BadgeEditor;
