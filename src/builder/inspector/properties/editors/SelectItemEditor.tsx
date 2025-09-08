import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Binary, FileText, PointerOff, PenOff } from 'lucide-react';
import { PropertyInput } from '../components/PropertyInput';
import { PropertyCheckbox } from '../components/PropertyCheckbox';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function SelectItemEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
        <div className="space-y-4">
            <PropertyInput
                label={PROPERTY_LABELS.LABEL}
                value={String(localProps.label || '')}
                onChange={(value) => handlePropertyChange('label', value)}
                icon={Tag}
            />

            <PropertyInput
                label={PROPERTY_LABELS.VALUE}
                value={String(localProps.value || '')}
                onChange={(value) => handlePropertyChange('value', value)}
                icon={Binary}
            />

            <PropertyInput
                label={PROPERTY_LABELS.DESCRIPTION}
                value={String(localProps.description || '')}
                onChange={(value) => handlePropertyChange('description', value)}
                icon={FileText}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.DISABLED}
                checked={Boolean(localProps.isDisabled)}
                onChange={(checked) => handlePropertyChange('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.READONLY}
                checked={Boolean(localProps.isReadOnly)}
                onChange={(checked) => handlePropertyChange('isReadOnly', checked)}
                icon={PenOff}
            />
        </div>
    );
}
