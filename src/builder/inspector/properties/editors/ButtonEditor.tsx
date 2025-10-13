import { Type, PointerOff, Parentheses } from 'lucide-react';
import { PropertyInput, PropertyCheckbox, PropertySelect } from '../../components';
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
                isSelected={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySelect
                label={PROPERTY_LABELS.TYPE}
                value={String(currentProps.type || 'button')}
                onChange={(value) => updateProp('type', value)}
                options={[
                    { value: 'button', label: PROPERTY_LABELS.BUTTON },
                    { value: 'submit', label: PROPERTY_LABELS.SUBMIT },
                    { value: 'reset', label: PROPERTY_LABELS.RESET }
                ]}
                icon={Parentheses}
            />

            <PropertySelect
                label="Variant"
                value={String(currentProps.variant || 'primary')}
                onChange={(value) => updateProp('variant', value)}
                options={[
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'surface', label: 'Surface' },
                    { value: 'outline', label: 'Outline' },
                    { value: 'ghost', label: 'Ghost' },
                ]}
                icon={Parentheses}
            />

            <PropertySelect
                label="Size"
                value={String(currentProps.size || 'sm')}
                onChange={(value) => updateProp('size', value)}
                options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' },
                ]}
                icon={Parentheses}
            />
        </div>
    );
}


