import { PropertyInput, PropertyCheckbox } from '../components';
import type { ColumnElementProps } from '../../../../types/store';
import { PropertyEditorProps } from '../types/editorTypes';
import { useStore } from '../../../stores';
import { Type, Crown, Ruler, ArrowLeft, ArrowRight } from 'lucide-react';

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

                {/* Column Title */}
                <PropertyInput
                    label="컬럼 제목"
                    value={(currentProps as ColumnElementProps)?.children as string || ''}
                    onChange={(value) => updateProps({ children: value })}
                    placeholder="컬럼 제목을 입력하세요"
                    icon={Type}
                />

                {/* Is Row Header */}
                <PropertyCheckbox
                    label="행 헤더로 사용"
                    isSelected={!!(currentProps as ColumnElementProps)?.isRowHeader}
                    onChange={(isSelected) => updateProps({ isRowHeader: isSelected })}
                    icon={Crown}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Column Sizing</legend>

                {/* Column Width */}
                <PropertyInput
                    label="컬럼 너비"
                    value={(currentProps as ColumnElementProps)?.width || ''}
                    onChange={(value) => updateProps({ width: value })}
                    placeholder="예: 200px, auto, 1fr"
                    icon={Ruler}
                />

                {/* Min Width */}
                <PropertyInput
                    label="최소 너비"
                    value={(currentProps as ColumnElementProps)?.minWidth || ''}
                    onChange={(value) => updateProps({ minWidth: value })}
                    placeholder="예: 100px"
                    icon={ArrowLeft}
                />

                {/* Max Width */}
                <PropertyInput
                    label="최대 너비"
                    value={(currentProps as ColumnElementProps)?.maxWidth || ''}
                    onChange={(value) => updateProps({ maxWidth: value })}
                    placeholder="예: 400px"
                    icon={ArrowRight}
                />
            </fieldset>
        </div>
    );
}
