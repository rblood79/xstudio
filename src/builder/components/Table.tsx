// src/builder/components/Table.tsx
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Row as TableRow,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { apiConfig } from '../../services/api';

import { ChevronDown, ChevronUp } from 'lucide-react';

export type PaginationMode = 'pagination' | 'infinite';

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  allowsSorting?: boolean;
  enableResizing?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T extends { id: string | number }> {
  className?: string;
  'data-element-id'?: string;

  // 데이터 소스: 정적 or 비동기
  data?: T[];                 // 정적 데이터면 API 호출 안 함
  apiUrlKey?: string;         // apiConfig 키 (예: "demo")
  endpointPath?: string;      // 엔드포인트 (예: "/users")
  enableAsyncLoading?: boolean; // true일 때만 API 사용

  // 컬럼
  columns: ColumnDefinition<T>[];

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

    data: staticData,
    apiUrlKey,
    endpointPath,
    enableAsyncLoading = false,

    columns,
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

  // ---------- ColumnDef ----------
  const columnDefs = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    return columns.map((c) => ({
      id: String(c.key),
      accessorKey: String(c.key),
      header: c.label,
      size: c.width ?? 150,
      minSize: c.minWidth,
      maxSize: c.maxWidth,
      enableSorting: c.allowsSorting ?? true,
      enableResizing: c.enableResizing ?? true,
      cell: (info) => info.getValue() as React.ReactNode,
    }));
  }, [columns]);

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
    async (nextIndex: number) => {
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
        const params = { page: nextIndex + 1, limit: itemsPerPage, ...sort };
        const res: T[] = await service!(endpointPath, params);
        const assumedTotal = 1000; // 데모 가정
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
  }, [isAsync, mode, itemsPerPage]);

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
    columns: columnDefs,
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
              style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}
            >
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="react-aria-Row" role="row" style={{ display: 'flex', width: '100%' }}>
                  {headerGroup.headers.map((header, colIndex) => {
                    const align =
                      columns.find(c => String(c.key) === header.column.id)?.align ?? 'left';
                    const isSorted = header.column.getIsSorted(); // 'asc' | 'desc' | false
                    return (
                      <th
                        key={header.id}
                        className="react-aria-Column"
                        role="columnheader"
                        aria-colindex={colIndex + 1}
                        aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none'}
                        style={{ display: 'flex', textAlign: align as 'left' | 'center' | 'right', width: header.getSize() }}
                      >
                        <div
                          className={header.column.getCanSort() ? 'cursor-pointer select-none' : undefined}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              // KeyboardEvent를 MouseEvent로 변환하지 말고 직접 정렬 토글
                              header.column.toggleSorting();
                            }
                          }}
                          tabIndex={0}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? <ChevronUp size={21} /> : header.column.getIsSorted() === 'desc' ? <ChevronDown size={21} /> : null}
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
              ))}
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
          <button
            onClick={async () => {
              const { items, total } = await fetchPage(0);
              setPageRows(items);
              setPageIndex(0);
              setPageCount(Math.max(1, Math.ceil((total || 0) / itemsPerPage)));
            }}
            disabled={pageIndex === 0 || loading}
            className="react-aria-PageButton"
          >
            {'<<'}
          </button>

          <button
            onClick={async () => {
              const next = Math.max(0, pageIndex - 1);
              const { items } = await fetchPage(next);
              setPageRows(items);
              setPageIndex(next);
            }}
            disabled={pageIndex === 0 || loading}
            className="react-aria-PageButton"
          >
            {'<'}
          </button>

          <span className="react-aria-PageInfo">Page {pageIndex + 1} / {pageCount}</span>

          <button
            onClick={async () => {
              const next = Math.min((pageCount ?? 1) - 1, pageIndex + 1);
              const { items } = await fetchPage(next);
              setPageRows(items);
              setPageIndex(next);
            }}
            disabled={pageCount === 0 || pageIndex >= (pageCount - 1) || loading}
            className="react-aria-PageButton"
          >
            {'>'}
          </button>

          <button
            onClick={async () => {
              const next = (pageCount ?? 1) - 1;
              const { items } = await fetchPage(next);
              setPageRows(items);
              setPageIndex(next);
            }}
            disabled={pageCount === 0 || pageIndex >= (pageCount - 1) || loading}
            className="react-aria-PageButton"
          >
            {'>>'}
          </button>

          {loading && <span className="react-aria-LoadingText">Loading…</span>}
        </div>
      )}
    </>
  );
}
