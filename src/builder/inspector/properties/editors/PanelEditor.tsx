import { Type, Layout, ToggleLeft, X } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

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
                label="제목"
                value={String(currentProps.title || '')}
                onChange={(value) => updateProp('title', value)}
                icon={Type}
            />

            {/* 스타일 설정 */}
            <PropertySelect
                label="스타일"
                value={String(currentProps.variant || 'card')}
                onChange={(value) => updateProp('variant', value as 'tab' | 'card' | 'bordered' | 'shadow')}
                options={[
                    { id: 'tab', label: 'Tab' },
                    { id: 'card', label: 'Card' },
                    { id: 'bordered', label: 'Bordered' },
                    { id: 'shadow', label: 'Shadow' }
                ]}
                icon={Layout}
            />

            {/* 열림 상태 설정 (Tab 패널이 아닌 경우에만) */}
            {!isTabPanel && (
                <PropertyCheckbox
                    label="열림 상태"
                    checked={Boolean(currentProps.isOpen)}
                    onChange={(checked) => updateProp('isOpen', checked)}
                    icon={ToggleLeft}
                />
            )}

            {/* 닫기 가능 설정 (Tab 패널이 아닌 경우에만) */}
            {!isTabPanel && (
                <PropertyCheckbox
                    label="닫기 가능"
                    checked={Boolean(currentProps.isDismissable)}
                    onChange={(checked) => updateProp('isDismissable', checked)}
                    icon={X}
                />
            )}

            {/* Tab 패널인 경우 tabIndex 정보 표시 */}
            {isTabPanel && (
                <div className="tab-panel-info">
                    <p className="tab-panel-note">
                        이 패널은 탭 컴포넌트의 일부입니다. (인덱스: {currentProps.tabIndex})
                    </p>
                    <p className="tab-panel-help">
                        💡 탭 컴포넌트에서 탭 속성을 편집할 수 있습니다.
                    </p>
                </div>
            )}
        </div>
    );
}
