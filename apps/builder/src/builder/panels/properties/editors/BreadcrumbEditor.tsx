import { memo, useMemo } from "react";
import { Tag, Link, PointerOff, Type, Hash, CheckCircle } from 'lucide-react';
import { PropertyInput, PropertyCustomId, PropertySwitch, PropertySelect , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const BreadcrumbEditor = memo(function BreadcrumbEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="breadcrumb_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.HREF}
                    value={String(currentProps.href || '')}
                    onChange={(value) => updateProp('href', value || undefined)}
                    placeholder="/"
                    icon={Link}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySelect
                    label={PROPERTY_LABELS.TARGET}
                    value={String(currentProps.target || '')}
                    onChange={(value) => updateProp('target', value || undefined)}
                    options={[
                        { value: '', label: PROPERTY_LABELS.TARGET_NONE },
                        { value: '_self', label: PROPERTY_LABELS.TARGET_SELF },
                        { value: '_blank', label: PROPERTY_LABELS.TARGET_BLANK },
                        { value: '_parent', label: PROPERTY_LABELS.TARGET_PARENT },
                        { value: '_top', label: PROPERTY_LABELS.TARGET_TOP }
                    ]}
                    icon={Link}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.REL}
                    value={String(currentProps.rel || '')}
                    onChange={(value) => updateProp('rel', value || undefined)}
                    placeholder="noopener noreferrer"
                    icon={Link}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.CURRENT}
                    isSelected={Boolean(currentProps.isCurrent)}
                    onChange={(checked) => updateProp('isCurrent', checked)}
                    icon={CheckCircle}
                />
            </PropertySection>
        </>
    );
});
