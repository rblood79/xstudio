import { Type, PointerOff, Parentheses } from 'lucide-react';
import { PropertyInput, PropertyCheckbox, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function ButtonEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                label={PROPERTY_LABELS.DISABLED}
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySelect
                label={PROPERTY_LABELS.TYPE}
                value={String(currentProps.type || 'button')}
                onChange={(value) => updateProp('type', value)}
                options={[
                    { id: 'button', label: PROPERTY_LABELS.BUTTON },
                    { id: 'submit', label: PROPERTY_LABELS.SUBMIT },
                    { id: 'reset', label: PROPERTY_LABELS.RESET }
                ]}
                icon={Parentheses}
            />
        </div>
    );
}


