import { Type, Layout, ToggleLeft, X } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function PanelEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // Panel 컴포넌트가 Tabs의 자식인 경우 (tabIndex가 있는 경우) 특별한 처리
    const isTabPanel = currentProps.tabIndex !== undefined;

    return (
        <div className="component-props">
            {/* 제목 설정 */}
            <PropertyInput
                label={PROPERTY_LABELS.TITLE}
                value={String(currentProps.title || '')}
                onChange={(value) => updateProp('title', value)}
                icon={Type}
            />

            {/* 스타일 설정 */}
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

            {/* 열림 상태 설정 (Tab 패널이 아닌 경우에만) */}
            {!isTabPanel && (
                <PropertyCheckbox
                    label={PROPERTY_LABELS.IS_OPEN}
                    checked={Boolean(currentProps.isOpen)}
                    onChange={(checked) => updateProp('isOpen', checked)}
                    icon={ToggleLeft}
                />
            )}

            {/* 닫기 가능 설정 (Tab 패널이 아닌 경우에만) */}
            {!isTabPanel && (
                <PropertyCheckbox
                    label={PROPERTY_LABELS.IS_DISMISSABLE}
                    checked={Boolean(currentProps.isDismissable)}
                    onChange={(checked) => updateProp('isDismissable', checked)}
                    icon={X}
                />
            )}

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
