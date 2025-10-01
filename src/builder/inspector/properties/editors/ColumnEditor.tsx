import { PropertyInput, PropertyCheckbox } from '../components';
import type { ColumnElementProps } from '../../../../types/store';
import { PropertyEditorProps } from '../types/editorTypes';
import { useStore } from '../../../stores';
import { Type, Crown, Ruler, ArrowLeft, ArrowRight, ArrowUpDown, Key, Move } from 'lucide-react';

// interface ColumnEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function ColumnEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);

    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                Column 요소를 선택하세요
            </div>
        );
    }

    const updateProps = (newProps: Partial<ColumnElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Column Content</legend>

                {/* Data Key */}
                <PropertyInput
                    label="데이터 키"
                    value={(currentProps as ColumnElementProps)?.key || ''}
                    onChange={(value) => updateProps({ key: value })}
                    placeholder="데이터 필드명 (예: id, name, email)"
                    icon={Key}
                />

                <div className="tab-overview">
                    <span className="help-text">
                        💡 API 또는 데이터의 필드명과 정확히 일치해야 합니다
                    </span>
                </div>

                {/* Column Title */}
                <PropertyInput
                    label="컬럼 제목"
                    value={(currentProps as ColumnElementProps)?.children as string || ''}
                    onChange={(value) => updateProps({ children: value })}
                    placeholder="화면에 표시될 제목"
                    icon={Type}
                />

                {/* Is Row Header */}
                <PropertyCheckbox
                    label="행 헤더로 사용"
                    isSelected={!!(currentProps as ColumnElementProps)?.isRowHeader}
                    onChange={(isSelected) => updateProps({ isRowHeader: isSelected })}
                    icon={Crown}
                />

                {/* Allows Sorting */}
                <PropertyCheckbox
                    label="정렬 가능"
                    isSelected={(currentProps as ColumnElementProps)?.allowsSorting !== false}
                    onChange={(isSelected) => updateProps({ allowsSorting: isSelected })}
                    icon={ArrowUpDown}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Column Sizing</legend>

                {/* Enable Resizing */}
                <PropertyCheckbox
                    label="크기 조절 가능"
                    isSelected={(currentProps as ColumnElementProps)?.enableResizing !== false}
                    onChange={(isSelected) => updateProps({ enableResizing: isSelected })}
                    icon={Move}
                />

                <div className="tab-overview">
                    <span className="help-text">
                        💡 사용자가 컬럼 헤더를 드래그하여 너비를 조절할 수 있습니다
                    </span>
                </div>

                {/* Column Width */}
                <PropertyInput
                    label="컬럼 너비 (px)"
                    value={(currentProps as ColumnElementProps)?.width || ''}
                    onChange={(value) => updateProps({ width: parseInt(value) || undefined })}
                    placeholder="예: 200"
                    type="number"
                    icon={Ruler}
                />

                {/* Min Width */}
                <PropertyInput
                    label="최소 너비 (px)"
                    value={(currentProps as ColumnElementProps)?.minWidth || ''}
                    onChange={(value) => updateProps({ minWidth: parseInt(value) || undefined })}
                    placeholder="예: 100"
                    type="number"
                    icon={ArrowLeft}
                />

                {/* Max Width */}
                <PropertyInput
                    label="최대 너비 (px)"
                    value={(currentProps as ColumnElementProps)?.maxWidth || ''}
                    onChange={(value) => updateProps({ maxWidth: parseInt(value) || undefined })}
                    placeholder="예: 400"
                    type="number"
                    icon={ArrowRight}
                />
            </fieldset>
        </div>
    );
}
