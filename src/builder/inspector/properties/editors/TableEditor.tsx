import { useState } from 'react';
import { Button } from 'react-aria-components';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { Element } from '../../../../types/store';
import { ElementUtils } from '../../../../utils/elementUtils';
import { PropertyInput, PropertySelect } from '../components'; // 재사용 컴포넌트 import
// import type { Selection } from 'react-aria-components'; // Selection type 제거
import { TableElementProps, ColumnElementProps } from '../../../../types/unified'; // TableElementProps, ColumnElementProps import 경로 수정
import { PropertyEditorProps } from '../types/editorTypes'; // PropertyEditorProps import

// interface TableEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function TableEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);
    const setElements = useStore(state => state.setElements);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnLabel, setNewColumnLabel] = useState('');

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);

    // element가 없는 경우 빈 화면 반환
    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                Table 요소를 선택하세요
            </div>
        );
    }

    // Table 구조 분석
    const tableHeader = elements.find(el => el.parent_id === element.id && el.tag === 'TableHeader');
    const tableBody = elements.find(el => el.parent_id === element.id && el.tag === 'TableBody');

    // 현재 테이블의 컬럼들 찾기 (TableHeader > Column)
    const columns = tableHeader
        ? elements.filter(el => el.parent_id === tableHeader.id && el.tag === 'Column')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
        : [];

    // 현재 테이블의 행들 찾기 (TableBody > Row)
    const rows = tableBody
        ? elements.filter(el => el.parent_id === tableBody.id && el.tag === 'Row')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
        : [];

    const addColumn = async () => {
        if (!newColumnLabel.trim() || !tableHeader) return;

        try {
            const columnId = ElementUtils.generateId();
            const newColumnElement: Element = {
                id: columnId,
                tag: 'Column',
                props: {
                    children: newColumnLabel,
                    isRowHeader: false
                },
                parent_id: tableHeader.id,
                page_id: element.page_id!,
                order_num: columns.length,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 데이터베이스에 저장
            const { error } = await supabase
                .from('elements')
                .upsert([newColumnElement], {
                    onConflict: 'id'
                });

            if (error) {
                console.error('컬럼 추가 실패:', error);
                return;
            }

            // 메모리 상태 업데이트
            const updatedElements = [...elements, newColumnElement];

            // 기존 행들에 새 Cell 추가
            for (const row of rows) {
                const cellId = ElementUtils.generateId();
                const newCellElement: Element = {
                    id: cellId,
                    tag: 'Cell',
                    props: {
                        children: ''
                    },
                    parent_id: row.id,
                    page_id: element.page_id!,
                    order_num: columns.length,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error: cellError } = await supabase
                    .from('elements')
                    .upsert([newCellElement], {
                        onConflict: 'id'
                    });

                if (!cellError) {
                    updatedElements.push(newCellElement);
                }
            }

            setElements(updatedElements);

            // 폼 초기화
            setNewColumnLabel('');
            setIsAddingColumn(false);

            console.log('✅ 테이블 컬럼 추가 완료:', newColumnLabel);
        } catch (error) {
            console.error('컬럼 추가 중 오류:', error);
        }
    };

    const removeColumn = async (columnId: string) => {
        try {
            const columnToRemove = elements.find(el => el.id === columnId);
            if (!columnToRemove) return;

            // removeElement 함수를 사용하여 연관된 Cell들도 함께 삭제
            const { removeElement } = useStore.getState();
            await removeElement(columnId);

            console.log('✅ 테이블 컬럼 삭제 완료:', columnId);
        } catch (error) {
            console.error('컬럼 삭제 중 오류:', error);
        }
    };

    const addRow = async () => {
        if (!tableBody) return;

        try {
            const rowId = ElementUtils.generateId();
            const newRowElement: Element = {
                id: rowId,
                tag: 'Row',
                props: {},
                parent_id: tableBody.id,
                page_id: element.page_id!,
                order_num: rows.length,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 행 생성
            const { error: rowError } = await supabase
                .from('elements')
                .upsert([newRowElement], {
                    onConflict: 'id'
                });

            if (rowError) {
                console.error('행 추가 실패:', rowError);
                return;
            }

            // 각 컬럼에 대한 셀 생성
            const cellsToCreate: Element[] = [];
            for (let i = 0; i < columns.length; i++) {
                const cellId = ElementUtils.generateId();
                const newCellElement: Element = {
                    id: cellId,
                    tag: 'Cell',
                    props: {
                        children: ''
                    },
                    parent_id: rowId,
                    page_id: element.page_id!,
                    order_num: i,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                cellsToCreate.push(newCellElement);
            }

            // 셀들 생성
            const { error: cellsError } = await supabase
                .from('elements')
                .upsert(cellsToCreate, {
                    onConflict: 'id'
                });

            if (cellsError) {
                console.error('셀 추가 실패:', cellsError);
                return;
            }

            // 메모리 상태 업데이트
            const updatedElements = [...elements, newRowElement, ...cellsToCreate];
            setElements(updatedElements);

            console.log('✅ 테이블 행 추가 완료');
        } catch (error) {
            console.error('행 추가 중 오류:', error);
        }
    };

    const removeRow = async (rowId: string) => {
        try {
            // removeElement 함수를 사용하여 자식 Cell들도 함께 삭제
            const { removeElement } = useStore.getState();
            await removeElement(rowId);

            console.log('✅ 테이블 행 삭제 완료:', rowId);
        } catch (error) {
            console.error('행 삭제 중 오류:', error);
        }
    };

    // Table 속성 업데이트 함수들
    const updateTableProps = (newProps: Partial<TableElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    return (
        <div className="space-y-4 p-4">
            {/* Table 기본 속성 */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">테이블 속성</h3>

                {/* Selection Mode */}
                <PropertySelect
                    label="선택 모드"
                    value={(currentProps as TableElementProps)?.selectionMode || 'none'}
                    options={[
                        { value: 'none', label: '선택 없음' },
                        { value: 'single', label: '단일 선택' },
                        { value: 'multiple', label: '다중 선택' },
                    ]}
                    onChange={(key) => updateTableProps({ selectionMode: key as 'none' | 'single' | 'multiple' })}
                />

                {/* Table Size */}
                <PropertySelect
                    label="크기"
                    value={(currentProps as TableElementProps)?.size || 'md'}
                    options={[
                        { value: 'sm', label: '작게' },
                        { value: 'md', label: '보통' },
                        { value: 'lg', label: '크게' },
                    ]}
                    onChange={(key) => updateTableProps({ size: key as 'sm' | 'md' | 'lg' })}
                />

                {/* Table Variant */}
                <PropertySelect
                    label="스타일"
                    value={(currentProps as TableElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: '기본' },
                        { value: 'striped', label: '줄무늬' },
                        { value: 'bordered', label: '테두리' },
                    ]}
                    onChange={(key) => updateTableProps({ variant: key as 'default' | 'striped' | 'bordered' })}
                />

                {/* Table Header Variant */}
                <PropertySelect
                    label="헤더 스타일"
                    value={(currentProps as TableElementProps)?.headerVariant || 'default'}
                    options={[
                        { value: 'default', label: '기본' },
                        { value: 'dark', label: '어둡게' },
                        { value: 'primary', label: '주요' },
                    ]}
                    onChange={(key) => updateTableProps({ headerVariant: key as 'default' | 'dark' | 'primary' })}
                />

                {/* Table Cell Variant */}
                <PropertySelect
                    label="셀 스타일"
                    value={(currentProps as TableElementProps)?.cellVariant || 'default'}
                    options={[
                        { value: 'default', label: '기본' },
                        { value: 'striped', label: '줄무늬' },
                    ]}
                    onChange={(key) => updateTableProps({ cellVariant: key as 'default' | 'striped' })}
                />
            </div>

            <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">테이블 구조</h3>

                {/* 컬럼 관리 */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium">컬럼 ({columns.length}개)</h4>
                        <Button
                            onPress={() => setIsAddingColumn(!isAddingColumn)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            {isAddingColumn ? '취소' : '컬럼 추가'}
                        </Button>
                    </div>

                    {isAddingColumn && (
                        <div className="p-3 bg-gray-50 rounded space-y-2">
                            <PropertyInput
                                label="컬럼 이름"
                                value={newColumnLabel}
                                onChange={setNewColumnLabel}
                                placeholder="컬럼 이름을 입력하세요"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onPress={addColumn}
                                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    추가
                                </Button>
                                <Button
                                    onPress={() => {
                                        setIsAddingColumn(false);
                                        setNewColumnLabel('');
                                    }}
                                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    취소
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 기존 컬럼들 */}
                    <div className="space-y-1">
                        {columns.map((column, index) => (
                            <div key={column.id} className="flex items-center justify-between p-2 bg-white border rounded">
                                <span className="text-sm">
                                    {index + 1}. {column.props?.children || '제목 없음'}
                                    {(column.props as ColumnElementProps)?.isRowHeader && (
                                        <span className="ml-2 px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">헤더</span>
                                    )}
                                </span>
                                <Button
                                    onPress={() => removeColumn(column.id)}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    삭제
                                </Button>
                            </div>
                        ))}
                        {columns.length === 0 && (
                            <div className="text-sm text-gray-500 text-center py-2">
                                컬럼이 없습니다
                            </div>
                        )}
                    </div>
                </div>

                {/* 행 관리 */}
                <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium">행 ({rows.length}개)</h4>
                        <Button
                            onPress={addRow}
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            행 추가
                        </Button>
                    </div>

                    {/* 기존 행들 */}
                    <div className="space-y-1">
                        {rows.map((row, index) => {
                            const rowCells = elements.filter(el =>
                                el.parent_id === row.id && el.tag === 'Cell'
                            ).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

                            return (
                                <div key={row.id} className="flex items-center justify-between p-2 bg-white border rounded">
                                    <div className="text-sm">
                                        <span className="font-medium">행 {index + 1}</span>
                                        <span className="ml-2 text-gray-500">
                                            ({rowCells.length}개 셀)
                                        </span>
                                    </div>
                                    <Button
                                        onPress={() => removeRow(row.id)}
                                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                    >
                                        삭제
                                    </Button>
                                </div>
                            );
                        })}
                        {rows.length === 0 && (
                            <div className="text-sm text-gray-500 text-center py-2">
                                행이 없습니다
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}