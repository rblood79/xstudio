import { ToggleLeft, ToggleRight } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

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
                <legend className='fieldset-legend'>Switch Properties</legend>

                <PropertyInput
                    label="Switch Label"
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={ToggleLeft}
                />

                <PropertyCheckbox
                    label="Selected"
                    checked={Boolean(currentProps.isSelected)}
                    onChange={(checked) => updateProp('isSelected', checked)}
                    icon={ToggleRight}
                />

                <PropertyCheckbox
                    label="Disabled"
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={ToggleLeft}
                />

                <PropertyCheckbox
                    label="Read Only"
                    checked={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={ToggleLeft}
                />

                <PropertyCheckbox
                    label="Required"
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={ToggleLeft}
                />
            </fieldset>
        </div>
    );
}
