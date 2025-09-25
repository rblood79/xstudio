import React from 'react';
import { useAsyncList } from 'react-stately';
import { Table as AriaTable, Row, Cell, TableHeader, TableBody, Column, ResizableTableContainer, SortDescriptor, Key, Collection, SortDirection } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef, useState, useMemo, useCallback, useEffect } from 'react';
import { SortIcon } from './SortIcon'; // SortIcon 임포트 경로 수정 (혹은 임시 로딩 컴포넌트 사용)
import { apiConfig } from '../../services/api'; // apiConfig 임포트
import { createDefaultTableProps, TableElementProps } from '../../types/unified'; // createDefaultTableProps 임포트
import { useStore } from '../stores'; // useStore 임포트
import { Pagination } from './Pagination';

const tableHeaderVariants = tv({
  base: 'bg-gray-50 border-b border-gray-200',
  variants: {
    variant: {
      default: '',
      dark: 'bg-gray-800 text-white',
      primary: 'bg-blue-500 text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const tableCellVariants = tv({
  base: 'px-4 py-2 border-b border-gray-200',
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

interface TableColumn<T> {
  key: keyof T;
  label: string;
  allowsSorting?: boolean;
  isRowHeader?: boolean;
}

interface TableProps<T extends Record<string, unknown>> {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'striped';
  size?: 'sm' | 'md' | 'lg';
  headerVariant?: 'default' | 'dark' | 'primary';
  cellVariant?: 'default' | 'striped';
  // 페이지네이션 모드
  paginationMode?: 'pagination' | 'infinite-scroll';
  // 가상화 관련 props
  height?: number;
  itemHeight?: number;
  overscan?: number;
  'data-testid'?: string;
  data?: T[]; // 정적 데이터 프로퍼티 추가
  columns?: TableColumn<T>[]; // 컬럼 정의 추가
  sortDescriptor?: SortDescriptor; // 정렬 상태 추가
  onSortChange?: (descriptor: SortDescriptor) => void; // 정렬 변경 핸들러 추가
  selectionMode?: 'none' | 'single' | 'multiple'; // 선택 모드 추가
  selectedKeys?: 'all' | Iterable<Key>; // 선택된 키 추가
  onSelectionChange?: (keys: 'all' | Set<Key>) => void; // 선택 변경 핸들러 추가
  // loadOptions?: AsyncListOptions<T, string>; // AsyncListOptions 대신 아래 prop들을 사용
  loadingState?: 'idle' | 'loading' | 'loadingMore' | 'error'; // 외부 로딩 상태
  enableAsyncLoading?: boolean; // 비동기 로딩 활성화 여부
  apiUrlKey?: string; // 전역 API URL 맵핑 키
  endpointPath?: string; // 엔드포인트 경로
  apiParams?: Record<string, unknown>; // API 호출 시 전달될 추가 파라미터
  dataMapping?: { resultPath?: string; idKey?: string }; // API 응답 데이터 매핑 정보
}

// TableLoadMoreItem 컴포넌트 (무한 스크롤 지원)
interface TableLoadMoreItemProps {
  onLoadMore?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}
function CustomTableLoadMoreItem({ onLoadMore, isLoading, children }: TableLoadMoreItemProps) {
  return (
    <Row>
      <Cell colSpan={99} className="text-center">
        {isLoading ? (
          children
        ) : (
          onLoadMore && <button onClick={onLoadMore} className="p-2 text-blue-500">더 보기</button>
        )}
      </Cell>
    </Row>
  );
}

export const Table = forwardRef(function Table<T extends Record<string, unknown>>(
  {
    children,
    className,
    variant = 'default',
    size = 'md',
    headerVariant = 'default',
    cellVariant = 'default',
    'data-testid': testId,
    data, // 정적 데이터
    columns = createDefaultTableProps().columns, // 컬럼 정의
    sortDescriptor: propSortDescriptor,
    onSortChange: propOnSortChange,
    selectionMode = 'none',
    selectedKeys: propSelectedKeys,
    onSelectionChange: propOnSelectionChange,
    // loadOptions, // 더 이상 직접 loadOptions를 받지 않음
    // loadingState 제거 - 직접 데이터 관리 사용
    enableAsyncLoading = createDefaultTableProps().enableAsyncLoading, // 기본값 설정
    apiUrlKey = createDefaultTableProps().apiUrlKey, // 기본값 설정
    endpointPath = createDefaultTableProps().endpointPath, // 기본값 설정
    // apiParams, dataMapping 제거 - 직접 데이터 관리 사용
    paginationMode = createDefaultTableProps().paginationMode, // 기본값 설정
    ...props
  }: TableProps<T>, ref: React.Ref<HTMLTableElement>) {

  // 빌더 환경에서 실제 element 찾기
  const elements = useStore(state => state.elements);
  const elementId = 'data-element-id' in props ? props['data-element-id'] as string : undefined;
  const actualElement = elements.find(el => el.id === elementId);

  // 실제 element props 읽기 (TableElementProps로 캐스팅)
  const actualElementProps = actualElement?.props || {};
  const actualPaginationMode = (actualElementProps as TableElementProps)?.paginationMode;

  // 실제 element에서 읽은 값을 우선시 (빌더 환경에서)
  const finalPaginationMode = actualPaginationMode || paginationMode || createDefaultTableProps().paginationMode;

  // enableAsyncLoading도 동일하게 처리
  const actualEnableAsyncLoading = (actualElementProps as TableElementProps)?.enableAsyncLoading;
  const finalEnableAsyncLoading = actualEnableAsyncLoading !== undefined ? actualEnableAsyncLoading : enableAsyncLoading;

  // itemsPerPage 값도 동일하게 처리
  const actualItemsPerPage = (actualElementProps as TableElementProps)?.itemsPerPage;
  const finalItemsPerPage = actualItemsPerPage !== undefined ? actualItemsPerPage : createDefaultTableProps().itemsPerPage;

  // 디버깅: paginationMode 값 확인
  console.log("🔍 Table 컴포넌트 paginationMode:", paginationMode);
  console.log("🔍 Table 컴포넌트 elementId:", elementId);
  console.log("🔍 Table 컴포넌트 actualElement found:", !!actualElement);
  console.log("🔍 Table 컴포넌트 actualPaginationMode:", actualPaginationMode);
  console.log("🔍 Table 컴포넌트 finalPaginationMode:", finalPaginationMode);
  console.log("🔍 Table 컴포넌트 actualElementProps:", actualElementProps);

  // sortDescriptor 초기값 설정 (propSortDescriptor가 없으면 기본값 사용)
  const defaultSortDescriptor: SortDescriptor = {
    column: 'id' as Key, // 유효한 Key 값으로 초기화
    direction: 'ascending' as SortDirection,
  };

  // API 호출을 위한 동적 load 함수 생성
  // 페이지네이션을 지원하는 load 함수
  const loadFunction = useCallback(async ({ cursor }: { signal: AbortSignal; cursor?: string }) => {
    console.log("🟢 loadFunction called with cursor:", cursor);

    if (!apiUrlKey || !endpointPath) {
      console.warn("API URL Key or Endpoint Path is not provided for async table loading.");
      return { items: [], cursor: undefined };
    }

    const fetchApiData = apiConfig[apiUrlKey];
    if (!fetchApiData || typeof fetchApiData !== 'function') {
      console.error(`API handler for key '${apiUrlKey}' not found or is not a function.`);
      return { items: [], cursor: undefined };
    }

    try {
      // 페이지네이션을 위한 파라미터 추가
      const params = {
        page: cursor ? parseInt(cursor) : 1,
        limit: finalItemsPerPage, // 설정된 페이지당 행 수만큼 로드
      };

      console.log("➡️ Loading page:", params.page, "limit:", params.limit);
      const json: T[] | Record<string, unknown> = await fetchApiData(endpointPath, params);
      console.log("⬅️ Received JSON data:", json);

      // 데이터 매핑 적용
      const resultItems = Array.isArray(json) ? json : [];

      const mappedItems = resultItems.map((item: T) => ({
        ...item,
        id: String((item as T & Record<string, unknown>).id || Math.random())
      })) as (T & { id: Key })[];

      console.log("✅ Loaded items:", mappedItems.length);

      // 다음 페이지가 있는지 확인 (실제 API에서는 total count를 받아야 함)
      const hasMore = mappedItems.length === params.limit;
      const nextCursor = hasMore ? String(params.page + 1) : undefined;

      return {
        items: mappedItems,
        cursor: nextCursor
      };
    } catch (error) {
      console.error("Failed to load async table data:", error);
      return { items: [], cursor: undefined };
    }
  }, [apiUrlKey, endpointPath, finalItemsPerPage]);

  // useAsyncList 훅 사용 (무한 스크롤 모드에서만)
  const asyncList = useAsyncList<T & { id: Key }, string>({
    load: finalPaginationMode === 'infinite-scroll' ? loadFunction : async () => ({ items: [], cursor: undefined }),
    getKey: (item: T & { id: Key }) => item.id,
  });

  // asyncList에서 필요한 속성들 추출
  const asyncListItems = asyncList.items;
  const asyncListLoadingState = asyncList.loadingState;
  const asyncListLoadMore = asyncList.loadMore;

  // 페이지네이션 상태 관리
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [paginationData, setPaginationData] = useState<(T & { id: Key })[]>([]);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [infiniteScrollData, setInfiniteScrollData] = useState<(T & { id: Key })[]>([]);
  const [infiniteScrollLoading, setInfiniteScrollLoading] = useState(false);

  // 페이지네이션 모드용 데이터 로딩 함수
  const loadPaginationData = useCallback(async (page: number) => {
    console.log("🔄 loadPaginationData called with page:", page);
    console.log("🔍 API config:", { apiUrlKey, endpointPath });

    if (!apiUrlKey || !endpointPath) {
      console.warn("❌ API URL Key or Endpoint Path is missing");
      return;
    }

    setPaginationLoading(true);
    try {
      const service = apiConfig[apiUrlKey as keyof typeof apiConfig];
      if (!service) {
        console.error(`❌ API service not found for key: ${apiUrlKey}`);
        return;
      }

      const params = { page, limit: finalItemsPerPage };
      console.log("📤 Calling API with params:", params);
      const json = await service(endpointPath, params);
      console.log("📥 API response:", json);

      const items = json.map((item: T) => ({
        ...item,
        id: (item as T & { id?: Key }).id || String(Math.random()),
      })) as (T & { id: Key })[];

      console.log("✅ Setting pagination data:", items.length, "items");
      setPaginationData(items);
      console.log("📄 Pagination data loaded:", items.length, "items for page", page);
    } catch (error) {
      console.error("❌ Failed to load pagination data:", error);
    } finally {
      setPaginationLoading(false);
    }
  }, [apiUrlKey, endpointPath, finalItemsPerPage]);

  // 무한 스크롤 모드용 데이터 로딩 함수
  const loadInfiniteScrollData = useCallback(async (page: number, append: boolean = false) => {
    if (!apiUrlKey || !endpointPath) return;

    setInfiniteScrollLoading(true);
    try {
      const service = apiConfig[apiUrlKey as keyof typeof apiConfig];
      if (!service) {
        console.error(`API service not found for key: ${apiUrlKey}`);
        return;
      }

      const params = { page, limit: finalItemsPerPage };
      const json = await service(endpointPath, params);

      const items = json.map((item: T) => ({
        ...item,
        id: (item as T & { id?: Key }).id || String(Math.random()),
      })) as (T & { id: Key })[];

      if (append) {
        setInfiniteScrollData(prev => [...prev, ...items]);
        console.log("📄 Infinite scroll data appended:", items.length, "items for page", page);
      } else {
        setInfiniteScrollData(items);
        console.log("📄 Infinite scroll data loaded:", items.length, "items for page", page);
      }
    } catch (error) {
      console.error("Failed to load infinite scroll data:", error);
    } finally {
      setInfiniteScrollLoading(false);
    }
  }, [apiUrlKey, endpointPath, finalItemsPerPage]);

  // 페이지네이션 핸들러
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // 페이지네이션 모드에서는 별도 데이터 로딩
      if (finalPaginationMode === 'pagination') {
        loadPaginationData(page);
      } else {
        // 무한 스크롤 모드에서는 loadMore 사용
        if (page > currentPage) {
          asyncListLoadMore();
        }
      }
    }
  }, [currentPage, totalPages, asyncListLoadMore, finalPaginationMode, loadPaginationData]);

  // 초기 데이터 로딩
  useEffect(() => {
    console.log("🔄 Initial data loading effect triggered:", {
      finalEnableAsyncLoading,
      finalPaginationMode,
      paginationDataLength: paginationData.length,
      infiniteScrollDataLength: infiniteScrollData.length
    });

    if (finalEnableAsyncLoading) {
      if (finalPaginationMode === 'pagination') {
        console.log("🔄 Loading initial pagination data...");
        loadPaginationData(1);
      } else {
        console.log("🔄 Loading initial infinite scroll data...");
        loadInfiniteScrollData(1, false);
      }
    }
  }, [finalEnableAsyncLoading, finalPaginationMode]);

  // 페이지네이션 정보 업데이트
  useEffect(() => {
    if (finalEnableAsyncLoading && finalPaginationMode === 'pagination') {
      // 실제 API에서는 total count를 받아야 하지만, 현재는 추정값 사용
      const estimatedTotalPages = Math.ceil(500 / 50); // 500개 데이터, 50개씩 로드
      setTotalPages(estimatedTotalPages);
      setHasNextPage(currentPage < estimatedTotalPages);
    }
  }, [finalEnableAsyncLoading, finalPaginationMode, currentPage]);

  // 최종 sortDescriptor와 onSortChange 결정
  const sortDescriptor: SortDescriptor = propSortDescriptor || defaultSortDescriptor;
  const onSortChange = propOnSortChange || (() => { }); // undefined 대신 빈 함수 제공

  const [localSelectedKeys, setLocalSelectedKeys] = useState<'all' | Set<Key>>(new Set());
  const selectedKeys = propSelectedKeys || localSelectedKeys;
  const onSelectionChange = propOnSelectionChange || setLocalSelectedKeys;

  // 데이터 정렬 로직 (정적 데이터의 경우 - finalEnableAsyncLoading이 false일 때 사용)
  const sortedStaticData = useMemo(() => {
    if (finalEnableAsyncLoading || !data || !sortDescriptor || !sortDescriptor.column) {
      return data;
    }
    const columnKey = sortDescriptor.column as keyof T;
    return [...data].sort((a, b) => {
      const aValue = a[columnKey];
      const bValue = b[columnKey];
      let cmp = (aValue < bValue ? -1 : aValue > bValue ? 1 : 0);
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });
  }, [finalEnableAsyncLoading, data, sortDescriptor]);

  // directData 제거 - useAsyncList 사용

  const finalData: (T & { id: Key })[] = useMemo(() => {
    console.log("🔄 finalData calculation:", {
      finalEnableAsyncLoading,
      finalPaginationMode,
      paginationDataLength: paginationData.length,
      infiniteScrollDataLength: infiniteScrollData.length,
      sortedStaticDataLength: sortedStaticData?.length || 0
    });

    if (finalEnableAsyncLoading) {
      if (finalPaginationMode === 'pagination') {
        // 페이지네이션 모드에서는 별도 데이터 사용
        console.log("🔄 Using pagination data:", paginationData.length);
        console.log("📊 Pagination data sample:", paginationData.slice(0, 2));
        return paginationData || [];
      } else {
        // 무한 스크롤 모드에서는 별도 데이터 사용
        console.log("🔄 Using infinite scroll data:", infiniteScrollData.length);
        console.log("📊 Infinite scroll data sample:", infiniteScrollData.slice(0, 2));
        return infiniteScrollData || [];
      }
    }

    // 정적 데이터 사용
    console.log("🔄 Using static data:", sortedStaticData?.length || 0);
    const processedItems = (sortedStaticData || []).map(item => ({
      ...item,
      id: (item as T & { id?: Key }).id || String(Math.random()), // Fallback for missing id
    })) as (T & { id: Key })[];

    return processedItems;
  }, [finalEnableAsyncLoading, finalPaginationMode, paginationData, infiniteScrollData, sortedStaticData, finalItemsPerPage]);

  // 디버깅을 위한 로그 추가
  console.log("🔍 finalData debug:", {
    finalEnableAsyncLoading,
    finalDataLength: finalData.length,
    finalPaginationMode,
    paginationDataLength: paginationData.length,
    paginationLoading,
    infiniteScrollDataLength: infiniteScrollData.length,
    infiniteScrollLoading,
    sortedStaticDataLength: sortedStaticData?.length || 0
  });

  // children이 없거나 빈 배열인 경우 기본 구조 제공 또는 data prop 사용
  const hasChildrenContent = children && React.Children.count(children) > 0;

  const tableContent = useMemo(() => {
    // 비동기 로딩이 활성화되면 항상 데이터 기반으로 렌더링
    if (finalEnableAsyncLoading && finalData && columns) {
      console.log("🟢 Rendering async data-based table content");
      console.log("📊 finalData length:", finalData.length);
      console.log("📋 columns:", columns);
      return (
        <>
          <TableHeader className={tableHeaderVariants({ variant: headerVariant })} columns={columns}>
            {(column: TableColumn<T>) => (
              <Column key={String(column.key)} allowsSorting={column.allowsSorting} isRowHeader={column.isRowHeader}>
                {({ sortDirection, allowsSorting }) => (
                  <>
                    {column.label}
                    {allowsSorting && sortDirection && <SortIcon direction={sortDirection} />}
                  </>
                )}
              </Column>
            )}
          </TableHeader>
          <TableBody className={tableCellVariants({ variant: cellVariant })} items={finalData}>
            {(item: T & { id: Key }) => (
              <Row id={item.id}>
                {columns.map(column => (
                  <Cell key={String(column.key)}>{(item as Record<string, unknown>)[column.key as string] as React.ReactNode}</Cell>
                ))}
              </Row>
            )}
          </TableBody>

          {/* 무한 스크롤 모드에 따른 로딩 UI */}
          {finalEnableAsyncLoading && finalPaginationMode === 'infinite-scroll' && (
            <CustomTableLoadMoreItem
              onLoadMore={() => {
                const nextPage = Math.floor(infiniteScrollData.length / (finalItemsPerPage || 10)) + 1;
                console.log("🔄 Loading more data for infinite scroll, page:", nextPage);
                loadInfiniteScrollData(nextPage, true);
              }}
              isLoading={infiniteScrollLoading}
            >
              <div className="flex items-center justify-center p-4 text-gray-500">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                데이터 로딩 중...
              </div>
            </CustomTableLoadMoreItem>
          )}

        </>
      );
    } else if (hasChildrenContent) {
      // 비동기 로딩이 아니면서 children이 존재하면 children 렌더링
      return children;
    } else if (finalData && columns) {
      // 비동기 로딩이 아니고 children도 없지만, 정적 데이터가 있으면
      return (
        <>
          <TableHeader className={tableHeaderVariants({ variant: headerVariant })} columns={columns}>
            {(column: TableColumn<T>) => (
              <Column key={String(column.key)} allowsSorting={column.allowsSorting} isRowHeader={column.isRowHeader}>
                {({ sortDirection, allowsSorting }) => (
                  <>
                    {column.label}
                    {allowsSorting && sortDirection && <SortIcon direction={sortDirection} />}
                  </>
                )}
              </Column>
            )}
          </TableHeader>
          <TableBody className={tableCellVariants({ variant: cellVariant })} items={finalData}>
            <Collection items={finalData}>
              {(item: T & { id: Key }) => (
                <Row id={item.id}>
                  {columns.map(column => (
                    <Cell key={String(column.key)}>{(item as Record<string, unknown>)[column.key as string] as React.ReactNode}</Cell>
                  ))}
                </Row>
              )}
            </Collection>
          </TableBody>
        </>
      );
    } else {
      // 기본 플레이스홀더 내용
      console.log("🔴 Rendering placeholder content");
      console.log("🔍 finalEnableAsyncLoading:", finalEnableAsyncLoading);
      console.log("🔍 finalData:", finalData);
      console.log("🔍 columns:", columns);
      console.log("🔍 hasChildrenContent:", hasChildrenContent);
      return (
        <>
          <TableHeader className={tableHeaderVariants({ variant: headerVariant })}>
            <Column isRowHeader>이름</Column>
            <Column>나이</Column>
            <Column>이메일</Column>
          </TableHeader>
          <TableBody className={tableCellVariants({ variant: cellVariant })} items={[]}>
            <Row>
              <Cell>홍길동</Cell>
              <Cell>25</Cell>
              <Cell>hong@example.com</Cell>
            </Row>
          </TableBody>
        </>
      );
    }
  }, [hasChildrenContent, children, finalData, columns, headerVariant, cellVariant, finalEnableAsyncLoading, asyncListLoadingState, finalPaginationMode, asyncListItems.length, currentPage, handlePageChange, hasNextPage, totalPages, infiniteScrollData.length, infiniteScrollLoading, loadInfiniteScrollData]);

  // 테이블 스타일 클래스
  const tableClasses = [
    "react-aria-Table w-full border-collapse",
    variant === 'bordered' ? 'border border-gray-300' : '',
    variant === 'striped' ? 'border border-gray-300' : '',
    size === 'sm' ? 'text-sm' : '',
    size === 'md' ? 'text-base' : '',
    size === 'lg' ? 'text-lg' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <ResizableTableContainer>
      <AriaTable
        ref={ref}
        className={tableClasses}
        data-testid={testId}
        aria-label="테이블"
        selectionMode={selectionMode}
        sortDescriptor={sortDescriptor}
        onSortChange={onSortChange}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        {...props}
      >
        {tableContent}
      </AriaTable>

      {/* 페이지네이션 UI - 재사용 가능한 컴포넌트 사용 */}
      {finalEnableAsyncLoading && finalPaginationMode === 'pagination' && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            isLoading={paginationLoading}
            onPageChange={handlePageChange}
            totalItems={paginationData.length}
            showPageInfo={true}
            className="w-full"
          />
        </div>
      )}
    </ResizableTableContainer>
  );
});

Table.displayName = 'Table';

// React Aria Table 관련 컴포넌트들 re-export
export {
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell
} from 'react-aria-components';