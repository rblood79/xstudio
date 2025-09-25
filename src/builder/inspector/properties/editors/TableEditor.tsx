import { useState } from 'react';
import { SquarePlus, Trash, Table, Grid, Settings, Tag, Cloud, Link, List, Key } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { Element } from '../../../../types/store';
import { ElementUtils } from '../../../../utils/elementUtils';
import { TableElementProps } from '../../../../types/unified';

// interface TableEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function TableEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);
    const setElements = useStore(state => state.setElements);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnLabel, setNewColumnLabel] = useState('');
    const [newColumnKey, setNewColumnKey] = useState(''); // New state for column key

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
    const tableBody = elements.find(el => el.parent_id === element.id && el.tag === 'TableBody');

    // 현재 테이블의 행들 찾기 (TableBody > Row)
    const rows = tableBody
        ? elements.filter(el => el.parent_id === tableBody.id && el.tag === 'Row')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
        : [];

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
            const columnsFromProps = (currentProps as TableElementProps)?.columns || [];

            for (let i = 0; i < columnsFromProps.length; i++) {
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

    const handleAddColumnToTableProps = () => {
        if (!newColumnLabel.trim() || !newColumnKey.trim()) return;

        const currentColumns = (currentProps as TableElementProps)?.columns || [];
        const newColumn = {
            key: newColumnKey.trim(),
            label: newColumnLabel.trim(),
            allowsSorting: true, // Default to sortable
        };

        updateTableProps({
            columns: [...currentColumns, newColumn],
        });

        setNewColumnLabel('');
        setNewColumnKey('');
        setIsAddingColumn(false);
    };

    const handleRemoveColumnFromTableProps = (keyToRemove: string) => {
        const currentColumns = (currentProps as TableElementProps)?.columns || [];
        updateTableProps({
            columns: currentColumns.filter(col => col.key !== keyToRemove),
        });
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Table Properties</legend>

                {/* Enable Async Loading */}
                <PropertyCheckbox
                    icon={Cloud}
                    label="비동기 로딩 활성화"
                    isSelected={(currentProps as TableElementProps)?.enableAsyncLoading || false}
                    onChange={(enableAsyncLoading) => updateTableProps({ enableAsyncLoading })}
                />

                {/* API URL Key */}
                {(currentProps as TableElementProps)?.enableAsyncLoading && (
                    <PropertyInput
                        icon={Link}
                        label="API URL 키"
                        value={(currentProps as TableElementProps)?.apiUrlKey || ''}
                        onChange={(apiUrlKey) => updateTableProps({ apiUrlKey })}
                        placeholder="API URL 키 (예: SWAPI_API)"
                    />
                )}

                {/* Endpoint Path */}
                {(currentProps as TableElementProps)?.enableAsyncLoading && (
                    <PropertyInput
                        icon={Link}
                        label="엔드포인트 경로"
                        value={(currentProps as TableElementProps)?.endpointPath || ''}
                        onChange={(endpointPath) => updateTableProps({ endpointPath })}
                        placeholder="엔드포인트 경로 (예: /people)"
                    />
                )}

                {/* API Parameters (JSON) */}
                {(currentProps as TableElementProps)?.enableAsyncLoading && (
                    <PropertyInput
                        icon={List}
                        label="API 파라미터 (JSON)"
                        value={JSON.stringify((currentProps as TableElementProps)?.apiParams || {}, null, 2)}
                        onChange={(value) => {
                            try {
                                updateTableProps({ apiParams: JSON.parse(value) });
                            } catch (e) {
                                console.error("Invalid JSON for API Parameters", e);
                                // 사용자에게 피드백 제공 (예: 오류 메시지 표시)
                            }
                        }}
                        placeholder={`{"search": "Luke"}`}
                        multiline={true} // Explicitly set multiline prop
                    />
                )}

                {/* Data Mapping (JSON) */}
                {(currentProps as TableElementProps)?.enableAsyncLoading && (
                    <PropertyInput
                        icon={List}
                        label="데이터 매핑 (JSON)"
                        value={JSON.stringify((currentProps as TableElementProps)?.dataMapping || {}, null, 2)}
                        onChange={(value) => {
                            try {
                                updateTableProps({ dataMapping: JSON.parse(value) });
                            } catch (e) {
                                console.error("Invalid JSON for Data Mapping", e);
                                // 사용자에게 피드백 제공
                            }
                        }}
                        placeholder={`{"resultPath": "results", "idKey": "name"}`}
                        multiline={true} // Explicitly set multiline prop
                    />
                )}

                {/* Selection Mode */}
                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_MODE}
                    value={(currentProps as TableElementProps)?.selectionMode || 'none'}
                    options={[
                        { value: 'none', label: '선택 없음' },
                        { value: 'single', label: '단일 선택' },
                        { value: 'multiple', label: '다중 선택' },
                    ]}
                    onChange={(key) => updateTableProps({ selectionMode: key as 'none' | 'single' | 'multiple' })}
                    icon={Grid}
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
                    icon={Settings}
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
                    icon={Table}
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
                    icon={Settings}
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
                    icon={Settings}
                />
            </fieldset>

            {/* 페이지네이션 모드 설정 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <List className="legend-icon" />
                    Pagination Mode
                </legend>

                <PropertySelect
                    icon={Settings}
                    label="페이지네이션 모드"
                    value={(currentProps as TableElementProps)?.paginationMode || 'infinite-scroll'}
                    options={[
                        { value: 'infinite-scroll', label: '무한 스크롤 (모바일 친화적)' },
                        { value: 'pagination', label: '페이지네이션 (데스크탑 친화적)' }
                    ]}
                    onChange={(paginationMode) => updateTableProps({ paginationMode: paginationMode as 'pagination' | 'infinite-scroll' })}
                />

                <div className="tab-overview">
                    <span className="help-text">
                        {currentProps?.paginationMode === 'pagination'
                            ? '페이지 번호로 네비게이션하는 전통적인 방식'
                            : '스크롤 시 자동으로 더 많은 데이터를 로드하는 방식'
                        }
                    </span>
                </div>
            </fieldset>

            {/* 가상화 설정 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Grid className="legend-icon" />
                    Virtualization Settings
                </legend>

                <PropertyInput
                    icon={Settings}
                    label="테이블 높이 (px)"
                    value={(currentProps as TableElementProps)?.height || 400}
                    onChange={(height) => updateTableProps({ height: parseInt(height) || 400 })}
                />

                <PropertyInput
                    icon={Settings}
                    label="행 높이 (px)"
                    value={(currentProps as TableElementProps)?.itemHeight || 50}
                    onChange={(itemHeight) => updateTableProps({ itemHeight: parseInt(itemHeight) || 50 })}
                />

                <PropertyInput
                    icon={Settings}
                    label="미리 렌더링 행 수"
                    value={(currentProps as TableElementProps)?.overscan || 5}
                    onChange={(overscan) => updateTableProps({ overscan: parseInt(overscan) || 5 })}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Column Management</legend>

                {/* 컬럼 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total columns: {(currentProps as TableElementProps)?.columns?.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Manage table columns and their properties
                    </p>
                </div>

                {/* 컬럼 추가 필드 */}
                {isAddingColumn && (
                    <div className="space-y-2">
                        <PropertyInput
                            icon={Tag}
                            label="컬럼 라벨"
                            value={newColumnLabel}
                            onChange={setNewColumnLabel}
                            placeholder="표시될 컬럼 이름"
                        />
                        <PropertyInput
                            icon={Key}
                            label="컬럼 키"
                            value={newColumnKey}
                            onChange={setNewColumnKey}
                            placeholder="데이터 객체의 키 (예: id, name)"
                        />
                    </div>
                )}

                {/* 기존 컬럼들 */}
                {((currentProps as TableElementProps)?.columns || []).length > 0 && (
                    <div className='tabs-list'>
                        {((currentProps as TableElementProps)?.columns || []).map((column, index) => (
                            <div key={column.key} className='tab-list-item'>
                                <span className='tab-title'>
                                    {column.label || `Column ${index + 1}`}
                                    <span className="ml-2 text-gray-500 text-sm">({column.key})</span>
                                </span>
                                <button
                                    className='control-button delete'
                                    onClick={() => handleRemoveColumnFromTableProps(column.key)}
                                >
                                    <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 컬럼 관리 버튼들 */}
                <div className='tab-actions'>
                    {isAddingColumn ? (
                        <>
                            <button
                                className='control-button add'
                                onClick={handleAddColumnToTableProps}
                            >
                                <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                Add Column
                            </button>
                            <button
                                className='control-button secondary'
                                onClick={() => {
                                    setIsAddingColumn(false);
                                    setNewColumnLabel('');
                                    setNewColumnKey('');
                                }}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            className='control-button add'
                            onClick={() => setIsAddingColumn(true)}
                        >
                            <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Add Column
                        </button>
                    )}
                </div>
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Row Management</legend>

                {/* 행 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total rows: {rows.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Manage table rows and their cells
                    </p>
                </div>

                {/* 기존 행들 */}
                {rows.length > 0 && (
                    <div className='tabs-list'>
                        {rows.map((row, index) => {
                            const rowCells = elements.filter(el =>
                                el.parent_id === row.id && el.tag === 'Cell'
                            ).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

                            return (
                                <div key={row.id} className='tab-list-item'>
                                    <span className='tab-title'>
                                        Row {index + 1} ({rowCells.length} cells)
                                    </span>
                                    <button
                                        className='control-button delete'
                                        onClick={() => removeRow(row.id)}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 행 추가 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={addRow}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Row
                    </button>
                </div>
            </fieldset>
        </div>
    );
}