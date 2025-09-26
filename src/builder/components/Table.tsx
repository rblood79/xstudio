import React from 'react';
import { useAsyncList } from 'react-stately';
import { Table as AriaTable, Row, Cell, TableHeader, TableBody, Column, ResizableTableContainer, SortDescriptor, Key, SortDirection } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SortIcon } from './SortIcon'; // SortIcon 임포트 경로 수정 (혹은 임시 로딩 컴포넌트 사용)
import { apiConfig } from '../../services/api'; // apiConfig 임포트
import { createDefaultTableProps, TableElementProps } from '../../types/unified'; // createDefaultTableProps 임포트
import { useStore } from '../stores'; // useStore 임포트
import { Pagination } from './Pagination';

const tableHeaderVariants = tv({
  base: 'react-aria-TableHeader',
  variants: {
    variant: {
      default: '',
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

const tableCellVariants = tv({
  base: '',
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
  // 헤더 고정 관련 props
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
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
    stickyHeader = createDefaultTableProps().stickyHeader, // 기본값 설정
    stickyHeaderOffset = createDefaultTableProps().stickyHeaderOffset, // 기본값 설정
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

  // 헤더 고정 옵션 처리
  const actualStickyHeader = (actualElementProps as TableElementProps)?.stickyHeader;
  const finalStickyHeader = actualStickyHeader !== undefined ? actualStickyHeader : stickyHeader;

  const actualStickyHeaderOffset = (actualElementProps as TableElementProps)?.stickyHeaderOffset;
  const finalStickyHeaderOffset = actualStickyHeaderOffset !== undefined ? actualStickyHeaderOffset : stickyHeaderOffset;

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
        limit: finalItemsPerPage || 10, // 설정된 페이지당 행 수만큼 로드
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

  // 페이지네이션 모드에서는 useAsyncList 비활성화
  const shouldUseAsyncList = finalEnableAsyncLoading && finalPaginationMode === 'infinite-scroll';

  // useAsyncList 훅 사용 (무한 스크롤 모드에서만)
  const asyncList = useAsyncList<T & { id: Key }, string>({
    load: shouldUseAsyncList ? loadFunction : async () => ({ items: [], cursor: undefined }),
    getKey: (item: T & { id: Key }) => item.id,
  });

  // 페이지네이션 모드에서는 useAsyncList 완전 비활성화
  if (!shouldUseAsyncList) {
    // 페이지네이션 모드에서는 useAsyncList를 사용하지 않음
    console.log("🚫 useAsyncList 비활성화됨 - 페이지네이션 모드");
  }

  // asyncList에서 필요한 속성들 추출
  const asyncListItems = asyncList.items;
  const asyncListLoadMore = asyncList.loadMore;

  // 페이지네이션 모드에서는 useAsyncList 완전 비활성화
  const safeAsyncListItems = useMemo(() =>
    shouldUseAsyncList ? asyncListItems : [],
    [shouldUseAsyncList, asyncListItems]
  );
  const safeAsyncListLoadMore = useMemo(() =>
    shouldUseAsyncList ? asyncListLoadMore : () => { },
    [shouldUseAsyncList, asyncListLoadMore]
  );

  // 디버깅을 위한 로그
  console.log("🔍 useAsyncList 상태:", {
    shouldUseAsyncList,
    finalPaginationMode,
    finalEnableAsyncLoading,
    asyncListItemsLength: asyncListItems.length,
    safeAsyncListItemsLength: safeAsyncListItems.length
  });

  // 페이지네이션 상태 관리
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [paginationData, setPaginationData] = useState<(T & { id: Key })[]>([]);
  const [paginationLoading, setPaginationLoading] = useState(false);

  // 무한루프 방지를 위한 ref
  const prevPaginationMode = useRef(finalPaginationMode);
  const prevEnableAsyncLoading = useRef(finalEnableAsyncLoading);
  const prevShouldUseAsyncList = useRef(shouldUseAsyncList);

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

      const params = { page, limit: finalItemsPerPage || 10 };
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
    // 값이 실제로 변경되었을 때만 실행
    const paginationModeChanged = prevPaginationMode.current !== finalPaginationMode;
    const enableAsyncLoadingChanged = prevEnableAsyncLoading.current !== finalEnableAsyncLoading;
    const shouldUseAsyncListChanged = prevShouldUseAsyncList.current !== shouldUseAsyncList;

    if (!paginationModeChanged && !enableAsyncLoadingChanged && !shouldUseAsyncListChanged) {
      return; // 값이 변경되지 않았으면 실행하지 않음
    }

    console.log("🔄 Initial data loading effect triggered:", {
      finalEnableAsyncLoading,
      finalPaginationMode,
      shouldUseAsyncList,
      paginationModeChanged,
      enableAsyncLoadingChanged,
      shouldUseAsyncListChanged
    });

    if (finalEnableAsyncLoading) {
      if (finalPaginationMode === 'pagination') {
        console.log("🔄 Loading initial pagination data...");
        loadPaginationData(1);
      } else if (shouldUseAsyncList) {
        console.log("🔄 Infinite scroll mode - triggering initial load");
        // useAsyncList의 초기 로딩을 강제로 트리거
        if (safeAsyncListItems.length === 0) {
          safeAsyncListLoadMore();
        }
      }
    }

    // 현재 값들을 ref에 저장
    prevPaginationMode.current = finalPaginationMode;
    prevEnableAsyncLoading.current = finalEnableAsyncLoading;
    prevShouldUseAsyncList.current = shouldUseAsyncList;
  }, [finalEnableAsyncLoading, finalPaginationMode, shouldUseAsyncList, loadPaginationData, safeAsyncListLoadMore, safeAsyncListItems.length]);

  // 페이지네이션 정보 업데이트
  useEffect(() => {
    if (finalEnableAsyncLoading && finalPaginationMode === 'pagination') {
      // 실제 API에서는 total count를 받아야 하지만, 현재는 추정값 사용
      const estimatedTotalPages = Math.ceil(500 / 50); // 500개 데이터, 50개씩 로드
      setTotalPages(estimatedTotalPages);
      setHasNextPage(currentPage < estimatedTotalPages);
    }
  }, [finalEnableAsyncLoading, finalPaginationMode, currentPage]);

  // hasNextPage 업데이트 (currentPage 변경 시)
  useEffect(() => {
    if (finalEnableAsyncLoading && finalPaginationMode === 'pagination') {
      const estimatedTotalPages = Math.ceil(500 / 50);
      setHasNextPage(currentPage < estimatedTotalPages);
    }
  }, [currentPage, finalEnableAsyncLoading, finalPaginationMode]);

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
      asyncListItemsLength: asyncListItems.length,
      sortedStaticDataLength: sortedStaticData?.length || 0
    });

    if (finalEnableAsyncLoading) {
      if (finalPaginationMode === 'pagination') {
        // 페이지네이션 모드에서는 paginationData만 사용
        console.log("🔄 Using pagination data:", paginationData.length);
        console.log("📊 Pagination data sample:", paginationData.slice(0, 2));
        return paginationData || [];
      } else if (shouldUseAsyncList) {
        // 무한 스크롤 모드에서는 useAsyncList의 items 사용
        console.log("🔄 Using asyncList items:", safeAsyncListItems.length);
        console.log("📊 AsyncList data sample:", safeAsyncListItems.slice(0, 2));
        return safeAsyncListItems || [];
      } else {
        // fallback: paginationData 사용
        console.log("🔄 Using pagination data (fallback):", paginationData.length);
        return paginationData || [];
      }
    }

    // 정적 데이터 사용
    console.log("🔄 Using static data:", sortedStaticData?.length || 0);
    const processedItems = (sortedStaticData || []).map(item => ({
      ...item,
      id: (item as T & { id?: Key }).id || String(Math.random()), // Fallback for missing id
    })) as (T & { id: Key })[];

    return processedItems;
  }, [finalEnableAsyncLoading, finalPaginationMode, paginationData, safeAsyncListItems, sortedStaticData, shouldUseAsyncList, asyncListItems.length]);

  // 디버깅을 위한 로그 추가
  console.log("🔍 finalData debug:", {
    finalEnableAsyncLoading,
    finalDataLength: finalData.length,
    finalPaginationMode,
    paginationDataLength: paginationData.length,
    paginationLoading,
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
          <TableHeader
            className={tableHeaderVariants({ variant: headerVariant, sticky: finalStickyHeader })}
            columns={columns}
            style={finalStickyHeader ? { top: `${finalStickyHeaderOffset}px` } : undefined}
          >
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


        </>
      );
    } else if (hasChildrenContent) {
      // 비동기 로딩이 아니면서 children이 존재하면 children 렌더링
      return children;
    } else if (finalData && columns) {
      // 비동기 로딩이 아니고 children도 없지만, 정적 데이터가 있으면
      return (
        <>
          <TableHeader
            className={tableHeaderVariants({ variant: headerVariant, sticky: finalStickyHeader })}
            columns={columns}
            style={finalStickyHeader ? { top: `${finalStickyHeaderOffset}px` } : undefined}
          >
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
          <TableHeader
            className={tableHeaderVariants({ variant: headerVariant, sticky: finalStickyHeader })}
            style={finalStickyHeader ? { top: `${finalStickyHeaderOffset}px` } : undefined}
          >
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
  }, [hasChildrenContent, children, finalData, columns, headerVariant, cellVariant, finalEnableAsyncLoading, finalStickyHeader, finalStickyHeaderOffset]);

  // 테이블 스타일 클래스
  const tableClasses = [
    "react-aria-Table",
    variant === 'bordered' ? 'border border-gray-300' : '',
    variant === 'striped' ? 'border border-gray-300' : '',
    size === 'sm' ? 'text-sm' : '',
    size === 'md' ? 'text-base' : '',
    size === 'lg' ? 'text-lg' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <ResizableTableContainer
      data-infinite-scroll={shouldUseAsyncList}

      onScroll={shouldUseAsyncList ? (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // 스크롤이 하단에 가까우면 더 많은 데이터 로드
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          console.log("🔄 스크롤 감지 - 더 많은 데이터 로드");
          safeAsyncListLoadMore();
        }
      } : undefined}
    >
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
        <div className="p-2 bg-gray-50 border-t border-gray-200">
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