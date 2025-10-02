// src/builder/components/Table.tsx
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type Row as TableRow,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { apiConfig } from '../../services/api';

import { ChevronDown, ChevronUp } from 'lucide-react';

export type PaginationMode = 'pagination' | 'infinite';

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  elementId?: string; // Column Element ID for selection
  allowsSorting?: boolean;
  enableResizing?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ColumnGroupDefinition {
  id: string;
  label: string;
  span: number;
  order_num?: number; // order_num 추가
  align?: 'left' | 'center' | 'right';
  variant?: 'default' | 'primary' | 'secondary';
  sticky?: boolean;
}

export interface TableProps<T extends { id: string | number }> {
  className?: string;
  'data-element-id'?: string;
  tableHeaderElementId?: string; // TableHeader Element ID for selection

  // 데이터 소스: 정적 or 비동기
  data?: T[];                 // 정적 데이터면 API 호출 안 함
  apiUrlKey?: string;         // apiConfig 키 (예: "demo")
  endpointPath?: string;      // 엔드포인트 (예: "/users")
  enableAsyncLoading?: boolean; // true일 때만 API 사용

  // 컬럼
  columns: ColumnDefinition<T>[];
  columnGroups?: ColumnGroupDefinition[]; // Column Groups 추가

  // 표 옵션
  paginationMode?: PaginationMode; // 'pagination' | 'infinite'
  itemsPerPage?: number;           // default: 50
  height?: number;                 // 뷰포트 높이, default: 400
  rowHeight?: number;              // 추정 행 높이, default: 40
  overscan?: number;               // default: 12

  // 정렬 초기값
  sortColumn?: keyof T | string;
  sortDirection?: 'ascending' | 'descending';

  // 기능
  enableResize?: boolean;          // default: true
}

export default function Table<T extends { id: string | number }>(props: TableProps<T>) {
  const {
    className,
    tableHeaderElementId,

    data: staticData,
    apiUrlKey,
    endpointPath,
    enableAsyncLoading = false,

    columns,
    columnGroups = [],
    paginationMode = 'pagination',
    itemsPerPage = 500,
    height = 400,
    rowHeight = 38,
    overscan = 10,

    sortColumn,
    sortDirection = 'ascending',

    enableResize = true,
  } = props;

  const mode: PaginationMode = paginationMode || 'pagination';
  const isAsync = enableAsyncLoading && !staticData && apiUrlKey && endpointPath;

  // ---------- 정렬 ----------
  const initialSorting: SortingState = React.useMemo(() => {
    // sortColumn이 없거나 빈 문자열이면 정렬하지 않음
    if (!sortColumn || sortColumn === '') return [];
    return [{ id: String(sortColumn), desc: sortDirection === 'descending' }];
  }, [sortColumn, sortDirection]);
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);

  // ---------- Column Definitions with Groups ----------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columnDefsWithGroups = React.useMemo<any[]>(() => {
    console.log('🔍 Column Groups received:', columnGroups);

    // Column Helper 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columnHelper = createColumnHelper<any>();

    if (columnGroups.length === 0) {
      // Column Group이 없으면 기본 컬럼 정의 반환
      const basicColumns = columns.map((c) =>
        columnHelper.accessor(String(c.key), {
          id: String(c.key),
          header: () => <span style={{
            fontWeight: '500',
            fontSize: '13px',
            color: '#374151',
          }}>{c.label}</span>,
          size: c.width ?? 150,
          minSize: c.minWidth,
          maxSize: c.maxWidth,
          enableSorting: c.allowsSorting ?? true,
          enableResizing: c.enableResizing ?? true,
          cell: (info: { getValue: () => unknown }) => info.getValue() as React.ReactNode,
        })
      );
      console.log('🔍 Basic columns (no groups):', basicColumns);
      return basicColumns;
    }

    // Column Group이 있으면 span 개수만큼만 컬럼을 그룹으로 묶고, 나머지는 개별 컬럼으로 유지
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = [];
    let columnIndex = 0;

    // Column Group들을 order_num 순서대로 정렬
    const sortedGroups = [...columnGroups].sort((a, b) => {
      // order_num이 있는 경우 order_num 기준으로 정렬
      if (a.order_num !== undefined && b.order_num !== undefined) {
        return a.order_num - b.order_num;
      }
      // order_num이 없는 경우 span 기준으로 정렬 (fallback)
      return a.span - b.span;
    });

    for (const group of sortedGroups) {
      // 그룹에 속할 컬럼들 선택 (span 범위만큼)
      const groupColumns = columns.slice(columnIndex, columnIndex + group.span);

      if (groupColumns.length > 0) {
        // 하위 컬럼들을 columnHelper.accessor()로 생성
        const subColumns = groupColumns.map((c) =>
          columnHelper.accessor(String(c.key), {
            id: String(c.key),
            header: () => <span style={{
              fontWeight: '500',
              fontSize: '13px',
              color: '#374151',
            }}>{c.label}</span>,
            size: c.width ?? 150,
            minSize: c.minWidth,
            maxSize: c.maxWidth,
            enableSorting: c.allowsSorting ?? true,
            enableResizing: c.enableResizing ?? true,
            cell: (info: { getValue: () => unknown }) => info.getValue() as React.ReactNode,
          })
        );

        // TanStack Table의 columnHelper.group()을 사용한 Column Group 생성
        const groupColumn = columnHelper.group({
          id: `group-${group.id}`,
          header: () => <span style={{
            fontWeight: '600',
            fontSize: '14px',
            color: group.variant === 'primary' ? '#ffffff' : '#374151',
            backgroundColor: group.variant === 'primary' ? '#3b82f6' :
              group.variant === 'secondary' ? '#6b7280' : '#f8fafc',
            padding: '8px 16px',
            borderRadius: '4px',
            textAlign: group.align || 'center',
          }}>{group.label}</span>,
          columns: subColumns,
          meta: {
            isGroupHeader: true,
            align: group.align || 'center',
            variant: group.variant || 'default',
            sticky: group.sticky || false,
            elementId: group.id, // Column Group의 elementId 추가
          }
        });

        result.push(groupColumn);
      }

      columnIndex += group.span;
    }

    // 남은 컬럼들을 개별 컬럼으로 추가 (Column Group이 아닌 컬럼들)
    if (columnIndex < columns.length) {
      const remainingColumns = columns.slice(columnIndex);
      for (const c of remainingColumns) {
        result.push(
          columnHelper.accessor(String(c.key), {
            id: String(c.key),
            header: () => <span style={{
              fontWeight: '500',
              fontSize: '13px',
              color: '#374151',
            }}>{c.label}</span>,
            size: c.width ?? 150,
            minSize: c.minWidth,
            maxSize: c.maxWidth,
            enableSorting: c.allowsSorting ?? true,
            enableResizing: c.enableResizing ?? true,
            cell: (info: { getValue: () => unknown }) => info.getValue() as React.ReactNode,
          })
        );
      }
    }

    console.log('🔍 Final column definitions with groups:', result);
    return result;
  }, [columns, columnGroups]);

  // ---------- 비동기 상태 ----------
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [pageRows, setPageRows] = React.useState<T[]>([]);
  const [flatRows, setFlatRows] = React.useState<T[]>([]);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  // ---------- API 어댑터 (더미 배열 응답 기반) ----------
  const isFetchingRef = React.useRef(false);

  const fetchPage = React.useCallback(
    async (nextIndex: number, pageSize?: number) => {
      if (!isAsync || !apiUrlKey || !endpointPath) {
        return { items: [] as T[], total: 0 };
      }

      // 중복 호출 방지
      if (isFetchingRef.current) {
        console.log('⏸️ Fetch already in progress, skipping...');
        return { items: [] as T[], total: 0 };
      }

      const service = apiConfig[apiUrlKey as keyof typeof apiConfig] as (
        endpoint: string,
        params: Record<string, unknown>
      ) => Promise<T[]>;

      isFetchingRef.current = true;
      setLoading(true);

      try {
        const sort = sorting[0] ? { sortBy: sorting[0].id, desc: sorting[0].desc } : undefined;
        const limit = pageSize ?? itemsPerPage;
        const params = { page: nextIndex + 1, limit, ...sort };
        const res: T[] = await service!(endpointPath, params);
        const assumedTotal = 10000; // 데모 가정
        return { items: res, total: assumedTotal };
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [isAsync, apiUrlKey, endpointPath, itemsPerPage, sorting]
  );

  const fetchMore = React.useCallback(
    async (nextCursor?: string) => {
      if (!isAsync || !apiUrlKey || !endpointPath) {
        return { items: [] as T[], nextCursor: undefined as string | undefined };
      }

      // 중복 호출 방지
      if (isFetchingRef.current) {
        console.log('⏸️ Fetch already in progress, skipping...');
        return { items: [] as T[], nextCursor: undefined as string | undefined };
      }

      const service = apiConfig[apiUrlKey as keyof typeof apiConfig] as (
        endpoint: string,
        params: Record<string, unknown>
      ) => Promise<T[]>;

      isFetchingRef.current = true;
      setLoading(true);

      try {
        const page = nextCursor ? parseInt(nextCursor, 10) : 1;
        const sort = sorting[0] ? { sortBy: sorting[0].id, desc: sorting[0].desc } : undefined;
        const res: T[] = await service!(endpointPath, { page, limit: itemsPerPage, ...sort });
        if (!res || res.length === 0) {
          return { items: [], nextCursor: undefined };
        }
        const next = res.length === itemsPerPage ? String(page + 1) : undefined;
        return { items: res, nextCursor: next };
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [isAsync, apiUrlKey, endpointPath, itemsPerPage, sorting]
  );

  // ---------- 초기/리로드 ----------
  const containerRef = React.useRef<HTMLDivElement>(null);
  const initialLoadRef = React.useRef(false);

  React.useEffect(() => {
    if (!isAsync) return;

    // 초기 로드 중복 방지 (React Strict Mode 대응)
    if (initialLoadRef.current) {
      console.log('⏸️ Initial load already completed, skipping duplicate effect');
      return;
    }

    initialLoadRef.current = true;

    if (mode === 'pagination') {
      (async () => {
        console.log('📥 Initial pagination load: page 0');
        const { items, total } = await fetchPage(0);
        setPageRows(items);
        setPageIndex(0);
        setPageCount(Math.max(1, Math.ceil((total || 0) / itemsPerPage)));
      })();
    } else {
      (async () => {
        console.log('📥 Initial infinite scroll load: page 1');
        setFlatRows([]);
        setCursor(undefined);
        setHasNext(true);
        const { items, nextCursor } = await fetchMore('1');
        setFlatRows(items);
        setCursor(nextCursor);
        setHasNext(Boolean(nextCursor));

        // 초기 화면이 안 찼으면 한 번 더 (약간의 지연 후)
        if (containerRef.current && nextCursor) {
          setTimeout(() => {
            if (!containerRef.current) return;
            const el = containerRef.current;
            if (el.scrollHeight <= el.clientHeight + 10) {
              console.log('📥 Loading more to fill viewport: page 2');
              fetchMore(nextCursor).then(r => {
                setFlatRows(prev => [...prev, ...r.items]);
                setCursor(r.nextCursor);
                setHasNext(Boolean(r.nextCursor));
              });
            }
          }, 100);
        }
      })();
    }

    // cleanup: 다음 effect 실행 전 초기화
    return () => {
      initialLoadRef.current = false;
    };
  }, [isAsync, mode, itemsPerPage, fetchPage, fetchMore]);

  // ---------- 데이터 결정 ----------
  const data: T[] = React.useMemo(() => {
    if (staticData) {
      if (sorting.length === 0) return staticData;
      const s = sorting[0];
      const key = s?.id as keyof T;
      const sorted = [...staticData].sort((a, b) => {
        const av = a[key] as string | number;
        const bv = b[key] as string | number;
        if (av == null && bv == null) return 0;
        if (av == null) return -1;
        if (bv == null) return 1;
        if ((av as number | string) < (bv as number | string)) return s.desc ? 1 : -1;
        if ((av as number | string) > (bv as number | string)) return s.desc ? -1 : 1;
        return 0;
      });
      return sorted;
    }
    return mode === 'pagination' ? pageRows : flatRows;
  }, [staticData, sorting, mode, pageRows, flatRows]);

  // ---------- React Table ----------
  const table = useReactTable({
    data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columnDefsWithGroups as any,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: enableResize,
    columnResizeMode: 'onChange',
    debugTable: process.env.NODE_ENV === 'development',
    // ✅ 항상 클라이언트 사이드 정렬 사용
    manualSorting: false,
  });

  // rowVirtualizer는 아래에서 필요하므로 먼저 선언
  const rows = table.getRowModel().rows;

  // ---------- 가상 스크롤 (useMemo로 최적화) ----------
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => containerRef.current,
    measureElement:
      typeof window !== 'undefined' &&
        navigator.userAgent.indexOf('Firefox') === -1
        ? (el) => el?.getBoundingClientRect().height
        : undefined,
    overscan: Math.max(overscan, 5),
  });

  // 레퍼런스와 동일: 정렬 시 최상단으로 스크롤
  // table 옵션에 onSortingChange 주입 (레퍼런스 패턴)
  // table.setOptions(prev => ({
  //   ...prev,
  //   onSortingChange: handleSortingChange,
  // }));

  // ---------- 무한 스크롤 프리페치(onScroll 전용) ----------
  const onScrollFetch = React.useCallback((el?: HTMLDivElement | null) => {
    if (!isAsync || mode !== 'infinite') return;
    if (!el || !hasNext || loading) return; // loading 체크로 중복 방지

    const { scrollHeight, scrollTop, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 500) {
      // 하단 500px 이내
      console.log('📥 Scroll triggered load');
      void (async () => {
        const next = cursor ?? '1';
        const { items, nextCursor } = await fetchMore(next);
        setFlatRows(prev => [...prev, ...items]);
        setCursor(nextCursor);
        setHasNext(Boolean(nextCursor));
      })();
    }
  }, [isAsync, mode, hasNext, cursor, loading, fetchMore]);

  // ---------- 렌더 ----------
  return (
    <>
      <div
        data-element-id={props['data-element-id']}
        className={['react-aria-Table', className].filter(Boolean).join(' ')}
        role="grid"
        aria-rowcount={rows.length}
        aria-colcount={table.getAllLeafColumns().length}
      >
        {/* 스크롤 컨테이너: onScroll에서만 프리페치 */}
        <div
          ref={containerRef}
          className="react-aria-TableVirtualizer"
          onScroll={(e) => onScrollFetch(e.currentTarget)}
          style={{
            height,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <table style={{ display: 'grid' }}>
            {/* 헤더(Sticky) */}
            <thead
              className="react-aria-TableHeader react-aria-Resizable"
              role="rowgroup"
              data-element-id={tableHeaderElementId}
              style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}
            >
              {table.getHeaderGroups().map((headerGroup, groupIndex) => {
                console.log(`🔍 Header Group ${groupIndex}:`, headerGroup);
                console.log(`🔍 Header Group headers count:`, headerGroup.headers.length);
                console.log(`🔍 Header Group headers:`, headerGroup.headers.map(h => ({
                  id: h.id,
                  columnId: h.column.id,
                  isGroupHeader: (h.column.columnDef.meta as Record<string, unknown>)?.isGroupHeader,
                  colSpan: h.colSpan,
                  header: h.column.columnDef.header
                })));

                // Column Group과 개별 컬럼을 분리
                const groupHeaders = headerGroup.headers.filter(header => {
                  const groupMeta = header.column.columnDef.meta as Record<string, unknown>;
                  return groupMeta?.isGroupHeader === true;
                });

                const individualHeaders = headerGroup.headers.filter(header => {
                  const groupMeta = header.column.columnDef.meta as Record<string, unknown>;
                  return groupMeta?.isGroupHeader !== true;
                });

                return (
                  <React.Fragment key={headerGroup.id}>
                    {/* Column Group 행 */}
                    {groupHeaders.length > 0 && (
                      <tr className="react-aria-Row column-group-row" role="row" style={{ display: 'flex', width: '100%' }}>
                        {groupHeaders.map((header, colIndex) => {
                          const groupMeta = header.column.columnDef.meta as Record<string, unknown>;
                          const groupAlign = (groupMeta?.align as string) || 'center';
                          const groupVariant = (groupMeta?.variant as string) || 'default';
                          const elementId = groupMeta?.elementId as string;

                          return (
                            <th
                              key={header.id}
                              className="react-aria-Column column-group-header"
                              role="columnheader"
                              data-element-id={elementId}
                              aria-colindex={colIndex + 1}
                              colSpan={header.colSpan}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: groupAlign === 'center' ? 'center' :
                                  groupAlign === 'right' ? 'flex-end' : 'flex-start',
                                textAlign: groupAlign as 'left' | 'center' | 'right',
                                width: header.getSize(),
                                minWidth: header.getSize(),
                                backgroundColor: groupVariant === 'primary' ? '#3b82f6' :
                                  groupVariant === 'secondary' ? '#6b7280' : '#f8fafc',
                                color: groupVariant !== 'default' ? '#ffffff' : '#374151',
                                fontWeight: '600',
                                borderBottom: '2px solid #e5e7eb',
                                borderRight: '1px solid #e5e7eb',
                                padding: '12px 16px',
                                fontSize: '14px',
                                lineHeight: '1.5',
                              }}
                            >
                              <div
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'inherit',
                                }}
                              >
                                <span style={{
                                  fontWeight: 'inherit',
                                  fontSize: 'inherit',
                                  lineHeight: 'inherit',
                                }}>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    )}

                    {/* 개별 컬럼 행 */}
                    {individualHeaders.length > 0 && (
                      <tr className="react-aria-Row individual-column-row" role="row" style={{ display: 'flex', width: '100%' }}>
                        {individualHeaders.map((header, colIndex) => {
                          const columnDef = columns.find(c => String(c.key) === header.column.id);
                          const align = columnDef?.align ?? 'left';
                          const isSorted = header.column.getIsSorted();
                          const elementId = columnDef?.elementId;

                          return (
                            <th
                              key={header.id}
                              className="react-aria-Column individual-column"
                              role="columnheader"
                              data-element-id={elementId}
                              aria-colindex={colIndex + 1}
                              aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none'}
                              colSpan={header.colSpan}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: align === 'center' ? 'center' :
                                  align === 'right' ? 'flex-end' : 'flex-start',
                                textAlign: align as 'left' | 'center' | 'right',
                                width: header.getSize(),
                                minWidth: header.getSize(),
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                fontWeight: '500',
                                borderBottom: '1px solid #e5e7eb',
                                borderRight: '1px solid #e5e7eb',
                                padding: '8px 16px',
                                fontSize: '13px',
                                lineHeight: '1.5',
                              }}
                            >
                              <div
                                className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-blue-600' : ''}`}
                                onClick={header.column.getToggleSortingHandler()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    header.column.toggleSorting();
                                  }
                                }}
                                tabIndex={0}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'inherit',
                                  gap: '8px',
                                }}
                              >
                                <span style={{
                                  fontWeight: 'inherit',
                                  fontSize: 'inherit',
                                  lineHeight: 'inherit',
                                }}>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ChevronUp size={16} style={{ color: '#3b82f6' }} />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ChevronDown size={16} style={{ color: '#3b82f6' }} />
                                ) : null}
                              </div>

                              {/* 리사이즈 핸들 */}
                              {enableResize && header.column.getCanResize() && (
                                <div
                                  role="separator"
                                  aria-orientation="vertical"
                                  aria-label="Resize column"
                                  onMouseDown={header.getResizeHandler()}
                                  onTouchStart={header.getResizeHandler()}
                                  className="react-aria-ColumnResizer"
                                />
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </thead>

            {/* 바디: 가상 높이 + 절대 위치 행 */}
            <tbody
              className="react-aria-TableBody"
              role="rowgroup"
              style={{
                display: 'grid',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const row = rows[virtualRow.index] as TableRow<T> | undefined;
                if (!row) return null;

                return (
                  <tr
                    key={row.id}
                    className="react-aria-Row"
                    role="row"
                    aria-rowindex={virtualRow.index + 1}
                    // dynamic height measure (Firefox 제외)
                    ref={(node) => rowVirtualizer.measureElement?.(node)}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                    }}
                    tabIndex={0}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const align =
                        columns.find(c => String(c.key) === cell.column.id)?.align ?? 'left';
                      return (
                        <td
                          key={cell.id}
                          className="react-aria-Cell"
                          role="gridcell"
                          aria-colindex={cellIndex + 1}
                          style={{ textAlign: align as 'left' | 'center' | 'right', width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 (grid 바깥) */}
      {isAsync && mode === 'pagination' && pageCount !== null && (
        <div className="react-aria-Pagination">
          {/* 페이지 크기 선택 */}
          <div className="react-aria-PageSizeSelector">
            <label htmlFor="page-size-select" className="react-aria-PageSizeLabel">
              Show:
            </label>
            <select
              id="page-size-select"
              value={itemsPerPage}
              onChange={async (e) => {
                const newPageSize = Number(e.target.value);
                const { items, total } = await fetchPage(0, newPageSize);
                setPageRows(items);
                setPageIndex(0);
                // itemsPerPage는 prop이므로 변경할 수 없음 - 부모 컴포넌트에서 관리해야 함
                setPageCount(Math.max(1, Math.ceil((total || 0) / newPageSize)));
              }}
              disabled={loading}
              className="react-aria-PageSizeSelect"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="react-aria-PageSizeText">entries</span>
          </div>

          {/* 페이지 네비게이션 */}
          <div className="react-aria-PageNavigation">
            <button
              onClick={async () => {
                const { items, total } = await fetchPage(0, itemsPerPage);
                setPageRows(items);
                setPageIndex(0);
                setPageCount(Math.max(1, Math.ceil((total || 0) / itemsPerPage)));
              }}
              disabled={pageIndex === 0 || loading}
              className="react-aria-PageButton"
              title="First page"
            >
              {'<<'}
            </button>

            <button
              onClick={async () => {
                const next = Math.max(0, pageIndex - 1);
                const { items } = await fetchPage(next, itemsPerPage);
                setPageRows(items);
                setPageIndex(next);
              }}
              disabled={pageIndex === 0 || loading}
              className="react-aria-PageButton"
              title="Previous page"
            >
              {'<'}
            </button>

            {/* 페이지 번호 표시 */}
            <div className="react-aria-PageNumbers">
              {(() => {
                const totalPages = pageCount;
                const currentPage = pageIndex + 1;
                const maxVisible = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                const endPage = Math.min(totalPages, startPage + maxVisible - 1);

                if (endPage - startPage < maxVisible - 1) {
                  startPage = Math.max(1, endPage - maxVisible + 1);
                }

                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={async () => {
                        const targetPage = i - 1;
                        const { items } = await fetchPage(targetPage, itemsPerPage);
                        setPageRows(items);
                        setPageIndex(targetPage);
                      }}
                      disabled={loading}
                      className={`react-aria-PageButton ${i === currentPage ? 'active' : ''}`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
            </div>

            <button
              onClick={async () => {
                const next = Math.min((pageCount ?? 1) - 1, pageIndex + 1);
                const { items } = await fetchPage(next, itemsPerPage);
                setPageRows(items);
                setPageIndex(next);
              }}
              disabled={pageCount === 0 || pageIndex >= (pageCount - 1) || loading}
              className="react-aria-PageButton"
              title="Next page"
            >
              {'>'}
            </button>

            <button
              onClick={async () => {
                const next = (pageCount ?? 1) - 1;
                const { items } = await fetchPage(next, itemsPerPage);
                setPageRows(items);
                setPageIndex(next);
              }}
              disabled={pageCount === 0 || pageIndex >= (pageCount - 1) || loading}
              className="react-aria-PageButton"
              title="Last page"
            >
              {'>>'}
            </button>
          </div>

          {/* Go to page */}
          <div className="react-aria-GoToPage">
            <label htmlFor="go-to-page-input" className="react-aria-GoToPageLabel">
              Go to:
            </label>
            <input
              id="go-to-page-input"
              type="number"
              min="1"
              max={pageCount}
              value={pageIndex + 1}
              onChange={(e) => {
                const targetPage = Math.max(1, Math.min(pageCount, Number(e.target.value)));
                setPageIndex(targetPage - 1);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const targetPage = Math.max(1, Math.min(pageCount, Number(e.currentTarget.value)));
                  const { items } = await fetchPage(targetPage - 1, itemsPerPage);
                  setPageRows(items);
                  setPageIndex(targetPage - 1);
                }
              }}
              disabled={loading}
              className="react-aria-GoToPageInput"
            />
            <button
              onClick={async () => {
                const targetPage = Math.max(1, Math.min(pageCount, pageIndex + 1));
                const { items } = await fetchPage(targetPage - 1, itemsPerPage);
                setPageRows(items);
                setPageIndex(targetPage - 1);
              }}
              disabled={loading}
              className="react-aria-GoToPageButton"
            >
              Go
            </button>
          </div>

          {/* 페이지 정보 */}
          <div className="react-aria-PageInfo">
            Showing {pageIndex * itemsPerPage + 1} to {Math.min((pageIndex + 1) * itemsPerPage, pageRows.length + pageIndex * itemsPerPage)} of {pageCount * itemsPerPage} entries
          </div>

          {loading && <span className="react-aria-LoadingText">Loading…</span>}
        </div>
      )}
    </>
  );
}
