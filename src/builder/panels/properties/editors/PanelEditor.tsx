import { Type, Layout, ToggleLeft, X, Hash } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function PanelEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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

    // Panel 컴포넌트가 Tabs의 자식인 경우 (tabIndex가 있는 경우) 특별한 처리
    const isTabPanel = currentProps.tabIndex !== undefined;

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="panel_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.TITLE}
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value)}
                    icon={Type}
                />
            </fieldset>

            {/* Design Section */}
            <fieldset className="properties-design">
                <legend>Design</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.STYLE}
                    value={String(currentProps.variant || 'card')}
                    onChange={(value) => updateProp('variant', value as 'tab' | 'card' | 'bordered' | 'shadow')}
                    options={[
                        { value: 'tab', label: PROPERTY_LABELS.PANEL_VARIANT_TAB },
                        { value: 'card', label: PROPERTY_LABELS.PANEL_VARIANT_CARD },
                        { value: 'bordered', label: PROPERTY_LABELS.PANEL_VARIANT_BORDERED },
                        { value: 'shadow', label: PROPERTY_LABELS.PANEL_VARIANT_SHADOW }
                    ]}
                    icon={Layout}
                />
            </fieldset>

            {/* State Section (Tab Panel이 아닌 경우만) */}
            {!isTabPanel && (
                <fieldset className="properties-group">
                    <legend>State</legend>

                    <PropertySwitch
                        label={PROPERTY_LABELS.IS_OPEN}
                        isSelected={Boolean(currentProps.isOpen)}
                        onChange={(checked) => updateProp('isOpen', checked)}
                        icon={ToggleLeft}
                    />

                    <PropertySwitch
                        label={PROPERTY_LABELS.IS_DISMISSABLE}
                        isSelected={Boolean(currentProps.isDismissable)}
                        onChange={(checked) => updateProp('isDismissable', checked)}
                        icon={X}
                    />
                </fieldset>
            )}

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Panel label for screen readers"
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

            {/* Tab 패널인 경우 tabIndex 정보 표시 */}
            {isTabPanel && (
                <div className="tab-panel-info">
                    <p className="tab-panel-note">
                        This panel is part of a tab component. (Index: {String(currentProps.tabIndex)})
                    </p>
                    <p className="tab-panel-help">
                        💡 You can edit tab properties from the tab component.
                    </p>
                </div>
            )}
        </div>
    );
}
