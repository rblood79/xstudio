import { memo, useCallback, useMemo } from "react";
import { Type, Parentheses, Circle, Activity } from 'lucide-react';
import { PropertyEditorProps } from '../types/editorTypes';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId , PropertySection} from '../../common';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const BadgeEditor = memo(function BadgeEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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

    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                placeholder="badge_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Type}
                    placeholder="5"
                />
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.VARIANT_SURFACE },
                        { value: 'outline', label: PROPERTY_LABELS.VARIANT_OUTLINE },
                        { value: 'ghost', label: PROPERTY_LABELS.VARIANT_GHOST },
                    ]}
                    icon={Parentheses}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'sm')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'xs', label: PROPERTY_LABELS.SIZE_XS },
                        { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                        { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                        { value: 'lg', label: PROPERTY_LABELS.SIZE_LG },
                        { value: 'xl', label: PROPERTY_LABELS.SIZE_XL },
                    ]}
                    icon={Parentheses}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label="Dot Badge"
                    isSelected={Boolean(currentProps.isDot)}
                    onChange={(checked) => updateProp('isDot', checked)}
                    icon={Circle}
                />

                <PropertySwitch
                    label="Pulsing Animation"
                    isSelected={Boolean(currentProps.isPulsing)}
                    onChange={(checked) => updateProp('isPulsing', checked)}
                    icon={Activity}
                />
            </PropertySection>
        </>
    );
}

export default BadgeEditor;
