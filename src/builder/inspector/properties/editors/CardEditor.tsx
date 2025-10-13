import { Type, FileText, Layout, Eye, EyeOff, PointerOff, Focus, PencilRuler } from 'lucide-react';
import { PropertyInput, PropertyCheckbox, PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function CardEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                label={PROPERTY_LABELS.TITLE}
                value={String(currentProps.title || '')}
                onChange={(value) => updateProp('title', value)}
                icon={Type}
            />

            <PropertyInput
                label={PROPERTY_LABELS.DESCRIPTION}
                value={String(currentProps.description || '')}
                onChange={(value) => updateProp('description', value)}
                icon={FileText}
            />

            <PropertySelect
                label={PROPERTY_LABELS.VARIANT}
                value={String(currentProps.variant || 'default')}
                onChange={(value) => updateProp('variant', value)}
                options={[
                    { value: 'default', label: PROPERTY_LABELS.CARD_VARIANT_DEFAULT },
                    { value: 'elevated', label: PROPERTY_LABELS.CARD_VARIANT_ELEVATED },
                    { value: 'outlined', label: PROPERTY_LABELS.CARD_VARIANT_OUTLINED }
                ]}
                icon={Layout}
            />

            <PropertySelect
                label={PROPERTY_LABELS.SIZE}
                value={String(currentProps.size || 'medium')}
                onChange={(value) => updateProp('size', value)}
                options={[
                    { value: 'small', label: PROPERTY_LABELS.CARD_SIZE_SMALL },
                    { value: 'medium', label: PROPERTY_LABELS.CARD_SIZE_MEDIUM },
                    { value: 'large', label: PROPERTY_LABELS.CARD_SIZE_LARGE }
                ]}
                icon={PencilRuler}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.IS_QUIET}
                checked={Boolean(currentProps.isQuiet)}
                onChange={(checked) => updateProp('isQuiet', checked)}
                icon={EyeOff}
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
                icon={PointerOff}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.IS_FOCUSED}
                checked={Boolean(currentProps.isFocused)}
                onChange={(checked) => updateProp('isFocused', checked)}
                icon={Focus}
            />
        </div>
    );
}
