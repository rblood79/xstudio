import { Tag, Link, PointerOff, Type, Hash, CheckCircle } from 'lucide-react';
import { PropertyInput, PropertyCustomId, PropertySwitch, PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function BreadcrumbEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="breadcrumb_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.HREF}
                    value={String(currentProps.href || '')}
                    onChange={(value) => updateProp('href', value || undefined)}
                    placeholder="/"
                    icon={Link}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.TARGET}
                    value={String(currentProps.target || '')}
                    onChange={(value) => updateProp('target', value || undefined)}
                    options={[
                        { value: '', label: PROPERTY_LABELS.TARGET_NONE },
                        { value: '_self', label: PROPERTY_LABELS.TARGET_SELF },
                        { value: '_blank', label: PROPERTY_LABELS.TARGET_BLANK },
                        { value: '_parent', label: PROPERTY_LABELS.TARGET_PARENT },
                        { value: '_top', label: PROPERTY_LABELS.TARGET_TOP }
                    ]}
                    icon={Link}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.REL}
                    value={String(currentProps.rel || '')}
                    onChange={(value) => updateProp('rel', value || undefined)}
                    placeholder="noopener noreferrer"
                    icon={Link}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.CURRENT}
                    isSelected={Boolean(currentProps.isCurrent)}
                    onChange={(checked) => updateProp('isCurrent', checked)}
                    icon={CheckCircle}
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
                    placeholder="Breadcrumb item label for screen readers"
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

                <PropertySelect
                    label={PROPERTY_LABELS.ARIA_CURRENT}
                    value={String(currentProps['aria-current'] || '')}
                    onChange={(value) => updateProp('aria-current', value || undefined)}
                    options={[
                        { value: '', label: PROPERTY_LABELS.ARIA_CURRENT_NONE },
                        { value: 'page', label: PROPERTY_LABELS.ARIA_CURRENT_PAGE },
                        { value: 'step', label: PROPERTY_LABELS.ARIA_CURRENT_STEP },
                        { value: 'location', label: PROPERTY_LABELS.ARIA_CURRENT_LOCATION },
                        { value: 'date', label: PROPERTY_LABELS.ARIA_CURRENT_DATE },
                        { value: 'time', label: PROPERTY_LABELS.ARIA_CURRENT_TIME },
                        { value: 'true', label: PROPERTY_LABELS.ARIA_CURRENT_TRUE }
                    ]}
                    icon={CheckCircle}
                />
            </fieldset>
        </div>
    );
}
