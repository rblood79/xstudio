import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Binary, FileText, PointerOff, Type, Hash } from 'lucide-react';
import { PropertyInput } from '../../components/PropertyInput';
import { PropertySwitch } from '../../components/PropertySwitch';
import { PropertyCustomId } from '../../../shared/ui';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function SelectItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';
    // 로컬 상태로 프로퍼티 관리
    const [localProps, setLocalProps] = useState<Record<string, unknown>>({});
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 초기 로컬 상태 설정
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalProps({ ...currentProps });
    }, [currentProps]);

    // 디바운스된 저장 함수
    const saveToStore = useCallback((props: Record<string, unknown>) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            onUpdate(props);
        }, 300); // 300ms 디바운스
    }, [onUpdate]);

    // 프로퍼티 변경 핸들러
    const handlePropertyChange = useCallback((key: string, value: unknown) => {
        const newProps = {
            ...localProps,
            [key]: value
        };

        // 로컬 상태 즉시 업데이트
        setLocalProps(newProps);

        // 디바운스된 저장
        saveToStore(newProps);
    }, [localProps, saveToStore]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const updateCustomId = (newCustomId: string) => {
        // Update customId in store (not in props)
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
                placeholder="selectitem_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(localProps.label || '')}
                    onChange={(value) => handlePropertyChange('label', value || undefined)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(localProps.value || '')}
                    onChange={(value) => handlePropertyChange('value', value || undefined)}
                    icon={Binary}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(localProps.description || '')}
                    onChange={(value) => handlePropertyChange('description', value || undefined)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT_VALUE}
                    value={String(localProps.textValue || '')}
                    onChange={(value) => handlePropertyChange('textValue', value || undefined)}
                    icon={Binary}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(localProps.isDisabled)}
                    onChange={(checked) => handlePropertyChange('isDisabled', checked)}
                    icon={PointerOff}
                />
            </fieldset>

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(localProps['aria-label'] || '')}
                    onChange={(value) => handlePropertyChange('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Select item label for screen readers"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(localProps['aria-labelledby'] || '')}
                    onChange={(value) => handlePropertyChange('aria-labelledby', value || undefined)}
                    icon={Hash}
                    placeholder="label-element-id"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(localProps['aria-describedby'] || '')}
                    onChange={(value) => handlePropertyChange('aria-describedby', value || undefined)}
                    icon={Hash}
                    placeholder="description-element-id"
                />
            </fieldset>
        </div>
    );
}
