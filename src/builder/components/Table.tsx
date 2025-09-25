import React, { useEffect } from 'react';
import { useAsyncList } from 'react-stately'; // AsyncListOptions, AsyncListLoadOptions 임포트 제거
import { Table as AriaTable, Row, Cell, TableHeader, TableBody, Column, ResizableTableContainer, SortDescriptor, Key, Collection, SortDirection } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef, useState, useMemo, useCallback } from 'react'; // useCallback 추가
import { SortIcon } from './SortIcon'; // SortIcon 임포트 경로 수정 (혹은 임시 로딩 컴포넌트 사용)
import { apiConfig } from '../../services/api'; // apiConfig 임포트
import { createDefaultTableProps } from '../../types/unified'; // createDefaultTableProps 임포트

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

// 임시 TableLoadMoreItem 컴포넌트 (react-aria-components에 직접 내보내지지 않는 경우)
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
    loadingState: propLoadingState,
    enableAsyncLoading = createDefaultTableProps().enableAsyncLoading, // 기본값 설정
    apiUrlKey = createDefaultTableProps().apiUrlKey, // 기본값 설정
    endpointPath = createDefaultTableProps().endpointPath, // 기본값 설정
    apiParams,
    dataMapping = { resultPath: 'results', idKey: 'id' }, // 기본값 설정
    ...props
  }: TableProps<T>, ref: React.Ref<HTMLTableElement>) {

  // sortDescriptor 초기값 설정 (propSortDescriptor가 없으면 기본값 사용)
  const defaultSortDescriptor: SortDescriptor = {
    column: 'id' as Key, // 유효한 Key 값으로 초기화
    direction: 'ascending' as SortDirection,
  };

  // API 호출을 위한 동적 load 함수 생성
  const dynamicLoadFunction = useCallback(async () => {
    console.log("🟢 dynamicLoadFunction called inside useCallback");
    console.log("📝 Current apiUrlKey:", apiUrlKey, "endpointPath:", endpointPath);
    if (!apiUrlKey || !endpointPath) {
      console.warn("API URL Key or Endpoint Path is not provided for async table loading.");
      return { items: [], cursor: undefined };
    }

    // apiConfig에서 API 함수 가져오기
    const fetchApiData = apiConfig[apiUrlKey];
    if (!fetchApiData || typeof fetchApiData !== 'function') {
      console.error(`API handler for key '${apiUrlKey}' not found or is not a function.`);
      return { items: [], cursor: undefined };
    }
    console.log("➡️ Calling fetchApiData for:", apiUrlKey, endpointPath, apiParams);
    try {
      // apiConfig에 정의된 fetchApiData 함수를 호출하여 데이터 가져오기
      const json: T[] | Record<string, unknown> = await fetchApiData(endpointPath, apiParams as Record<string, unknown>);
      console.log("⬅️ Received JSON data:", json);

      // 데이터 매핑 적용
      const resultItems: (T & { id: Key })[] = dataMapping?.resultPath
        ? (Array.isArray((json as Record<string, unknown>)[dataMapping.resultPath]) ? (json as Record<string, unknown>)[dataMapping.resultPath] : []) as (T & { id: Key })[]
        : (Array.isArray(json) ? json : []) as (T & { id: Key })[];
      const mappedItems = resultItems.map((item: T & { id: Key }) => ({
        ...item,
        id: String((item as T & Record<string, unknown>)[dataMapping?.idKey || 'id']) // idKey에 따라 id 설정
      }));

      // 직접 데이터에 저장
      setDirectData(mappedItems);

      return {
        items: mappedItems,
        cursor: undefined, // Mock API는 페이지네이션을 지원하지 않으므로 cursor는 undefined
      };
    } catch (error) {
      console.error("Failed to load async table data:", error);
      return { items: [], cursor: undefined };
    }
  }, [apiUrlKey, endpointPath, apiParams, dataMapping]);

  console.log("🔵 dynamicLoadFunction defined and ready for useAsyncList");

  // useAsyncList 훅 항상 사용
  const asyncList = useAsyncList<T & { id: Key }, string>({
    load: dynamicLoadFunction,
    // sort, onSortChange는 useAsyncList가 반환하는 속성을 사용
  });

  // asyncList에서 필요한 속성들을 직접 사용 (onSortChange, cursor 제거)
  const asyncListItems = asyncList.items;
  const asyncListLoadingState = asyncList.loadingState;
  const asyncListSortDescriptor = asyncList.sortDescriptor;
  // const asyncListOnSortChange = asyncList.onSortChange; // 제거
  const asyncListLoadMore = asyncList.loadMore;
  // const asyncListCursor = asyncList.cursor; // cursor 재도입

  const listItems: (T & { id: Key })[] = useMemo(() => {
    return enableAsyncLoading ? (asyncListItems || []) : (data || []).map(item => ({ ...item, id: (item as T & { id?: Key }).id || String(Math.random()) }));
  }, [enableAsyncLoading, asyncListItems, data]);

  const listLoadingState = propLoadingState || (enableAsyncLoading ? asyncListLoadingState : 'idle');

  // 최종 sortDescriptor와 onSortChange 결정 (asyncListOnSortChange 제거)
  const sortDescriptor: SortDescriptor = propSortDescriptor || (enableAsyncLoading ? asyncListSortDescriptor || defaultSortDescriptor : defaultSortDescriptor);
  const onSortChange = propOnSortChange || (() => { }); // undefined 대신 빈 함수 제공

  const [localSelectedKeys, setLocalSelectedKeys] = useState<'all' | Set<Key>>(new Set());
  const selectedKeys = propSelectedKeys || localSelectedKeys;
  const onSelectionChange = propOnSelectionChange || setLocalSelectedKeys;

  // 데이터 정렬 로직 (정적 데이터의 경우 - enableAsyncLoading이 false일 때 사용)
  const sortedStaticData = useMemo(() => {
    if (enableAsyncLoading || !data || !sortDescriptor || !sortDescriptor.column) {
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
  }, [enableAsyncLoading, data, sortDescriptor]);

  // 직접 데이터 관리 (useAsyncList 우회)
  const [directData, setDirectData] = useState<(T & { id: Key })[]>([]);

  // useEffect를 사용하여 직접 데이터 로드
  useEffect(() => {
    if (enableAsyncLoading && apiUrlKey && endpointPath) {
      console.log("🚀 Direct data loading started");
      const loadData = async () => {
        try {
          const fetchApiData = apiConfig[apiUrlKey];
          if (!fetchApiData || typeof fetchApiData !== 'function') {
            console.error(`API handler for key '${apiUrlKey}' not found or is not a function.`);
            return;
          }

          console.log("➡️ Direct calling fetchApiData for:", apiUrlKey, endpointPath, {});
          const json: T[] | Record<string, unknown> = await fetchApiData(endpointPath, {});
          console.log("⬅️ Direct received JSON data:", json);

          // 데이터 매핑 적용 (기본값 사용)
          const resultItems = Array.isArray(json) ? json : [];

          const mappedItems = resultItems.map((item: T) => ({
            ...item,
            id: String((item as T & Record<string, unknown>).id || Math.random())
          })) as (T & { id: Key })[];

          console.log("✅ Direct mapped items:", mappedItems.length);
          setDirectData(mappedItems);
        } catch (error) {
          console.error("Failed to load direct table data:", error);
        }
      };

      loadData();
    }
  }, [enableAsyncLoading, apiUrlKey, endpointPath]);

  const finalData: (T & { id: Key })[] = useMemo(() => {
    // 비동기 로딩이 활성화되고 directData가 있으면 우선 사용
    if (enableAsyncLoading && directData.length > 0) {
      console.log("🔄 Using direct data:", directData.length);
      return directData;
    }

    const items = enableAsyncLoading ? listItems : sortedStaticData;
    const processedItems = (items || []).map(item => ({
      ...item,
      id: (item as T & { id?: Key }).id || String(Math.random()), // Fallback for missing id
    })) as (T & { id: Key })[];

    return processedItems;
  }, [enableAsyncLoading, listItems, sortedStaticData, directData]);

  // 디버깅을 위한 로그 추가
  console.log("🔍 finalData debug:", {
    enableAsyncLoading,
    listItemsLength: listItems?.length || 0,
    finalDataLength: finalData.length,
    sortedStaticDataLength: sortedStaticData?.length || 0,
    directDataLength: directData.length
  });

  // children이 없거나 빈 배열인 경우 기본 구조 제공 또는 data prop 사용
  const hasChildrenContent = children && React.Children.count(children) > 0;

  const tableContent = useMemo(() => {
    // 비동기 로딩이 활성화되면 항상 데이터 기반으로 렌더링
    if (enableAsyncLoading && finalData && columns) {
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
          {enableAsyncLoading && listLoadingState === 'loadingMore' && (
            <CustomTableLoadMoreItem
              onLoadMore={asyncListLoadMore}
              isLoading={listLoadingState === 'loadingMore'}
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
      console.log("🔍 enableAsyncLoading:", enableAsyncLoading);
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
  }, [hasChildrenContent, children, finalData, columns, headerVariant, cellVariant, enableAsyncLoading, listLoadingState, asyncListLoadMore]); // useMemo 의존성 배열 수정

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