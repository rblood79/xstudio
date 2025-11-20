import { memo, useCallback, useMemo } from "react";
import { Settings, Type, Grid, Pin } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId, PropertySection } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { ColumnGroupElementProps } from '../../../../types/builder/unified.types';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ColumnGroupEditor = memo(function ColumnGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
      // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

    const updateGroupProps = (newProps: Partial<ColumnGroupElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    return (
        <>
            {/* Basic */}
            <PropertySection title="Basic">
                <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                placeholder="columngroup_1"
            />
            </PropertySection>

            {/* 첫 번째 그룹: 기본 속성 */}
            <div className="component-fieldset">
                <legend className="component-legend">
                    <Grid className="legend-icon" />
                    {PROPERTY_LABELS.COLUMN_GROUP_PROPERTIES}
                </legend>

                <PropertyInput
                    icon={Type}
                    label={PROPERTY_LABELS.GROUP_LABEL}
                    value={(currentProps as ColumnGroupElementProps)?.label || ''}
                    onChange={(label) => updateGroupProps({ label })}
                />

                <PropertyInput
                    icon={Grid}
                    label={PROPERTY_LABELS.COLUMN_SPAN}
                    value={(currentProps as ColumnGroupElementProps)?.span || 2}
                    onChange={(span) => updateGroupProps({ span: parseInt(span) || 2 })}
                    type="number"
                />
            </div>

            {/* 두 번째 그룹: 스타일 및 정렬 */}
            <div className="component-fieldset">
                <legend className="component-legend">
                    <Settings className="legend-icon" />
                    {PROPERTY_LABELS.STYLE_AND_ALIGNMENT}
                </legend>

                <PropertySelect
                    icon={Pin}
                    label={PROPERTY_LABELS.ALIGNMENT}
                    value={(currentProps as ColumnGroupElementProps)?.align || 'center'}
                    options={[
                        { value: 'left', label: PROPERTY_LABELS.ALIGN_LEFT },
                        { value: 'center', label: PROPERTY_LABELS.ALIGN_CENTER },
                        { value: 'right', label: PROPERTY_LABELS.ALIGN_RIGHT },
                    ]}
                    onChange={(align) => updateGroupProps({ align: align as 'left' | 'center' | 'right' })}
                />

                <PropertySelect
                    icon={Settings}
                    label={PROPERTY_LABELS.STYLE_VARIANT}
                    value={(currentProps as ColumnGroupElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.TAB_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.VARIANT_SECONDARY },
                    ]}
                    onChange={(variant) => updateGroupProps({ variant: variant as 'default' | 'primary' | 'secondary' })}
                />
            </div>

            {/* 세 번째 그룹: 고급 설정 */}
            <div className="component-fieldset">
                <legend className="component-legend">
                    <Pin className="legend-icon" />
                    {PROPERTY_LABELS.ADVANCED_SETTINGS}
                </legend>

                <PropertySwitch
                    icon={Pin}
                    label={PROPERTY_LABELS.STICKY_HEADER}
                    isSelected={(currentProps as ColumnGroupElementProps)?.sticky || false}
                    onChange={(sticky) => updateGroupProps({ sticky })}
                />

                <div className="tab-overview">
                    <span className="help-text">
                        💡 Column Group visually groups related columns for clearer table structure.
                    </span>
                </div>
            </div>
        </>
    );
}
