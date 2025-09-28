import React, { forwardRef, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { tv } from 'tailwind-variants';
import { TableElementProps } from '../../types/unified';
import { useStore } from '../stores';
import { apiConfig, type MockUserData } from '../../services/api';

// DataGrid 스타일 variants
const dataGridVariants = tv({
    base: 'react-aria-DataGrid',
    variants: {
        size: {
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg'
        },
        variant: {
            default: 'bg-white',
            striped: 'bg-white',
            bordered: 'border-2'
        }
    },
    defaultVariants: {
        size: 'md',
        variant: 'default'
    }
});

const cellVariants = tv({
    base: 'react-aria-Row',
    variants: {
        isHeader: {
            true: 'bg-gray-50 font-semibold text-gray-700',
            false: 'bg-white text-gray-900'
        },
        isSelected: {
            true: 'bg-blue-50 text-blue-900',
            false: ''
        },
        isHovered: {
            true: 'bg-gray-50',
            false: ''
        }
    },
    defaultVariants: {
        isHeader: false,
        isSelected: false,
        isHovered: false
    }
});

// DataGrid Props 인터페이스
interface DataGridProps<T extends Record<string, unknown>> {
    // 기본 props
    data?: T[];
    columns?: Array<{
        key: string;
        label: string;
        width?: number;
        minWidth?: number;
        maxWidth?: number;
    }>;

    // 크기 및 스타일
    width?: number;
    height?: number;
    rowHeight?: number;
    columnWidth?: number;

    // 선택 및 정렬
    selectionMode?: 'none' | 'single' | 'multiple';
    selectedKeys?: Set<string>;
    onSelectionChange?: (keys: Set<string>) => void;

    // 무한 스크롤
    enableInfiniteScroll?: boolean;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;

    // 스타일 variants
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'striped' | 'bordered';

    // 기타
    className?: string;
    'data-testid'?: string;
    'data-element-id'?: string;

    // 빌더에서 사용되는 추가 props
    maxRows?: number;
    itemTemplate?: string;
}

// Grid Row 타입
interface GridRow<T> {
    id: string;
    data: T;
    isEditing?: boolean;
    editingCell?: keyof T;
    errors?: Partial<Record<keyof T, string>>;
}

// Virtual Row 컴포넌트
interface VirtualRowProps<T> {
    virtualRow: {
        index: number;
        start: number;
        size: number;
        end: number;
    };
    row: GridRow<T>;
    columns: Array<{ key: string; label: string; width?: number }>;
    selectedKeys: Set<string>;
    onRowClick: (rowId: string) => void;
    onCellEdit: (rowId: string, cellKey: keyof T, value: string) => void;
    onCellSave: (rowId: string, cellKey: keyof T) => void;
    onCellCancel: (rowId: string, cellKey: keyof T) => void;
}

function VirtualRow<T extends Record<string, unknown>>({
    virtualRow,
    row,
    columns,
    selectedKeys,
    onRowClick,
    onCellEdit,
    onCellSave,
    onCellCancel
}: VirtualRowProps<T>) {
    const isSelected = selectedKeys.has(row.id);
    const [editingCell, setEditingCell] = useState<keyof T | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const handleCellDoubleClick = useCallback((cellKey: keyof T) => {
        setEditingCell(cellKey);
        setEditValue(String(row.data[cellKey] || ''));
    }, [row.data]);

    const handleCellKeyDown = useCallback((e: React.KeyboardEvent, cellKey: keyof T) => {
        if (e.key === 'Enter') {
            onCellSave(row.id, cellKey);
            setEditingCell(null);
        } else if (e.key === 'Escape') {
            onCellCancel(row.id, cellKey);
            setEditingCell(null);
        }
    }, [row.id, onCellSave, onCellCancel]);

    const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, cellKey: keyof T) => {
        const value = e.target.value;
        setEditValue(value);
        onCellEdit(row.id, cellKey, value);
    }, [row.id, onCellEdit]);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex'
            }}
            className={cellVariants({ isSelected })}
            onClick={() => onRowClick(row.id)}
        >
            {columns.map((column) => {
                const cellKey = column.key as keyof T;
                const cellValue = row.data[cellKey];
                const isEditing = editingCell === cellKey;

                return (
                    <div
                        key={column.key}
                        style={{
                            width: column.width || 150,
                            minWidth: (column as { minWidth?: number }).minWidth || 100,
                            maxWidth: (column as { maxWidth?: number }).maxWidth || 300
                        }}
                        className="react-aria-Cell"
                        onDoubleClick={() => handleCellDoubleClick(cellKey)}
                    >
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => handleCellChange(e, cellKey)}
                                onKeyDown={(e) => handleCellKeyDown(e, cellKey)}
                                onBlur={() => {
                                    onCellSave(row.id, cellKey);
                                    setEditingCell(null);
                                }}
                                className="w-full border-none outline-none bg-transparent"
                                autoFocus
                            />
                        ) : (
                            <span className="truncate">
                                {String(cellValue || '')}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export const DataGrid = forwardRef(function DataGrid<T extends Record<string, unknown>>(
    {
        data = [],
        columns = [],
        // width = 800, // 사용하지 않는 변수
        height = 400,
        rowHeight = 35,
        columnWidth = 150,
        selectionMode = 'none',
        selectedKeys = new Set(),
        onSelectionChange,
        enableInfiniteScroll = true,
        onLoadMore,
        hasMore = true,
        isLoading = false,
        size = 'sm',
        variant = 'default',
        className,
        'data-testid': testId,
        'data-element-id': elementId,
        ...props
    }: DataGridProps<T>,
    ref: React.Ref<HTMLDivElement>
) {
    // 빌더 환경에서 실제 element 찾기
    const elements = useStore(state => state.elements);
    const actualElement = elementId ? elements.find(el => el.id === elementId) : null;
    const actualElementProps = actualElement?.props as TableElementProps || {};

    // API 데이터 상태
    const [apiData, setApiData] = useState<MockUserData[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);

    // API에서 데이터 가져오기
    const fetchDataFromApi = useCallback(async (page: number = 1, limit: number = 50) => {
        try {
            setIsLoadingData(true);
            console.log(`🔄 DataGrid API 데이터 로드: page ${page}, limit ${limit}`);

            const fetchedData = await apiConfig.MOCK_USER_DATA('/api/mock/users', {
                page,
                limit
            });

            console.log(`✅ DataGrid API 데이터 로드 완료: ${fetchedData.length}개 항목`);

            if (page === 1) {
                setApiData(fetchedData);
            } else {
                // 메모리 최적화: 최대 1000개까지만 유지
                setApiData(prev => {
                    const newData = [...prev, ...fetchedData];
                    if (newData.length > 1000) {
                        console.log(`🧹 DataGrid 메모리 최적화: ${newData.length}개 → 1000개로 제한`);
                        return newData.slice(-1000); // 최근 1000개만 유지
                    }
                    return newData;
                });
            }

            setHasMoreData(fetchedData.length === limit);
            setCurrentPage(page);
        } catch (error) {
            console.error('❌ DataGrid API 데이터 로드 실패:', error);
            setApiData([]);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        if (data.length === 0 && !actualElementProps.items?.length) {
            fetchDataFromApi(1, 50);
        }
    }, [data.length, actualElementProps.items?.length, fetchDataFromApi]);

    // 컴포넌트 언마운트 시 정리 작업
    useEffect(() => {
        return () => {
            // 메모리 정리
            console.log("🧹 DataGrid 컴포넌트 언마운트 - 메모리 정리");
        };
    }, []);

    // 실제 사용할 데이터와 컬럼 (useMemo로 최적화 + 메모리 제한)
    const finalData = useMemo(() => {
        let sourceData;
        if (data.length > 0) {
            sourceData = data;
        } else if (actualElementProps.items?.length) {
            sourceData = actualElementProps.items;
        } else {
            sourceData = apiData;
        }

        // 메모리 최적화: 최대 1000개까지만 사용
        if (sourceData.length > 1000) {
            console.log(`🧹 DataGrid finalData 메모리 최적화: ${sourceData.length}개 → 1000개로 제한`);
            return sourceData.slice(-1000); // 최근 1000개만 사용
        }

        return sourceData;
    }, [data, actualElementProps.items, apiData]);

    const finalColumns = useMemo(() =>
        columns.length > 0 ? columns : [
            { key: 'id', label: 'ID', width: 80 },
            { key: 'name', label: '이름', width: 150 },
            { key: 'email', label: '이메일', width: 200 },
            { key: 'jobTitle', label: '직책', width: 150 },
            { key: 'phone', label: '전화번호', width: 150 },
            { key: 'address', label: '주소', width: 200 }
        ],
        [columns]
    );

    // Grid rows 생성
    const gridRows = useMemo(() =>
        finalData.map((item, index) => ({
            id: (item.id as string) || `row-${index}`,
            data: item,
            isEditing: false,
            editingCell: undefined,
            errors: {}
        } as GridRow<T>)),
        [finalData]
    );

    // Virtualizer 설정
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: gridRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 3, // overscan을 더 줄여서 성능 향상
        measureElement: undefined, // 동적 크기 측정 비활성화
    });

    // 가상화 디버깅
    const virtualItems = rowVirtualizer.getVirtualItems();

    // 메모리 사용량 모니터링 (개발 모드에서만)
    if (import.meta.env.DEV) {
        console.log("🔍 DataGrid 가상화 상태:", {
            totalRows: gridRows.length,
            virtualItemsCount: virtualItems.length,
            startIndex: virtualItems[0]?.index || 0,
            endIndex: virtualItems[virtualItems.length - 1]?.index || 0,
            totalSize: rowVirtualizer.getTotalSize(),
            memoryOptimized: gridRows.length <= 1000
        });
    }

    // 행 클릭 핸들러
    const handleRowClick = useCallback((rowId: string) => {
        if (selectionMode !== 'none') {
            const newSelectedKeys = new Set(selectedKeys);
            if (newSelectedKeys.has(rowId)) {
                newSelectedKeys.delete(rowId);
            } else {
                if (selectionMode === 'single') {
                    newSelectedKeys.clear();
                }
                newSelectedKeys.add(rowId);
            }
            onSelectionChange?.(newSelectedKeys);
        }
    }, [selectedKeys, selectionMode, onSelectionChange]);

    // 셀 편집 핸들러
    const handleCellEdit = useCallback((rowId: string, cellKey: keyof T, value: string) => {
        // 셀 편집 로직
        console.log('Cell edit:', { rowId, cellKey, value });
    }, []);

    const handleCellSave = useCallback((rowId: string, cellKey: keyof T) => {
        // 셀 저장 로직
        console.log('Cell save:', { rowId, cellKey });
    }, []);

    const handleCellCancel = useCallback((rowId: string, cellKey: keyof T) => {
        // 셀 취소 로직
        console.log('Cell cancel:', { rowId, cellKey });
    }, []);

    // 디바운싱된 스크롤 핸들러
    const handleScroll = useCallback(() => {
        // 스크롤 이벤트가 너무 자주 발생하지 않도록 디바운싱
        const scrollElement = parentRef.current;
        if (!scrollElement) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollElement;

        // 무한 스크롤 처리 (API 데이터)
        if (enableInfiniteScroll && hasMoreData && !isLoadingData) {
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                console.log("🔄 DataGrid 무한 스크롤 - API에서 더 많은 데이터 로드");
                fetchDataFromApi(currentPage + 1, 50);
            }
        }

        // 기존 onLoadMore 콜백도 호출 (호환성 유지)
        if (enableInfiniteScroll && hasMore && !isLoading && onLoadMore) {
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                console.log("🔄 DataGrid 무한 스크롤 - 외부 콜백 호출");
                onLoadMore();
            }
        }
    }, [enableInfiniteScroll, hasMoreData, isLoadingData, currentPage, fetchDataFromApi, hasMore, isLoading, onLoadMore]);

    // 디바운싱된 스크롤 이벤트 리스너
    useEffect(() => {
        const scrollElement = parentRef.current;
        if (!scrollElement) return;

        let timeoutId: NodeJS.Timeout;
        const debouncedScrollHandler = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleScroll, 100); // 100ms 디바운싱
        };

        scrollElement.addEventListener('scroll', debouncedScrollHandler);

        return () => {
            scrollElement.removeEventListener('scroll', debouncedScrollHandler);
            clearTimeout(timeoutId);
        };
    }, [handleScroll]);

    console.log("🔍 DataGrid 렌더링:", {
        totalRows: gridRows.length,
        totalColumns: finalColumns.length,
        dataLength: finalData.length,
        columnsLength: finalColumns.length,
        enableInfiniteScroll,
        hasMore,
        isLoading
    });

    // DOM에서 지원하지 않는 props 필터링
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxRows: _maxRows, itemTemplate: _itemTemplate, ...domProps } = props;

    return (
        <div
            ref={ref}
            className={dataGridVariants({ size, variant, className })}
            data-testid={testId}
            data-element-id={elementId}
            {...domProps}
        >
            {/* 헤더 */}
            <div className="react-aria-TableHeader">
                {finalColumns.map((column) => (
                    <div
                        key={column.key}
                        style={{
                            width: column.width || columnWidth,
                            minWidth: (column as { minWidth?: number }).minWidth || 100,
                            maxWidth: (column as { maxWidth?: number }).maxWidth || 300
                        }}
                        className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-700"
                    >
                        {column.label}
                    </div>
                ))}
            </div>

            {/* 가상화된 스크롤 영역 */}
            <div
                ref={parentRef}
                style={{
                    overflow: 'auto',
                    height: `${height - 40}px`, // 헤더 높이 제외
                    width: '100%'
                }}
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: 'relative',
                        width: '100%'
                    }}
                >
                    {virtualItems.map((virtualRow) => {
                        const row = gridRows[virtualRow.index];
                        if (!row) return null;

                        return (
                            <VirtualRow
                                key={row.id}
                                virtualRow={virtualRow}
                                row={row}
                                columns={finalColumns}
                                selectedKeys={selectedKeys}
                                onRowClick={handleRowClick}
                                onCellEdit={handleCellEdit}
                                onCellSave={handleCellSave}
                                onCellCancel={handleCellCancel}
                            />
                        );
                    })}
                </div>
            </div>

            {/* 로딩 인디케이터 */}
            {(isLoading || isLoadingData) && (
                <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 text-center">
                    <div className="inline-flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        {isLoadingData ? '데이터 로딩 중...' : '로딩 중...'}
                    </div>
                </div>
            )}
        </div>
    );
});

export default DataGrid;