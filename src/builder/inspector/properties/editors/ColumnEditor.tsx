import { PropertyInput, PropertyCheckbox } from '../components';
import type { ColumnElementProps } from '../../../../types/store';
import { PropertyEditorProps } from '../types/editorTypes'; // PropertyEditorProps import
import { useStore } from '../../../stores'; // useStore import

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
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">컬럼 속성</h3>

            {/* Column Title */}
            <PropertyInput
                label="컬럼 제목"
                value={(currentProps as ColumnElementProps)?.children as string || ''}
                onChange={(value) => updateProps({ children: value })}
                placeholder="컬럼 제목을 입력하세요"
            />

            {/* Is Row Header */}
            <PropertyCheckbox
                label="행 헤더로 사용"
                isSelected={!!(currentProps as ColumnElementProps)?.isRowHeader}
                onChange={(isSelected) => updateProps({ isRowHeader: isSelected })}
            />

            {/* Column Width */}
            <PropertyInput
                label="컬럼 너비"
                value={(currentProps as ColumnElementProps)?.width || ''}
                onChange={(value) => updateProps({ width: value })}
                placeholder="예: 200px, auto, 1fr"
            />

            {/* Min Width */}
            <PropertyInput
                label="최소 너비"
                value={(currentProps as ColumnElementProps)?.minWidth || ''}
                onChange={(value) => updateProps({ minWidth: value })}
                placeholder="예: 100px"
            />

            {/* Max Width */}
            <PropertyInput
                label="최대 너비"
                value={(currentProps as ColumnElementProps)?.maxWidth || ''}
                onChange={(value) => updateProps({ maxWidth: value })}
                placeholder="예: 400px"
            />
        </div>
    );
}
