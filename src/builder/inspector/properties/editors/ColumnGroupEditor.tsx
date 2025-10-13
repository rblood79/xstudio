import { Settings, Type, Grid, Pin } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { ColumnGroupElementProps } from '../../../../types/unified';

export function ColumnGroupEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateGroupProps = (newProps: Partial<ColumnGroupElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    return (
        <div className="component-props">
            {/* 첫 번째 그룹: 기본 속성 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Grid className="legend-icon" />
                    Column Group Properties
                </legend>

                <PropertyInput
                    icon={Type}
                    label="그룹 라벨"
                    value={(currentProps as ColumnGroupElementProps)?.label || ''}
                    onChange={(label) => updateGroupProps({ label })}
                />

                <PropertyInput
                    icon={Grid}
                    label="컬럼 범위 (span)"
                    value={(currentProps as ColumnGroupElementProps)?.span || 2}
                    onChange={(span) => updateGroupProps({ span: parseInt(span) || 2 })}
                    type="number"
                />
            </fieldset>

            {/* 두 번째 그룹: 스타일 및 정렬 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Settings className="legend-icon" />
                    Style & Alignment
                </legend>

                <PropertySelect
                    icon={Pin}
                    label="정렬"
                    value={(currentProps as ColumnGroupElementProps)?.align || 'center'}
                    options={[
                        { value: 'left', label: '왼쪽' },
                        { value: 'center', label: '가운데' },
                        { value: 'right', label: '오른쪽' },
                    ]}
                    onChange={(align) => updateGroupProps({ align: align as 'left' | 'center' | 'right' })}
                />

                <PropertySelect
                    icon={Settings}
                    label="스타일 변형"
                    value={(currentProps as ColumnGroupElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: '기본' },
                        { value: 'primary', label: '주요' },
                        { value: 'secondary', label: '보조' },
                    ]}
                    onChange={(variant) => updateGroupProps({ variant: variant as 'default' | 'primary' | 'secondary' })}
                />
            </fieldset>

            {/* 세 번째 그룹: 고급 설정 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Pin className="legend-icon" />
                    Advanced Settings
                </legend>

                <PropertyCheckbox
                    icon={Pin}
                    label="헤더 고정"
                    isSelected={(currentProps as ColumnGroupElementProps)?.sticky || false}
                    onChange={(sticky) => updateGroupProps({ sticky })}
                />

                <div className="tab-overview">
                    <span className="help-text">
                        💡 Column Group은 관련된 컬럼들을 시각적으로 그룹화하여 더 명확한 테이블 구조를 제공합니다.
                    </span>
                </div>
            </fieldset>
        </div>
    );
}
