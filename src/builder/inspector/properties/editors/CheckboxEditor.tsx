import { Tag, CheckSquare, PointerOff, PenOff, Minus, Layout, PencilRuler } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function CheckboxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    // Check if this Checkbox is a child of CheckboxGroup
    const parentElement = useStore((state) =>
        state.elements.find((el) => el.id === element?.parent_id)
    );
    const isChildOfCheckboxGroup = parentElement?.tag === 'CheckboxGroup';

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        // Update customId in store (not in props)
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
                placeholder="checkbox_1"
            />

            <PropertyInput
                label={PROPERTY_LABELS.LABEL}
                value={String(currentProps.children || '')}
                onChange={(value) => updateProp('children', value)}
                icon={Tag}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.SELECTED}
                isSelected={Boolean(currentProps.isSelected)}
                onChange={(checked) => updateProp('isSelected', checked)}
                icon={CheckSquare}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.DISABLED}
                isSelected={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.READONLY}
                isSelected={Boolean(currentProps.isReadOnly)}
                onChange={(checked) => updateProp('isReadOnly', checked)}
                icon={PenOff}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.INDETERMINATE}
                isSelected={Boolean(currentProps.isIndeterminate)}
                onChange={(checked) => updateProp('isIndeterminate', checked)}
                icon={Minus}
            />

            {/* Only show variant/size controls if NOT a child of CheckboxGroup */}
            {!isChildOfCheckboxGroup && (
                <fieldset className="properties-design">
                    <PropertySelect
                        label={PROPERTY_LABELS.VARIANT}
                        value={String(currentProps.variant || 'default')}
                        onChange={(value) => updateProp('variant', value)}
                        options={[
                            { value: 'default', label: PROPERTY_LABELS.CHECKBOX_VARIANT_DEFAULT },
                            { value: 'primary', label: PROPERTY_LABELS.CHECKBOX_VARIANT_PRIMARY },
                            { value: 'secondary', label: PROPERTY_LABELS.CHECKBOX_VARIANT_SECONDARY },
                            { value: 'surface', label: PROPERTY_LABELS.CHECKBOX_VARIANT_SURFACE }
                        ]}
                        icon={Layout}
                    />

                    <PropertySelect
                        label={PROPERTY_LABELS.SIZE}
                        value={String(currentProps.size || 'md')}
                        onChange={(value) => updateProp('size', value)}
                        options={[
                            { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                            { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                            { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
                        ]}
                        icon={PencilRuler}
                    />
                </fieldset>
            )}
        </div>
    );
}
