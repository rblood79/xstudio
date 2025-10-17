import { ToggleLeft, Eye, EyeOff, PenOff, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertySwitch } from '../../components';
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

                <PropertySwitch
                    label={PROPERTY_LABELS.SELECTED}
                    isSelected={Boolean(currentProps.isSelected)}
                    onChange={(checked) => updateProp('isSelected', checked)}
                    icon={Eye}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={EyeOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.READONLY}
                    isSelected={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />
            </fieldset>
        </div>
    );
}
