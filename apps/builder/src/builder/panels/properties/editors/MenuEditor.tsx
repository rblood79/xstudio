import { memo, useMemo } from "react";
import { Tag, PointerOff, Focus, SquareX, Menu, Type, Hash, Database } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId, PropertySection, PropertyDataBinding, type DataBindingValue } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

// 상수 정의
const SELECTION_MODES = [
    { value: 'none', label: PROPERTY_LABELS.SELECTION_MODE_NONE },
    { value: 'single', label: PROPERTY_LABELS.SELECTION_MODE_SINGLE },
    { value: 'multiple', label: PROPERTY_LABELS.SELECTION_MODE_MULTIPLE }
];

export const MenuEditor = memo(function MenuEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
      // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const handleDataBindingChange = (binding: DataBindingValue | null) => {
        const updatedProps = {
            ...currentProps,
            dataBinding: binding || undefined
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

    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="menu_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value || undefined)}
                    icon={Tag}
                />
            </PropertySection>

            {/* Data Binding Section */}
            <PropertySection title="Data Binding" icon={Database}>
                <PropertyDataBinding
                    label="데이터 소스"
                    value={currentProps.dataBinding as DataBindingValue | undefined}
                    onChange={handleDataBindingChange}
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">

                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_MODE}
                    value={String(currentProps.selectionMode || 'none')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={SELECTION_MODES}
                    icon={Menu}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    isSelected={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={SquareX}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.SELECTED_KEYS}
                    value={Array.isArray(currentProps.selectedKeys) ? currentProps.selectedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('selectedKeys', keys);
                    }}
                    placeholder="item1, item2"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEYS}
                    value={Array.isArray(currentProps.defaultSelectedKeys) ? currentProps.defaultSelectedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('defaultSelectedKeys', keys);
                    }}
                    placeholder="item1"
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />
            </PropertySection>
        </>
    );
});
