import {
    Tag, Binary, CheckSquare, AlertTriangle, PointerOff, PenOff, FileText,
    SpellCheck2, Hash, Focus, Type, Keyboard, Shield
} from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect } from '../../../inspector/components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function TextFieldEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="textfield_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value)}
                    icon={Binary}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                    icon={SpellCheck2}
                    placeholder="Enter text..."
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />
            </fieldset>

            {/* Input Type Section */}
            <fieldset className="properties-group">
                <legend>Input Type</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.INPUT_TYPE}
                    value={String(currentProps.type || 'text')}
                    onChange={(value) => updateProp('type', value)}
                    options={[
                        { value: 'text', label: PROPERTY_LABELS.INPUT_TYPE_TEXT },
                        { value: 'email', label: PROPERTY_LABELS.INPUT_TYPE_EMAIL },
                        { value: 'password', label: PROPERTY_LABELS.INPUT_TYPE_PASSWORD },
                        { value: 'search', label: PROPERTY_LABELS.INPUT_TYPE_SEARCH },
                        { value: 'tel', label: PROPERTY_LABELS.INPUT_TYPE_TEL },
                        { value: 'url', label: PROPERTY_LABELS.INPUT_TYPE_URL },
                        { value: 'number', label: PROPERTY_LABELS.INPUT_TYPE_NUMBER }
                    ]}
                    icon={Keyboard}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.INPUT_MODE}
                    value={String(currentProps.inputMode || '')}
                    onChange={(value) => updateProp('inputMode', value || undefined)}
                    options={[
                        { value: '', label: PROPERTY_LABELS.INPUT_MODE_NONE },
                        { value: 'text', label: PROPERTY_LABELS.INPUT_MODE_TEXT },
                        { value: 'numeric', label: PROPERTY_LABELS.INPUT_MODE_NUMERIC },
                        { value: 'decimal', label: PROPERTY_LABELS.INPUT_MODE_DECIMAL },
                        { value: 'tel', label: PROPERTY_LABELS.INPUT_MODE_TEL },
                        { value: 'email', label: PROPERTY_LABELS.INPUT_MODE_EMAIL },
                        { value: 'url', label: PROPERTY_LABELS.INPUT_MODE_URL },
                        { value: 'search', label: PROPERTY_LABELS.INPUT_MODE_SEARCH }
                    ]}
                    icon={Keyboard}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.AUTO_COMPLETE}
                    value={String(currentProps.autoComplete || '')}
                    onChange={(value) => updateProp('autoComplete', value || undefined)}
                    options={[
                        { value: '', label: PROPERTY_LABELS.AUTO_COMPLETE_OFF },
                        { value: 'on', label: PROPERTY_LABELS.AUTO_COMPLETE_ON },
                        { value: 'name', label: PROPERTY_LABELS.AUTO_COMPLETE_NAME },
                        { value: 'email', label: PROPERTY_LABELS.AUTO_COMPLETE_EMAIL },
                        { value: 'username', label: PROPERTY_LABELS.AUTO_COMPLETE_USERNAME },
                        { value: 'new-password', label: PROPERTY_LABELS.AUTO_COMPLETE_NEW_PASSWORD },
                        { value: 'current-password', label: PROPERTY_LABELS.AUTO_COMPLETE_CURRENT_PASSWORD },
                        { value: 'tel', label: PROPERTY_LABELS.AUTO_COMPLETE_TEL },
                        { value: 'url', label: PROPERTY_LABELS.AUTO_COMPLETE_URL }
                    ]}
                    icon={SpellCheck2}
                />
            </fieldset>

            {/* Validation Section */}
            <fieldset className="properties-group">
                <legend>Validation</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PATTERN}
                    value={String(currentProps.pattern || '')}
                    onChange={(value) => updateProp('pattern', value || undefined)}
                    icon={Shield}
                    placeholder="Regular expression"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_LENGTH}
                    value={String(currentProps.minLength || '')}
                    onChange={(value) => updateProp('minLength', value ? Number(value) : undefined)}
                    icon={Hash}
                    placeholder="0"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_LENGTH}
                    value={String(currentProps.maxLength || '')}
                    onChange={(value) => updateProp('maxLength', value ? Number(value) : undefined)}
                    icon={Hash}
                    placeholder="100"
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
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

                <PropertySwitch
                    label={PROPERTY_LABELS.SPELL_CHECK}
                    isSelected={Boolean(currentProps.spellCheck)}
                    onChange={(checked) => updateProp('spellCheck', checked)}
                    icon={SpellCheck2}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_CORRECT}
                    isSelected={Boolean(currentProps.autoCorrect)}
                    onChange={(checked) => updateProp('autoCorrect', checked)}
                    icon={SpellCheck2}
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
                    placeholder="field-name"
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
                    placeholder="Field label for screen readers"
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