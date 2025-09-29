import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { tv } from 'tailwind-variants';

const tableVariants = tv({
    base: 'w-full border-collapse',
    variants: {
        variant: {
            default: 'border border-gray-200',
            bordered: 'border border-gray-300',
            striped: 'border border-gray-300',
        },
        size: {
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'md',
    },
});

const headerVariants = tv({
    base: 'px-4 py-2 text-left font-semibold bg-gray-50 border-b border-gray-200 cursor-pointer select-none',
    variants: {
        variant: {
            default: 'bg-gray-50',
            dark: 'bg-gray-800 text-white',
            primary: 'bg-blue-500 text-white',
        },
        sticky: {
            true: 'sticky top-0 z-10',
            false: '',
        },
    },
    defaultVariants: {
        variant: 'default',
        sticky: false,
    },
});

const cellVariants = tv({
    base: 'px-4 py-2 border-b border-gray-100',
    variants: {
        variant: {
            default: '',
            striped: 'even:bg-gray-50',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

interface ColumnDefinition<T> {
    key: keyof T;
    label: string;
    allowsSorting?: boolean;
    width?: number;
    align?: 'left' | 'center' | 'right';
    type?: 'string' | 'number' | 'date';
}

interface TanStackTableProps<T extends Record<string, unknown>> {
    data: T[];
    columns: ColumnDefinition<T>[];
    variant?: 'default' | 'bordered' | 'striped';
    size?: 'sm' | 'md' | 'lg';
    headerVariant?: 'default' | 'dark' | 'primary';
    cellVariant?: 'default' | 'striped';
    stickyHeader?: boolean;
    height?: number;
    itemHeight?: number;
    overscan?: number;
    className?: string;
    'data-testid'?: string;
    'data-element-id'?: string; // 프리뷰 화면에서 선택을 위한 element ID
    onSortChange?: (sorting: SortingState) => void;
    onLoadMore?: () => void; // 무한 스크롤을 위한 콜백 추가
    hasMore?: boolean; // 더 많은 데이터가 있는지 여부
    isLoading?: boolean; // 로딩 상태
}

export function TanStackTable<T extends Record<string, unknown>>({
    data,
    columns,
    variant = 'default',
    size = 'md',
    headerVariant = 'default',
    cellVariant = 'default',
    stickyHeader = false,
    height = 400,
    itemHeight = 34,
    overscan = 20,
    className,
    'data-testid': testId,
    'data-element-id': elementId,
    onSortChange,
    onLoadMore,
    hasMore = true,
    isLoading = false,
}: TanStackTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    // 컬럼 정의 생성 (레퍼런스 코드 스타일)
    const tableColumns = useMemo<ColumnDef<T>[]>(() => {
        const cols: ColumnDef<T>[] = columns.map((col) => ({
            accessorKey: String(col.key),
            header: col.label,
            size: col.width || 150,
            cell: ({ getValue }) => {
                const value = getValue();
                return value;
            },
        }));

        return cols;
    }, [columns]);

    // 테이블 인스턴스 생성
    const table = useReactTable({
        data,
        columns: tableColumns,
        state: {
            sorting,
        },
        onSortingChange: (updater) => {
            const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
            setSorting(newSorting);
            onSortChange?.(newSorting);
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        debugTable: process.env.NODE_ENV === 'development',
    });

    const { rows } = table.getRowModel();

    // 가상화 설정
    const parentRef = React.useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemHeight,
        overscan,
    });

    // 무한 스크롤을 위한 스크롤 이벤트 감지
    React.useEffect(() => {
        const scrollElement = parentRef.current;
        if (!scrollElement || !onLoadMore || !hasMore || isLoading) return;

        let isLoadingMore = false; // 중복 로딩 방지

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollElement;

            // 스크롤이 하단에 가까우면 더 많은 데이터 로드
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

            if (isNearBottom && !isLoadingMore && hasMore && !isLoading) {
                isLoadingMore = true;
                console.log("🔄 TanStackTable 무한 스크롤 감지 - 더 많은 데이터 로드 시도");
                onLoadMore();

                // 비동기 작업이므로 setTimeout으로 로딩 상태 해제
                setTimeout(() => {
                    isLoadingMore = false;
                }, 1000);
            }
        };

        // 디바운싱된 스크롤 핸들러
        let timeoutId: NodeJS.Timeout;
        const debouncedHandleScroll = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleScroll, 100);
        };

        scrollElement.addEventListener('scroll', debouncedHandleScroll);
        return () => {
            scrollElement.removeEventListener('scroll', debouncedHandleScroll);
            clearTimeout(timeoutId);
        };
    }, [onLoadMore, hasMore, isLoading]);

    // 개발 모드에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
        console.log('🔍 TanStack Table 상태:', {
            totalRows: rows.length,
            virtualItems: virtualizer.getVirtualItems().length,
            totalSize: virtualizer.getTotalSize(),
            elementId,
            hasMore,
            isLoading
        });
    }

    return (
        <div
            ref={parentRef}
            className="container"
            style={{ height: `${height}px`, overflow: 'auto' }}
            data-testid={testId}
            data-element-id={elementId}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                }}
            >
                <table className={tableVariants({ variant, size, className })}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            className={headerVariants({
                                                variant: headerVariant,
                                                sticky: stickyHeader
                                            })}
                                            style={{
                                                width: header.getSize(),
                                                textAlign: columns.find(c => c.key === header.id)?.align || 'left'
                                            }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    {...{
                                                        className: header.column.getCanSort()
                                                            ? 'cursor-pointer select-none'
                                                            : '',
                                                        onClick: header.column.getToggleSortingHandler(),
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {{
                                                        asc: ' 🔼',
                                                        desc: ' 🔽',
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {virtualizer.getVirtualItems().map((virtualRow, index) => {
                            const row = rows[virtualRow.index];
                            return (
                                <tr
                                    key={row.id}
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start - index * virtualRow.size
                                            }px)`,
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={cellVariants({ variant: cellVariant })}
                                            style={{
                                                width: cell.column.getSize(),
                                                textAlign: columns.find(c => c.key === cell.column.id)?.align || 'left'
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* 로딩 인디케이터 */}
                {isLoading && (
                    <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 text-center border-t">
                        <div className="inline-flex items-center text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            더 많은 데이터 로딩 중...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TanStackTable;
