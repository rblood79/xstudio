import { Type, CheckSquare, PointerOff } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function CheckboxEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
            <PropertyInput
                label={PROPERTY_LABELS.TEXT}
                value={String(currentProps.children || '')}
                onChange={(value) => updateProp('children', value)}
                icon={Type}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.SELECTED}
                checked={Boolean(currentProps.isSelected)}
                onChange={(checked) => updateProp('isSelected', checked)}
                icon={CheckSquare}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.DISABLED}
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.READONLY}
                checked={Boolean(currentProps.isReadOnly)}
                onChange={(checked) => updateProp('isReadOnly', checked)}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.INDETERMINATE}
                checked={Boolean(currentProps.isIndeterminate)}
                onChange={(checked) => updateProp('isIndeterminate', checked)}
            />
        </div>
    );
}
