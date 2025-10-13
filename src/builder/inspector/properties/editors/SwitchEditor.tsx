import { ToggleLeft, Eye, EyeOff, PenOff, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function SwitchEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={ToggleLeft}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.SELECTED}
                    checked={Boolean(currentProps.isSelected)}
                    onChange={(checked) => updateProp('isSelected', checked)}
                    icon={Eye}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISABLED}
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={EyeOff}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.READONLY}
                    checked={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.REQUIRED}
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />
            </fieldset>
        </div>
    );
}
