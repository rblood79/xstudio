import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { Tag, Binary, FileText, PointerOff, Play } from 'lucide-react';
import { PropertyInput } from '../../../components';
import { PropertySwitch } from '../../../components';
import { PropertyCustomId , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ComboBoxItemEditor = memo(function ComboBoxItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
      // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);
    // 로컬 상태로 프로퍼티 관리
    const [localProps, setLocalProps] = useState<Record<string, unknown>>({});
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 초기 로컬 상태 설정
    useEffect(() => {
         
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

    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                placeholder="comboboxitem_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

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
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(localProps.isDisabled)}
                    onChange={(checked) => handlePropertyChange('isDisabled', checked)}
                    icon={PointerOff}
                />
            </PropertySection>

            {/* Actions Section */}
            <PropertySection title="Actions">
                <PropertyInput
                    label="On Action"
                    value={String(localProps.onAction || '')}
                    onChange={(value) => handlePropertyChange('onAction', value || undefined)}
                    placeholder="handleCreateItem"
                    icon={Play}
                />
                <p className="property-help">
                    💡 "Create" 옵션 구현 시 사용 (검색 결과 없을 때 새 항목 생성)
                </p>
            </PropertySection>
        </>
    );
});
