import React from 'react';
import { useAsyncList } from 'react-stately';
import { Table as AriaTable, Row, Cell, TableHeader, TableBody, Column, ResizableTableContainer, SortDescriptor, Key, SortDirection } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SortIcon } from './SortIcon'; // SortIcon 임포트 경로 수정 (혹은 임시 로딩 컴포넌트 사용)
import { apiConfig } from '../../services/api'; // apiConfig 임포트
import { createDefaultTableProps, TableElementProps } from '../../types/unified'; // createDefaultTableProps 임포트
import { useStore } from '../stores'; // useStore 임포트
import { Pagination } from './Pagination';
import TanStackTable from './TanStackTable';

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

// 컬럼 정의 타입 - 성능 최적화를 위한 메타데이터 포함
interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  allowsSorting?: boolean;
  isRowHeader?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  frozen?: boolean;
  resizable?: boolean;
}

// 컬럼 메타데이터 - 스타일 계산 캐싱용
interface ColumnMeta {
  style: React.CSSProperties;
  className: string;
  headerStyle: React.CSSProperties;
  headerClassName: string;
}

// 기존 TableColumn과의 호환성을 위한 타입 별칭
type TableColumn<T> = ColumnDefinition<T>;

// 선택 상태 관리를 위한 내부 상태
interface SelectionState {
  selectedKeys: Set<Key>;
  lastSelectionChange: number;
  isSelectionChanging: boolean;
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
  // 정렬 관련 props
  sortColumn?: string;
  sortDirection?: 'ascending' | 'descending';
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
  // 성능 최적화 옵션
  useTanStack?: boolean; // TanStack Table 사용 여부 (성능 향상)
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
    sortColumn = createDefaultTableProps().sortColumn, // 기본값 설정
    sortDirection = createDefaultTableProps().sortDirection, // 기본값 설정
    useTanStack = true, // 기본적으로 TanStack Table 사용
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

  // 정렬 옵션 처리
  const actualSortColumn = (actualElementProps as TableElementProps)?.sortColumn;
  const finalSortColumn = actualSortColumn !== undefined ? actualSortColumn : sortColumn;

  const actualSortDirection = (actualElementProps as TableElementProps)?.sortDirection;
  const finalSortDirection = actualSortDirection !== undefined ? actualSortDirection : sortDirection;

  // 개발 모드에서만 핵심 로그만 출력
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 Table 컴포넌트 finalPaginationMode:", finalPaginationMode);
    console.log("🔍 Table 컴포넌트 elementId:", elementId);
  }

  // sortDescriptor 초기값 설정 (propSortDescriptor가 없으면 기본값 사용)
  const defaultSortDescriptor: SortDescriptor = {
    column: (finalSortColumn || 'id') as Key, // 설정된 정렬 컬럼 사용
    direction: (finalSortDirection || 'ascending') as SortDirection, // 설정된 정렬 방향 사용
  };

  // 컬럼 메타데이터 캐싱 - 스타일 계산 최적화
  const columnMetas = useMemo(() => {
    const metaMap = new Map<keyof T, ColumnMeta>();

    columns?.forEach((column) => {
      const style: React.CSSProperties = {
        width: column.width || 150,
        minWidth: column.minWidth || 100,
        maxWidth: column.maxWidth || 300,
        textAlign: column.align || 'left',
      };

      const className = `table-cell ${column.frozen ? 'frozen' : ''} ${column.resizable ? 'resizable' : ''}`;

      const headerStyle: React.CSSProperties = {
        ...style,
        fontWeight: '600',
        backgroundColor: '#f9fafb',
      };

      const headerClassName = `table-header ${column.frozen ? 'frozen' : ''} ${column.resizable ? 'resizable' : ''}`;

      metaMap.set(column.key, {
        style,
        className,
        headerStyle,
        headerClassName,
      });
    });

    return metaMap;
  }, [columns]);

  // 선택 상태 최적화 - Set 인스턴스 재사용
  const selectionStateRef = useRef<SelectionState>({
    selectedKeys: new Set(),
    lastSelectionChange: 0,
    isSelectionChanging: false,
  });

  // 선택 상태 변경 감지 로직 - finalData와 onSelectionChange가 정의된 후에 이동


  // API 호출을 위한 동적 load 함수 생성
  // 페이지네이션을 지원하는 load 함수
  const loadFunction = useCallback(async ({ cursor }: { signal: AbortSignal; cursor?: string }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🟢 loadFunction called with cursor:", cursor);
    }

    if (!apiUrlKey || !endpointPath) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("API URL Key or Endpoint Path is not provided for async table loading.");
      }
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

  // 디버깅을 위한 로그 - 개발 모드에서만
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 useAsyncList 상태:", {
      shouldUseAsyncList,
      finalPaginationMode,
      finalEnableAsyncLoading,
      asyncListItemsLength: asyncListItems.length,
      safeAsyncListItemsLength: safeAsyncListItems.length
    });
  }

  // 가상화 설정을 위한 ref
  const parentRef = useRef<HTMLDivElement>(null);

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

  // 정렬 상태 관리
  const [localSortDescriptor, setLocalSortDescriptor] = useState<SortDescriptor>(defaultSortDescriptor);

  // 최종 sortDescriptor와 onSortChange 결정
  const sortDescriptor: SortDescriptor = propSortDescriptor || localSortDescriptor;
  const onSortChange = propOnSortChange || ((descriptor: SortDescriptor) => {
    console.log("🔄 정렬 변경:", descriptor);
    setLocalSortDescriptor(descriptor);

    // 비동기 로딩이 활성화된 경우 정렬된 데이터를 다시 로드
    if (finalEnableAsyncLoading && finalPaginationMode === 'pagination') {
      console.log("🔄 정렬 변경으로 인한 데이터 재로드");
      loadPaginationData(1); // 첫 페이지부터 다시 로드
    }
  });

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

      let cmp = 0;

      // 숫자 컬럼인 경우 숫자로 정렬
      if (columnKey === 'num' || columnKey === 'id') {
        const aNum = typeof aValue === 'number' ? aValue : parseInt(String(aValue), 10);
        const bNum = typeof bValue === 'number' ? bValue : parseInt(String(bValue), 10);
        cmp = (aNum < bNum ? -1 : aNum > bNum ? 1 : 0);
      } else {
        // 문자열 컬럼인 경우 문자열로 정렬
        cmp = (aValue < bValue ? -1 : aValue > bValue ? 1 : 0);
      }

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
      sortedStaticDataLength: sortedStaticData?.length || 0,
      sortDescriptor
    });

    let baseData: (T & { id: Key })[] = [];

    if (finalEnableAsyncLoading) {
      if (finalPaginationMode === 'pagination') {
        // 페이지네이션 모드에서는 paginationData만 사용
        console.log("🔄 Using pagination data:", paginationData.length);
        baseData = paginationData || [];
      } else if (shouldUseAsyncList) {
        // 무한 스크롤 모드에서는 useAsyncList의 items 사용
        console.log("🔄 Using asyncList items:", safeAsyncListItems.length);
        baseData = safeAsyncListItems || [];
      } else {
        // fallback: paginationData 사용
        console.log("🔄 Using pagination data (fallback):", paginationData.length);
        baseData = paginationData || [];
      }
    } else {
      // 정적 데이터 사용
      console.log("🔄 Using static data:", sortedStaticData?.length || 0);
      baseData = (sortedStaticData || []).map(item => ({
        ...item,
        id: (item as T & { id?: Key }).id || String(Math.random()), // Fallback for missing id
      })) as (T & { id: Key })[];
    }

    // 정렬 적용
    if (sortDescriptor && sortDescriptor.column && baseData.length > 0) {
      const columnKey = sortDescriptor.column as keyof T;
      const sortedData = [...baseData].sort((a, b) => {
        const aValue = a[columnKey];
        const bValue = b[columnKey];

        let cmp = 0;

        // 숫자 컬럼인 경우 숫자로 정렬
        if (columnKey === 'num' || columnKey === 'id') {
          const aNum = typeof aValue === 'number' ? aValue : parseInt(String(aValue), 10);
          const bNum = typeof bValue === 'number' ? bValue : parseInt(String(bValue), 10);
          cmp = (aNum < bNum ? -1 : aNum > bNum ? 1 : 0);
        } else {
          // 문자열 컬럼인 경우 문자열로 정렬
          cmp = (aValue < bValue ? -1 : aValue > bValue ? 1 : 0);
        }

        if (sortDescriptor.direction === 'descending') {
          cmp *= -1;
        }
        return cmp;
      });
      console.log("🔄 Applied sorting:", { column: sortDescriptor.column, direction: sortDescriptor.direction });
      return sortedData;
    }

    return baseData;
  }, [finalEnableAsyncLoading, finalPaginationMode, paginationData, safeAsyncListItems, sortedStaticData, shouldUseAsyncList, asyncListItems.length, sortDescriptor]);

  // 선택 상태 변경 감지 로직 - finalData가 정의된 후
  const optimizedSelectionChange = useCallback((keys: 'all' | Set<Key>) => {
    const now = Date.now();
    const state = selectionStateRef.current;

    // 동일한 선택 결과에 대한 재렌더 방지
    if (keys === 'all') {
      if (state.selectedKeys.size === finalData.length && !state.isSelectionChanging) {
        return;
      }
    } else if (keys instanceof Set) {
      const keysArray = Array.from(keys);
      const stateArray = Array.from(state.selectedKeys);

      if (keysArray.length === stateArray.length &&
        keysArray.every(key => stateArray.includes(key)) &&
        !state.isSelectionChanging) {
        return;
      }
    }

    state.isSelectionChanging = true;
    state.lastSelectionChange = now;

    // 실제 선택 상태 업데이트
    if (keys === 'all') {
      state.selectedKeys = new Set(finalData.map(item => item.id));
    } else {
      state.selectedKeys = new Set(keys);
    }

    // 선택 변경 핸들러 호출
    onSelectionChange?.(keys);

    // 상태 변경 플래그 해제
    setTimeout(() => {
      state.isSelectionChanging = false;
    }, 0);
  }, [finalData, onSelectionChange]);

  // 디버깅을 위한 로그 추가 - 개발 모드에서만
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 finalData debug:", {
      finalEnableAsyncLoading,
      finalDataLength: finalData.length,
      finalPaginationMode,
      paginationDataLength: paginationData.length,
      paginationLoading,
      sortedStaticDataLength: sortedStaticData?.length || 0,
      shouldUseAsyncList,
      asyncListItemsLength: asyncListItems.length,
      safeAsyncListItemsLength: safeAsyncListItems.length,
      asyncListLoadingState: asyncList.loadingState
    });
  }

  // 가상화 설정 (참조 코드 기반)
  const itemHeight = 34; // 참조 코드와 동일한 높이
  const overscan = 20; // 참조 코드와 동일한 overscan

  // 가상화 설정 - 스크롤 문제 수정
  const virtualizer = useVirtualizer({
    count: finalData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: overscan,
    // 스크롤 방향 명시적 지정
    horizontal: false,
  });

  // 가상화 디버깅을 위한 useEffect - 개발 모드에서만
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 Virtualizer 상태:", {
        totalItems: finalData.length,
        virtualizerEnabled: !!parentRef.current,
        scrollElement: parentRef.current,
        totalSize: virtualizer.getTotalSize(),
        virtualItems: virtualizer.getVirtualItems().length,
        scrollHeight: parentRef.current?.scrollHeight,
        clientHeight: parentRef.current?.clientHeight
      });
    }
  }, [finalData.length, virtualizer]);

  // 무한 스크롤을 위한 스크롤 이벤트 감지 - 개선된 버전
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement || !shouldUseAsyncList) return;

    let isLoadingMore = false; // 중복 로딩 방지

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;

      // 스크롤이 하단에 가까우면 더 많은 데이터 로드
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

      if (isNearBottom && !isLoadingMore) {
        isLoadingMore = true;
        console.log("🔄 무한 스크롤 감지 - 더 많은 데이터 로드 시도");
        console.log("🔍 스크롤 상태:", { scrollTop, scrollHeight, clientHeight, isNearBottom });

        // asyncList의 loadingState 확인
        const currentLoadingState = asyncList.loadingState;
        console.log("🔍 현재 로딩 상태:", currentLoadingState);

        if (currentLoadingState === 'idle' || currentLoadingState === 'loading') {
          console.log("✅ loadMore 호출");
          safeAsyncListLoadMore();
          // 비동기 작업이므로 setTimeout으로 로딩 상태 해제
          setTimeout(() => {
            isLoadingMore = false;
          }, 1000);
        } else {
          console.log("❌ 로딩 상태로 인해 loadMore 호출하지 않음:", currentLoadingState);
          isLoadingMore = false;
        }
      }
    };

    // 스크롤 이벤트에 디바운스 적용
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
  }, [shouldUseAsyncList, safeAsyncListLoadMore, asyncList.loadingState]);

  // 가상화 디버깅 - 개발 모드에서만 (레퍼런스 코드 스타일)
  const virtualItems = virtualizer.getVirtualItems();
  if (process.env.NODE_ENV === 'development' && virtualItems.length > 0) {
    console.log("🔍 Table 가상화 상태:", {
      totalRows: finalData.length,
      virtualItemsCount: virtualItems.length,
      startIndex: virtualItems[0]?.index || 0,
      endIndex: virtualItems[virtualItems.length - 1]?.index || 0,
      totalSize: virtualizer.getTotalSize()
    });
  }

  // children이 없거나 빈 배열인 경우 기본 구조 제공 또는 data prop 사용
  const hasChildrenContent = children && React.Children.count(children) > 0;

  const tableContent = useMemo(() => {
    // 비동기 로딩이 활성화되면 항상 데이터 기반으로 렌더링
    if (finalEnableAsyncLoading && finalData && columns) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🟢 Rendering async data-based table content");
        console.log("📊 finalData length:", finalData.length);
        console.log("📋 columns:", columns);
      }
      return (
        <>
          <TableHeader
            className={tableHeaderVariants({ variant: headerVariant, sticky: finalStickyHeader })}
            columns={columns}
            style={finalStickyHeader ? { top: `${finalStickyHeaderOffset}px` } : undefined}
          >
            {(column: TableColumn<T>) => (
              <Column key={String(column.key)} allowsSorting={column.allowsSorting} isRowHeader={column.isRowHeader}>
                {({ sortDirection, allowsSorting }) => {

                  return (
                    <div className="column-header">
                      {column.label}
                      {allowsSorting && sortDirection && <SortIcon direction={sortDirection} />}
                    </div>
                  );
                }}
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
                {({ sortDirection, allowsSorting }) => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`🔍 Column ${String(column.key)} sorting state:`, { sortDirection, allowsSorting });
                  }
                  return (
                    <div className="column-header">
                      {column.label}
                      {allowsSorting && sortDirection && <SortIcon direction={sortDirection} />}
                    </div>
                  );
                }}
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
      if (process.env.NODE_ENV === 'development') {
        console.log("🔴 Rendering placeholder content");
        console.log("🔍 finalEnableAsyncLoading:", finalEnableAsyncLoading);
        console.log("🔍 finalData:", finalData);
        console.log("🔍 columns:", columns);
        console.log("🔍 hasChildrenContent:", hasChildrenContent);
      }
      return (
        <>
          <TableHeader
            className={tableHeaderVariants({ variant: headerVariant, sticky: finalStickyHeader })}
            style={finalStickyHeader ? { top: `${finalStickyHeaderOffset}px` } : undefined}
          >
            <Column isRowHeader>Num</Column>
            <Column>이름</Column>
            <Column>나이</Column>
            <Column>이메일</Column>
          </TableHeader>
          <TableBody className={tableCellVariants({ variant: cellVariant })} items={[]}>
            <Row>
              <Cell>1</Cell>
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

  // TanStack Table 사용 (성능 최적화)
  if (useTanStack && finalData.length > 0) {
    return (
      <TanStackTable
        data={finalData}
        columns={columns?.map(col => ({
          key: col.key,
          label: col.label,
          allowsSorting: col.allowsSorting,
          width: col.width,
          align: col.align,
          type: col.key === 'num' || col.key === 'id' ? 'number' : 'string'
        })) || []}
        variant={variant}
        size={size}
        headerVariant={headerVariant}
        cellVariant={cellVariant}
        stickyHeader={stickyHeader}
        height={400}
        itemHeight={34}
        overscan={20}
        className={className}
        data-testid={testId}
        onSortChange={(sorting) => {
          if (sorting.length > 0) {
            const sort = sorting[0];
            const descriptor: SortDescriptor = {
              column: sort.id as Key,
              direction: sort.desc ? 'descending' : 'ascending'
            };
            onSortChange?.(descriptor);
          }
        }}
        onLoadMore={shouldUseAsyncList ? safeAsyncListLoadMore : undefined}
        hasMore={shouldUseAsyncList ? (asyncList.loadingState !== 'error') : false}
        isLoading={shouldUseAsyncList ? (asyncList.loadingState === 'loading' || asyncList.loadingState === 'loadingMore') : false}
      />
    );
  }

  // 가상화된 테이블 렌더링 (스크롤 문제 수정)
  if (finalData.length > 20 || (shouldUseAsyncList && finalData.length > 0)) {
    return (
      <div
        ref={parentRef}
        className={`react-aria-ResizableTable2`}
        style={{
          height: '400px',
          overflow: 'auto',
          position: 'relative'
        }}
        data-testid={testId}
        {...props} // 모든 props 전달 (data-element-id 포함)
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative'
          }}
        >
          <AriaTable
            ref={ref}
            className="react-aria-Table"
            aria-label="가상화된 테이블"
            selectionMode={selectionMode}
            sortDescriptor={sortDescriptor}
            onSortChange={onSortChange}
            selectedKeys={selectedKeys}
            onSelectionChange={optimizedSelectionChange}
            style={{
              width: '100%',
              tableLayout: 'fixed'
            }}
          >
            <TableHeader
              className={tableHeaderVariants({ variant: headerVariant, sticky: true })}
              columns={columns}
            >
              {(column: TableColumn<T>) => (
                <Column
                  key={String(column.key)}
                  allowsSorting={column.allowsSorting}
                  isRowHeader={column.isRowHeader}
                  width={column.width || 150} // 컬럼 너비 설정
                >
                  {({ sortDirection, allowsSorting }) => (
                    <div className="column-header flex items-center justify-between">
                      <span>{column.label}</span>
                      {allowsSorting && sortDirection && <SortIcon direction={sortDirection} />}
                    </div>
                  )}
                </Column>
              )}
            </TableHeader>
            <TableBody
              className={tableCellVariants({ variant: cellVariant })}
              items={virtualItems.map(virtualRow => ({
                ...finalData[virtualRow.index],
                virtualRow
              })).filter(item => item.id)}
            >
              {(item: T & { id: Key; virtualRow?: { index: number; start: number; size: number; end: number } }) => {
                const virtualRow = item.virtualRow;
                if (!virtualRow) return null;

                return (
                  <Row
                    id={item.id}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%'
                    }}
                  >
                    {columns?.map((column, colIndex) => {
                      const meta = columnMetas.get(column.key);
                      return (
                        <Cell
                          key={String(column.key)}
                          style={{
                            ...meta?.style,
                            width: column.width || 150,
                            borderRight: colIndex < columns.length - 1 ? '1px solid #e5e7eb' : 'none'
                          }}
                          className={meta?.className}
                        >
                          {(item as Record<string, unknown>)[column.key as string] as React.ReactNode}
                        </Cell>
                      );
                    })}
                  </Row>
                );
              }}
            </TableBody>
          </AriaTable>
        </div>

        {/* 로딩 인디케이터 개선 */}
        {shouldUseAsyncList && asyncList.loadingState === 'loadingMore' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 text-center border-t">
            <div className="inline-flex items-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              더 많은 데이터 로딩 중...
            </div>
          </div>
        )}

        {/* 에러 상태 표시 */}
        {shouldUseAsyncList && asyncList.loadingState === 'error' && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-50 p-2 text-center border-t border-red-200">
            <div className="text-sm text-red-600">
              데이터 로딩 중 오류가 발생했습니다. 다시 시도해주세요.
            </div>
          </div>
        )}
      </div>
    );
  }

  // 기존 테이블 렌더링 (100개 미만일 때)
  return (
    <ResizableTableContainer {...props}>
      <div style={{ height: paginationMode === 'pagination' ? `auto` : `${virtualizer.getTotalSize()}px` }}>
        <AriaTable
          ref={ref}
          className={tableClasses}
          data-testid={testId}
          aria-label="테이블"
          selectionMode={selectionMode}
          sortDescriptor={sortDescriptor}
          onSortChange={onSortChange}
          selectedKeys={selectedKeys}
          onSelectionChange={optimizedSelectionChange}
          {...props}
        >
          {tableContent}
        </AriaTable>
      </div>
      {/* 페이지네이션 UI - 재사용 가능한 컴포넌트 사용 */}
      {finalEnableAsyncLoading && finalPaginationMode === 'pagination' && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          isLoading={paginationLoading}
          onPageChange={handlePageChange}
          totalItems={paginationData.length}
          showPageInfo={true}
        />
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