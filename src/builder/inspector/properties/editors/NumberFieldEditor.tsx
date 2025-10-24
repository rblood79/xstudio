import { Tag, Hash, CheckSquare, AlertTriangle, PointerOff, PenOff, FileText, SpellCheck2, ArrowUp, ArrowDown, Move } from 'lucide-react';
import { PropertyInput, PropertySwitch } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function NumberFieldEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', Number(value) || 0)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_VALUE}
                    value={String(currentProps.minValue ?? '')}
                    onChange={(value) => updateProp('minValue', value ? Number(value) : undefined)}
                    icon={ArrowDown}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_VALUE}
                    value={String(currentProps.maxValue ?? '')}
                    onChange={(value) => updateProp('maxValue', value ? Number(value) : undefined)}
                    icon={ArrowUp}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.STEP}
                    value={String(currentProps.step ?? '')}
                    onChange={(value) => updateProp('step', value ? Number(value) : undefined)}
                    icon={Move}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                    icon={SpellCheck2}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
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
            </fieldset>
        </div>
    );
}
