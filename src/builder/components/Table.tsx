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
import { apiConfig } from '../../services/api'; // apiConfig.demo: (endpoint, {page,limit,...}) => Promise<T[]>

export type PaginationMode = 'pagination' | 'infinite';

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
  'data-element-id'?: string;

  // 데이터 소스: 정적 or 비동기
  data?: T[];                 // 정적 데이터가 들어오면 API는 호출하지 않음
  apiUrlKey?: string;         // apiConfig 키 (예: "demo")
  endpointPath?: string;      // 엔드포인트 (예: "/users")
  enableAsyncLoading?: boolean; // true일 때만 API 사용

  // 컬럼
  columns: ColumnDefinition<T>[];

  // 표 옵션
  paginationMode?: PaginationMode; // 'pagination' | 'infinite' (default: 'pagination')
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

  const mode: 'pagination' | 'infinite' = paginationMode || 'pagination';
  const isAsync = enableAsyncLoading && !staticData && apiUrlKey && endpointPath;

  // ----- 정렬 상태 -----
  const initialSorting: SortingState = React.useMemo(() => {
    if (!sortColumn) return [];
    return [{ id: String(sortColumn), desc: sortDirection === 'descending' }];
  }, [sortColumn, sortDirection]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);

  // ----- ColumnDef 변환 -----
  const columnDefs = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    return columns.map((c) => ({
      id: String(c.key),
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
  const fetchPage = React.useCallback(
    async (nextIndex: number) => {
      if (!isAsync || !apiUrlKey || !endpointPath) {
        return { items: [] as T[], total: 0 };
      }
      const service = apiConfig[apiUrlKey as keyof typeof apiConfig] as (
        endpoint: string,
        params: Record<string, unknown>
      ) => Promise<T[]>;
      setLoading(true);
      try {
        const sort = sorting[0] ? { sortBy: sorting[0].id, desc: sorting[0].desc } : undefined;
        const params = { page: nextIndex + 1, limit: itemsPerPage, ...sort };
        const res: T[] = await service!(endpointPath, params);
        // total 미제공이므로 데모 총량 가정(필요 시 API/프론트 함께 수정)
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
      if (!isAsync || !apiUrlKey || !endpointPath) {
        return { items: [] as T[], nextCursor: undefined as string | undefined };
      }
      const service = apiConfig[apiUrlKey as keyof typeof apiConfig] as (
        endpoint: string,
        params: Record<string, unknown>
      ) => Promise<T[]>;
      setLoading(true);
      try {
        const page = nextCursor ? parseInt(nextCursor, 10) : 1;
        const sort = sorting[0] ? { sortBy: sorting[0].id, desc: sorting[0].desc } : undefined;
        const res: T[] = await service!(endpointPath, { page, limit: itemsPerPage, ...sort });

        // 빈 응답이면 다음 커서 없음
        if (!res || res.length === 0) {
          return { items: [], nextCursor: undefined };
        }

        // 다음 커서 계산(정확 total이 없으니 '딱 pageSize'일 때만 더 있다고 가정)
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
        // 초기 로딩 직후에도 화면을 못 채우면 한 번 더
        const el = parentRef.current;
        if (el && el.scrollHeight <= el.clientHeight + 10 && nextCursor) {
          const r = await fetchMore(nextCursor);
          setFlatRows(prev => [...prev, ...r.items]);
          setCursor(r.nextCursor);
          setHasNext(Boolean(r.nextCursor));
        }
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
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: enableResize,
    columnResizeMode: 'onChange',
    debugTable: process.env.NODE_ENV === 'development',
  });

  const rows = table.getRowModel().rows;

  // ----- 가상 스크롤 -----
  const parentRef = React.useRef<HTMLDivElement>(null);

  // 로딩 행은 실제 로딩 중일 때만 1개 추가
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const rowVirtualizer = useVirtualizer({
    count:
      rows.length +
      (isAsync && mode === 'infinite' && hasNext && (isLoadingMore || loading) ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: Math.max(overscan, 5),
    measureElement: undefined,
  });

  // 무한 스크롤 트리거 (스크롤 위치 기반 + 디바운싱 + 중복 커서 방지)
  const loadMoreTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastRequestedCursorRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isAsync || mode !== 'infinite') return;
    const el = parentRef.current;
    if (!el) return;

    const THRESHOLD = 200; // 하단 200px 이내면 로드
    const onScroll = () => {
      if (!hasNext || isLoadingMore || loading) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - THRESHOLD;
      if (!nearBottom) return;

      // 디바운스
      if (loadMoreTimeoutRef.current) clearTimeout(loadMoreTimeoutRef.current);
      loadMoreTimeoutRef.current = setTimeout(async () => {
        const next = cursor ?? '1';

        // 같은 커서로 중복 요청 방지
        if (lastRequestedCursorRef.current === next) return;
        lastRequestedCursorRef.current = next;

        setIsLoadingMore(true);
        try {
          const prevLen = flatRows.length;
          const currentScrollTop = el.scrollTop;

          const { items, nextCursor } = await fetchMore(next);

          setFlatRows(prev => [...prev, ...items]);
          setCursor(nextCursor);
          setHasNext(Boolean(nextCursor));

          if (!nextCursor && items.length === 0) {
            setHasNext(false);
          }

          // 점프 방지
          requestAnimationFrame(() => {
            el.scrollTop = currentScrollTop;
          });

          // 길이가 그대로이고 nextCursor도 없거나 동일하면 더 이상 시도 X
          if (flatRows.length === prevLen && (!nextCursor || nextCursor === next)) {
            setHasNext(false);
          }
        } finally {
          setIsLoadingMore(false);
        }
      }, 80);
    };

    // 처음에도 체크 (이미 바닥이면 즉시 한 번 로드)
    onScroll();

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (loadMoreTimeoutRef.current) clearTimeout(loadMoreTimeoutRef.current);
    };
  }, [isAsync, mode, hasNext, loading, cursor, flatRows.length, fetchMore]);

  // ----- 렌더 -----
  return (
    <>
      <div
        data-element-id={props['data-element-id']}
        className={['react-aria-Table border rounded overflow-hidden', className]
          .filter(Boolean)
          .join(' ')}
        role="grid"
        aria-rowcount={rows.length}
        aria-colcount={table.getAllLeafColumns().length}
      >
        {/* 헤더 */}
        <div className="react-aria-TableHeader" role="rowgroup">
          <div className="react-aria-Row" role="row" aria-rowindex={1}>
            {table.getFlatHeaders().map((h, colIndex) => {
              const align =
                columns.find(c => String(c.key) === h.column.id)?.align ?? 'left';
              const isSorted = h.column.getIsSorted(); // 'asc' | 'desc' | false
              return (
                <div
                  key={h.id}
                  role="columnheader" // ✅ 헤더 역할
                  aria-colindex={colIndex + 1}
                  aria-sort={
                    isSorted === 'asc'
                      ? 'ascending'
                      : isSorted === 'desc'
                        ? 'descending'
                        : 'none'
                  } // ✅ 정렬 상태 제공
                  className="react-aria-Column"
                  style={{
                    width: h.getSize(),
                    textAlign: align as 'left' | 'center' | 'right',
                  }}
                  onClick={h.column.getToggleSortingHandler()}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      h.column.getToggleSortingHandler()?.(
                        e as unknown as React.MouseEvent
                      );
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
        <div ref={parentRef} style={{ height, overflow: 'auto', position: 'relative', overflowAnchor: 'none' as any }}>
          <div
            className="react-aria-TableBody"
            role="rowgroup"
            style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];

              // 로딩 더미 행 (무한 스크롤) - 로딩 중에만 표시
              if (!row && (isLoadingMore || loading)) {
                return (
                  <div
                    key={vi.key}
                    role="row"
                    aria-rowindex={rows.length + 1}
                    className="react-aria-Row"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vi.start}px)`,
                      height: vi.size,
                      transition: 'opacity 0.2s ease-in-out',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      Loading more data...
                    </div>
                  </div>
                );
              }

              if (!row) return null;

              return (
                <div
                  key={vi.key}
                  role="row"
                  aria-rowindex={vi.index + 1}
                  className="react-aria-Row"
                  style={{
                    transform: `translateY(${vi.start}px)`,
                    height: vi.size
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    // 키보드 네비게이션 지원
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextIndex = Math.min(vi.index + 1, rows.length - 1);
                      const nextElement = parentRef.current?.querySelector(
                        `[aria-rowindex="${nextIndex + 1}"]`
                      ) as HTMLElement;
                      nextElement?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevIndex = Math.max(vi.index - 1, 0);
                      const prevElement = parentRef.current?.querySelector(
                        `[aria-rowindex="${prevIndex + 1}"]`
                      ) as HTMLElement;
                      prevElement?.focus();
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const align =
                      columns.find(c => String(c.key) === cell.column.id)?.align ?? 'left';
                    return (
                      <div
                        key={cell.id}
                        role="gridcell"
                        aria-colindex={cellIndex + 1}
                        className="react-aria-Cell"
                        style={{
                          width: cell.column.getSize(),
                          textAlign: align as 'left' | 'center' | 'right',
                        }}
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
      </div>

      {/* ✅ 페이지네이션은 grid 바깥으로 이동 (axe 오류 방지) */}
      {isAsync && mode === 'pagination' && pageCount !== null && (
        <div className="flex items-center gap-2 p-2 border rounded mt-2">
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
    </>
  );
}
