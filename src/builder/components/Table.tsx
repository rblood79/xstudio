// src/builder/components/Table.tsx
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { apiConfig } from '../../services/api'; // ← 더미 apiConfig.demo 사용 (배열 반환)

export type PaginationMode = 'pagination' | 'infinite-scroll';

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  allowsSorting?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T extends { id: string | number }> {
  className?: string;

  // 데이터 소스: 정적 or 비동기
  data?: T[];                 // 정적 데이터가 들어오면 API는 호출하지 않음
  apiUrlKey?: string;         // apiConfig 키 (예: "demo")
  endpointPath?: string;      // 엔드포인트 (예: "/users")
  enableAsyncLoading?: boolean; // true일 때만 API 사용

  // 컬럼
  columns: ColumnDefinition<T>[];

  // 표 옵션
  paginationMode?: PaginationMode; // 'pagination' | 'infinite-scroll' (default: 'pagination')
  itemsPerPage?: number;           // default: 50
  height?: number;                 // default: 400
  rowHeight?: number;              // default: 40
  overscan?: number;               // default: 10

  // 정렬 초기값
  sortColumn?: keyof T | string;
  sortDirection?: 'ascending' | 'descending';

  // 기능
  enableResize?: boolean;          // default: true
}

/**
 * 단일 Table 컴포넌트
 * - TanStack Table + Virtualizer
 * - react-aria-components 호환 role/class 유지
 * - 정적/비동기, 페이지네이션/무한스크롤 모두 지원
 */
export default function Table<T extends { id: string | number }>(props: TableProps<T>) {
  const {
    className,

    data: staticData,
    apiUrlKey,
    endpointPath,
    enableAsyncLoading = false,

    columns,
    paginationMode = 'pagination',
    itemsPerPage = 50,
    height = 400,
    rowHeight = 40,
    overscan = 10,

    sortColumn,
    sortDirection = 'ascending',

    enableResize = true,
  } = props;

  const mode: 'pagination' | 'infinite' =
    paginationMode === 'infinite-scroll' ? 'infinite' : 'pagination';
  const isAsync = enableAsyncLoading && !staticData && apiUrlKey && endpointPath;

  console.log('🔍 Table API 설정:', {
    enableAsyncLoading,
    staticData: !!staticData,
    apiUrlKey,
    endpointPath,
    isAsync
  });

  // ----- 정렬 상태 -----
  const initialSorting: SortingState = React.useMemo(() => {
    if (!sortColumn) return [];
    return [{ id: String(sortColumn), desc: sortDirection === 'descending' }];
  }, [sortColumn, sortDirection]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);

  // ----- ColumnDef 변환 -----
  const columnDefs = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    return columns.map((c) => ({
      id: String(c.key), // id 필드 추가
      accessorKey: String(c.key),
      header: c.label,
      size: c.width ?? 150,
      minSize: c.minWidth,
      maxSize: c.maxWidth,
      enableSorting: c.allowsSorting ?? true,
      cell: (info) => info.getValue() as React.ReactNode,
    }));
  }, [columns]);

  // ----- 비동기 상태 -----
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [pageRows, setPageRows] = React.useState<T[]>([]);
  const [flatRows, setFlatRows] = React.useState<T[]>([]);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  // ----- API 어댑터 (더미 배열 응답 기반) -----
  // 주의: apiConfig[apiUrlKey](endpoint, { page, limit })는 배열을 반환해야 함
  const fetchPage = React.useCallback(
    async (nextIndex: number) => {
      console.log('🔍 fetchPage 호출:', { isAsync, apiUrlKey, endpointPath, nextIndex });
      if (!isAsync || !apiUrlKey || !endpointPath) {
        console.log('❌ API 호출 조건 불만족');
        return { items: [] as T[], total: 0 };
      }
      const service = apiConfig[apiUrlKey as keyof typeof apiConfig] as (endpoint: string, params: Record<string, unknown>) => Promise<T[]>;
      console.log('🔍 API 서비스 호출:', { service: !!service, endpointPath });
      setLoading(true);
      try {
        const sort = sorting[0] ? { sortBy: sorting[0].id, desc: sorting[0].desc } : undefined;
        const params = {
          page: nextIndex + 1,
          limit: itemsPerPage,
          ...sort,
        };
        console.log('🔍 API 파라미터:', params);
        const res: T[] = await service!(endpointPath, params);
        console.log('✅ API 응답:', { count: res.length, firstItem: res[0] });
        // total이 없으므로 데모 총량 가정(필요시 api/프론트 모두 수정)
        const assumedTotal = 1000;
        return { items: res, total: assumedTotal };
      } finally {
        setLoading(false);
      }
    },
    [isAsync, apiUrlKey, endpointPath, itemsPerPage, sorting]
  );

  const fetchMore = React.useCallback(
    async (nextCursor?: string) => {
      if (!isAsync || !apiUrlKey || !endpointPath) return { items: [] as T[], nextCursor: undefined as string | undefined };
      const service = apiConfig[apiUrlKey as keyof typeof apiConfig] as (endpoint: string, params: Record<string, unknown>) => Promise<T[]>;
      setLoading(true);
      try {
        const page = nextCursor ? parseInt(nextCursor, 10) : 1;
        const sort = sorting[0] ? { sortBy: sorting[0].id, desc: sorting[0].desc } : undefined;
        const res: T[] = await service!(endpointPath, {
          page,
          limit: itemsPerPage,
          ...sort,
        });
        // 다음 커서 계산(데모: 더 가져올 게 있으면 page+1)
        const next = res.length === itemsPerPage ? String(page + 1) : undefined;
        return { items: res, nextCursor: next };
      } finally {
        setLoading(false);
      }
    },
    [isAsync, apiUrlKey, endpointPath, itemsPerPage, sorting]
  );

  // ----- 초기/리로드 -----
  React.useEffect(() => {
    if (!isAsync) return;
    if (mode === 'pagination') {
      (async () => {
        const { items, total } = await fetchPage(0);
        setPageRows(items);
        setPageIndex(0);
        setPageCount(Math.max(1, Math.ceil((total || 0) / itemsPerPage)));
      })();
    } else {
      (async () => {
        setFlatRows([]);
        setCursor(undefined);
        setHasNext(true);
        const { items, nextCursor } = await fetchMore('1');
        setFlatRows(items);
        setCursor(nextCursor);
        setHasNext(Boolean(nextCursor));
      })();
    }
  }, [isAsync, mode, itemsPerPage, sorting, fetchPage, fetchMore]);

  // ----- 테이블 데이터 결정 -----
  const data: T[] = React.useMemo(() => {
    if (staticData) {
      if (sorting.length === 0) return staticData;
      const s = sorting[0];
      const key = s?.id as keyof T;
      const sorted = [...staticData].sort((a, b) => {
        const av = a[key] as unknown;
        const bv = b[key] as unknown;
        if (av == null && bv == null) return 0;
        if (av == null) return -1;
        if (bv == null) return 1;
        if (av < bv) return s.desc ? 1 : -1;
        if (av > bv) return s.desc ? -1 : 1;
        return 0;
      });
      return sorted;
    }
    return mode === 'pagination' ? pageRows : flatRows;
  }, [staticData, sorting, mode, pageRows, flatRows]);

  // ----- TanStack Table -----
  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // 헤더 정렬표시 일관성
    enableColumnResizing: enableResize,
    columnResizeMode: 'onChange', // 드래그 중 실시간 반영
    debugTable: process.env.NODE_ENV === 'development',
  });

  const rows = table.getRowModel().rows;

  // ----- 가상 스크롤 -----
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length + (isAsync && mode === 'infinite' && hasNext ? 1 : 0), // 로딩 행 1개
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // 무한 스크롤 트리거
  const virtualItems = rowVirtualizer.getVirtualItems();
  React.useEffect(() => {
    if (!isAsync || mode !== 'infinite' || !hasNext || loading) return;
    if (!virtualItems.length) return;
    const last = virtualItems[virtualItems.length - 1];
    if (last.index >= rows.length - 5) {
      (async () => {
        const { items, nextCursor } = await fetchMore(cursor ?? '1');
        setFlatRows((prev) => [...prev, ...items]);
        setCursor(nextCursor);
        setHasNext(Boolean(nextCursor));
      })();
    }
  }, [isAsync, mode, hasNext, rows.length, virtualItems, fetchMore, cursor, loading]);

  // ----- 렌더 -----
  return (
    <div
      data-element-id={props['data-element-id']}
      className={['react-aria-Table border rounded overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      role="table"
      aria-rowcount={rows.length}
    >
      {/* 헤더 */}
      <div className="react-aria-TableHeader sticky top-0 z-10" role="rowgroup">
        <div className="react-aria-Row flex border-b bg-gray-50" role="row">
          {table.getFlatHeaders().map((h, colIndex) => {
            const align = columns.find(c => String(c.key) === h.column.id)?.align ?? 'left';
            const isSorted = h.column.getIsSorted(); // 'asc' | 'desc' | false
            return (
              <div
                key={h.id}
                role="columnheader"
                aria-colindex={colIndex + 1}
                aria-sort={
                  isSorted === 'asc'
                    ? 'ascending'
                    : isSorted === 'desc'
                      ? 'descending'
                      : 'none'
                }
                className="react-aria-Column relative px-2 py-1 select-none cursor-pointer hover:bg-gray-100"
                style={{ width: h.getSize(), textAlign: align as 'left' | 'center' | 'right' }}
                onClick={h.column.getToggleSortingHandler()}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    h.column.getToggleSortingHandler()?.(e as unknown as React.MouseEvent);
                  }
                }}
              >
                {flexRender(h.column.columnDef.header, h.getContext())}
                {isSorted === 'asc' ? ' 🔼' : isSorted === 'desc' ? ' 🔽' : null}

                {/* 리사이즈 핸들 */}
                {enableResize && h.column.getCanResize() && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize column"
                    onMouseDown={h.getResizeHandler()}
                    onTouchStart={h.getResizeHandler()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-300"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 바디(가상 스크롤 컨테이너) */}
      <div ref={parentRef} style={{ height, overflow: 'auto', position: 'relative' }}>
        <div
          className="react-aria-TableBody"
          role="rowgroup"
          style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
        >
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index];

            // 로딩 더미 행 (무한 스크롤)
            if (!row) {
              return (
                <div
                  key={vi.key}
                  role="row"
                  aria-rowindex={rows.length + 1}
                  className="react-aria-Row flex items-center justify-center text-sm text-gray-500 border-b"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`, // 중요: vi.start만 사용
                    height: vi.size,
                  }}
                >
                  Loading…
                </div>
              );
            }

            return (
              <div
                key={vi.key}
                role="row"
                aria-rowindex={vi.index + 1}
                className="react-aria-Row hover:bg-gray-50"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`, // 오프셋 점프 방지
                  height: vi.size,
                  display: 'flex',
                  borderBottom: '1px solid #e5e7eb',
                  alignItems: 'stretch',
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  // 키보드 네비게이션 지원
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = Math.min(vi.index + 1, rows.length - 1);
                    const nextElement = parentRef.current?.querySelector(`[aria-rowindex="${nextIndex + 1}"]`) as HTMLElement;
                    nextElement?.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = Math.max(vi.index - 1, 0);
                    const prevElement = parentRef.current?.querySelector(`[aria-rowindex="${prevIndex + 1}"]`) as HTMLElement;
                    prevElement?.focus();
                  }
                }}
              >
                {row.getVisibleCells().map((cell, cellIndex) => {
                  const align = columns.find(c => String(c.key) === cell.column.id)?.align ?? 'left';
                  return (
                    <div
                      key={cell.id}
                      role="cell"
                      aria-colindex={cellIndex + 1}
                      className="react-aria-Cell px-2 py-1"
                      style={{ width: cell.column.getSize(), textAlign: align as 'left' | 'center' | 'right' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 페이지네이션 (정적 데이터엔 표시 의미 없음) */}
      {isAsync && mode === 'pagination' && pageCount !== null && (
        <div className="flex items-center gap-2 p-2 border-t">
          <button
            onClick={async () => {
              const { items, total } = await fetchPage(0);
              setPageRows(items);
              setPageIndex(0);
              setPageCount(Math.max(1, Math.ceil((total || 0) / itemsPerPage)));
            }}
            disabled={pageIndex === 0 || loading}
            className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'<'}
          </button>

          <span>Page {pageIndex + 1} / {pageCount}</span>

          <button
            onClick={async () => {
              const next = Math.min((pageCount ?? 1) - 1, pageIndex + 1);
              const { items } = await fetchPage(next);
              setPageRows(items);
              setPageIndex(next);
            }}
            disabled={pageCount === 0 || pageIndex >= (pageCount - 1) || loading}
            className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'>>'}
          </button>

          {loading && <span className="text-sm text-gray-500 ml-2">Loading…</span>}
        </div>
      )}
    </div>
  );
}
