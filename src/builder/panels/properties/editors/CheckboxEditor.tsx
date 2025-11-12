import { Tag, CheckSquare, PointerOff, PenOff, Minus, Layout, PencilRuler, Focus, Hash, Type, AlertCircle, FileText } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect } from '../../../inspector/components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
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

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Tag}
                />
            </fieldset>

            {/* Design Section - Only if NOT child of CheckboxGroup */}
            {!isChildOfCheckboxGroup && (
                <fieldset className="properties-design">
                    <legend>Design</legend>

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

            {/* State Section */}
            <fieldset className="properties-group">
                <legend>State</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.SELECTED}
                    isSelected={Boolean(currentProps.isSelected)}
                    onChange={(checked) => updateProp('isSelected', checked)}
                    icon={CheckSquare}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INDETERMINATE}
                    isSelected={Boolean(currentProps.isIndeterminate)}
                    onChange={(checked) => updateProp('isIndeterminate', checked)}
                    icon={Minus}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INVALID}
                    isSelected={Boolean(currentProps.isInvalid)}
                    onChange={(checked) => updateProp('isInvalid', checked)}
                    icon={AlertCircle}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
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
            </fieldset>

            {/* Form Integration Section */}
            <fieldset className="properties-group">
                <legend>Form Integration</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={Tag}
                    placeholder="checkbox-name"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value || undefined)}
                    icon={Hash}
                    placeholder="checkbox-value"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.FORM}
                    value={String(currentProps.form || '')}
                    onChange={(value) => updateProp('form', value || undefined)}
                    icon={FileText}
                    placeholder="form-id"
                />
            </fieldset>

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Checkbox label for screen readers"
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
            </fieldset>
        </div>
    );
}
