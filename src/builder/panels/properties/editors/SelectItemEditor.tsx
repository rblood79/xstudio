import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { Tag, Binary, FileText, PointerOff, Type, Hash } from 'lucide-react';
import { PropertyInput } from '../../common/PropertyInput';
import { PropertySwitch } from '../../common/PropertySwitch';
import { PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const SelectItemEditor = memo(function SelectItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="selectitem_1"
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

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

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
            </PropertySection>
        </>
    );
});
