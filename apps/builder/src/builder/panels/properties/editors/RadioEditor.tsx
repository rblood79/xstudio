import { memo, useCallback, useMemo } from "react";
import { Tag, PointerOff, CheckCheck, PenOff, Binary, Focus, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { useSyncChildProp } from '../../../hooks/useSyncChildProp';

export const RadioEditor = memo(function RadioEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
        const element = useStore.getState().elementsMap.get(elementId);
        return element?.customId || "";
    }, [elementId]);

    // ⭐ 최적화: elementsMap O(1) 탐색으로 parent 조회 (elements.find() 배열 순회 제거)
    const isChildOfRadioGroup = useMemo(() => {
        const element = useStore.getState().elementsMap.get(elementId);
        if (!element?.parent_id) return false;
        const parentElement = useStore.getState().elementsMap.get(element.parent_id);
        return parentElement?.tag === 'RadioGroup';
    }, [elementId]);

    // ⭐ 자식 Label 동기화: Child Composition Pattern - useSyncChildProp 훅 사용
    const { buildChildUpdates } = useSyncChildProp(elementId);

    const handleChildrenChange = useCallback((value: string) => {
        const updatedProps = { ...currentProps, children: value };
        const childUpdates = buildChildUpdates([
            { childTag: 'Label', propKey: 'children', value },
        ]);
        useStore.getState().updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    }, [currentProps, buildChildUpdates]);

    const updateProp = useCallback((key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    }, [currentProps, onUpdate]);

    const updateCustomId = useCallback((newCustomId: string) => {
        // Update customId in store (not in props)
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    }, [elementId]);

    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="radio_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.children || '')}
                    onChange={handleChildrenChange}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value)}
                    icon={Binary}
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">

                <PropertySwitch
                    label={PROPERTY_LABELS.SELECTED}
                    isSelected={Boolean(currentProps.isSelected)}
                    onChange={(checked) => updateProp('isSelected', checked)}
                    icon={CheckCheck}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.READONLY}
                    isSelected={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />
            </PropertySection>

            {isChildOfRadioGroup && (
                <p style={{ fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '8px' }}>
                    💡 Variant and size are controlled by the parent RadioGroup
                </p>
            )}
        </>
    );
});
