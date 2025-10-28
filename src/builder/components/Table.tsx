// src/builder/components/Table.tsx
import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type Row as TableRow,
  type ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Select, SelectItem } from "./list";
import './styles/Table.css';
import {
  ChevronDown,
  ChevronUp,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiConfig } from "../../services/api";
import { ElementUtils } from "../../utils/elementUtils";
export type PaginationMode = "pagination" | "infinite";

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  elementId?: string; // Column Element ID for selection
  order_num?: number; // order_num 추가
  allowsSorting?: boolean;
  enableResizing?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
}

export interface ColumnGroupDefinition {
  id: string;
  label: string;
  span: number;
  order_num?: number; // order_num 추가
  align?: "left" | "center" | "right";
  variant?: "default" | "primary" | "secondary";
  sticky?: boolean;
}

// 데이터 매핑 인터페이스
export interface DataMapping {
  resultPath?: string; // API 응답에서 데이터 배열 경로 (예: "results", "data")
  idKey?: string; // 고유 식별자 필드 (예: "id", "name")
  totalKey?: string; // 전체 개수 필드 (예: "total", "count")
}

export interface TableProps<T extends { id: string | number }> {
  className?: string;
  "data-element-id"?: string;
  tableHeaderElementId?: string; // TableHeader Element ID for selection

  // 데이터 소스: 정적 or 비동기
  data?: T[]; // 정적 데이터면 API 호출 안 함
  apiUrlKey?: string; // apiConfig 키 (예: "demo")
  customApiUrl?: string; // Custom API URL (apiUrlKey가 "CUSTOM"일 때 사용)
  endpointPath?: string; // 엔드포인트 (예: "/users")
  enableAsyncLoading?: boolean; // true일 때만 API 사용
  dataMapping?: DataMapping; // 데이터 매핑 설정
  apiParams?: Record<string, unknown>; // API 파라미터

  // 컬럼
  columns: ColumnDefinition<T>[];
  columnGroups?: ColumnGroupDefinition[]; // Column Groups 추가

  // 표 옵션
  paginationMode?: PaginationMode; // 'pagination' | 'infinite'
  itemsPerPage?: number; // default: 50
  height?: number; // 뷰포트 높이, default: 400
  heightMode?: "auto" | "fixed" | "viewport" | "full"; // 높이 모드
  heightUnit?: "px" | "vh" | "rem" | "em"; // 높이 단위
  viewportHeight?: number; // 뷰포트 높이 비율 (%), default: 50
  rowHeight?: number; // 추정 행 높이, default: 40
  overscan?: number; // default: 12

  // 정렬 초기값
  sortColumn?: keyof T | string;
  sortDirection?: "ascending" | "descending";

  // 기능
  enableResize?: boolean; // default: true

  // 콜백
  onColumnsDetected?: (columns: ColumnDefinition<T>[]) => void; // 자동 감지된 컬럼 전달
  onItemsPerPageChange?: (itemsPerPage: number) => void; // 페이지당 항목 수 변경 콜백
}

export default React.memo(function Table<T extends { id: string | number }>(
  props: TableProps<T>
) {
  const {
    className,
    tableHeaderElementId,

    data: staticData,
    apiUrlKey,
    customApiUrl,
    endpointPath,
    enableAsyncLoading = false,
    dataMapping,
    apiParams,

    columns,
    columnGroups = [],
    paginationMode = "pagination",
    itemsPerPage = 500,
    height = 400,
    heightMode = "fixed",
    heightUnit = "px",
    viewportHeight = 50,
    rowHeight = 38,
    overscan = 10,

    sortColumn,
    sortDirection = "ascending",

    enableResize = true,
    onColumnsDetected, // 자동 감지된 컬럼 콜백
    onItemsPerPageChange, // 페이지당 항목 수 변경 콜백
  } = props;

  const mode: PaginationMode = paginationMode || "pagination";

  // staticData가 빈 배열이 아닌 실제 데이터가 있는지 확인
  const hasValidStaticData = staticData && Array.isArray(staticData) && staticData.length > 0;

  const isAsync =
    enableAsyncLoading === true &&
    !hasValidStaticData &&  // 빈 배열도 false로 처리
    Boolean(apiUrlKey) &&
    Boolean(endpointPath) &&
    (endpointPath?.trim().length ?? 0) > 0;

  // 디버깅: isAsync 계산 결과 로깅
  React.useEffect(() => {
    console.log("🔍 Table isAsync 계산:", {
      enableAsyncLoading,
      staticData: staticData ? `Array(${staticData.length})` : staticData,
      hasValidStaticData,
      apiUrlKey,
      endpointPath,
      isAsync,
    });
  }, [enableAsyncLoading, staticData, hasValidStaticData, apiUrlKey, endpointPath, isAsync]);

  // 페이지네이션 표시 여부 (API 또는 Static/Supabase 모두 지원)
  const shouldShowPagination = mode === "pagination";

  // ---------- 데이터 매핑 함수 ----------
  const processApiResponse = React.useCallback(
    (
      response: unknown,
      mapping?: DataMapping
    ): { items: T[]; total: number } => {
      if (!mapping) {
        // 매핑 설정이 없으면 원본 데이터 그대로 사용
        const items = Array.isArray(response) ? (response as T[]) : [];
        return { items, total: items.length };
      }

      try {
        // response를 Record<string, unknown>으로 타입 가드
        const responseObj = response as Record<string, unknown>;

        // resultPath로 데이터 배열 추출
        let dataArray: unknown[];
        if (mapping.resultPath) {
          // resultPath가 설정된 경우 해당 경로에서 데이터 추출
          const pathData = responseObj[mapping.resultPath] as unknown[];
          if (Array.isArray(pathData)) {
            dataArray = pathData;
          } else {
            // resultPath에 데이터가 없으면 원본이 배열인지 확인
            dataArray = Array.isArray(response) ? response : [];
          }
        } else {
          // resultPath가 없는 경우 원본 데이터 사용
          dataArray = Array.isArray(response) ? response : [];
        }

        // 각 아이템에 id 추가 (idKey가 있으면 해당 필드를 id로 사용)
        const mappedItems = dataArray.map((item: unknown, index: number) => {
          const itemObj = item as Record<string, unknown>;
          return {
            ...itemObj,
            id: mapping.idKey ? itemObj[mapping.idKey] : itemObj.id || index,
          } as T;
        });

        // total 추출 (totalKey가 있으면 해당 필드 사용)
        const total = mapping.totalKey
          ? (responseObj[mapping.totalKey] as number) || dataArray.length
          : dataArray.length;

        return { items: mappedItems, total };
      } catch (error) {
        console.error("❌ Data mapping error:", error);
        const items = Array.isArray(response) ? (response as T[]) : [];
        return { items, total: items.length };
      }
    },
    []
  );

  // ---------- 높이 계산 ----------
  const calculatedHeight = React.useMemo(() => {
    switch (heightMode) {
      case "auto":
        return "auto";
      case "fixed":
        return `${height}${heightUnit}`;
      case "viewport":
        return `${viewportHeight}vh`;
      case "full":
        return "100vh";
      default:
        return `${height}px`;
    }
  }, [heightMode, height, heightUnit, viewportHeight]);

  // ---------- 정렬 ----------
  const initialSorting: SortingState = React.useMemo(() => {
    // sortColumn이 없거나 빈 문자열이면 정렬하지 않음
    if (!sortColumn || sortColumn === "") return [];
    return [{ id: String(sortColumn), desc: sortDirection === "descending" }];
  }, [sortColumn, sortDirection]);
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);

  // ---------- 자동 감지된 컬럼 상태 ----------
  const [detectedColumns, setDetectedColumns] = React.useState<
    ColumnDefinition<T>[]
  >([]);

  // ---------- 컬럼 자동 감지 함수 ----------
  const detectColumnsFromData = React.useCallback((data: T[]): ColumnDefinition<T>[] => {
    if (!data || data.length === 0) return [];

    const firstItem = data[0];
    const keys = Object.keys(firstItem);

    return keys.map((key) => ({
      key: key as keyof T,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      allowsSorting: true,
      enableResizing: true,
      width: 150,
      align: 'left' as const,
      // 자동 생성된 컬럼에 UUID 기반 elementId 부여
      elementId: ElementUtils.generateId(),
    }));
  }, []);

  // ---------- Static 데이터 자동 감지 ----------
  React.useEffect(() => {
    // Static 데이터이고, 컬럼이 제공되지 않았고, 데이터가 있으면 자동 감지
    // 단, 이미 자동 감지된 컬럼이 있으면 건너뛰기 (중복 방지)
    if (!isAsync && columns.length === 0 && staticData && staticData.length > 0 && detectedColumns.length === 0) {
      const detected = detectColumnsFromData(staticData);
      setDetectedColumns(detected);
      console.log("🔍 Static 데이터 컬럼 자동 감지:", detected);

      // 부모 컴포넌트에 자동 감지된 컬럼 전달
      if (onColumnsDetected) {
        onColumnsDetected(detected);
      }
    }
  }, [staticData, columns.length, isAsync, detectColumnsFromData, onColumnsDetected, detectedColumns.length]);

  // ---------- Column Definitions with Groups ----------
  const columnDefsWithGroups = React.useMemo<ColumnDef<T>[]>(() => {
    // 사용할 컬럼 결정: 제공된 컬럼이 있으면 사용, 없으면 자동 감지된 컬럼 사용
    const effectiveColumns = columns.length > 0 ? columns : detectedColumns;

    if (effectiveColumns.length === 0) {
      return [];
    }

    // Column Helper 생성
    const columnHelper = createColumnHelper<T>();

    if (columnGroups.length === 0) {
      // Column Group이 없으면 기본 컬럼 정의 반환
      const basicColumns = effectiveColumns.map((c) =>
        columnHelper.accessor(String(c.key), {
          id: String(c.key),
          header: () => (
            <span
              style={{
                fontWeight: "500",
                fontSize: "13px",
                color: "#374151",
              }}
            >
              {c.label}
            </span>
          ),
          size: c.width ?? 150,
          minSize: c.minWidth,
          maxSize: c.maxWidth,
          enableSorting: c.allowsSorting ?? true,
          enableResizing: c.enableResizing ?? true,
          cell: (info: { getValue: () => unknown }) => {
            const value = info.getValue();
            // 중첩 객체는 JSON 문자열로 변환
            if (value && typeof value === "object" && !React.isValidElement(value)) {
              return JSON.stringify(value);
            }
            return value as React.ReactNode;
          },
        })
      );
      return basicColumns;
    }

    // Column Group이 있으면 span 개수만큼만 컬럼을 그룹으로 묶고, 나머지는 개별 컬럼으로 유지
    const result: ColumnDef<T>[] = [];
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

    // 컬럼들을 order_num 순서로 정렬 (이미 정렬되어 있지만 확실히 하기 위해)
    const sortedColumns = [...effectiveColumns].sort((a, b) => {
      if (a.order_num !== undefined && b.order_num !== undefined) {
        return a.order_num - b.order_num;
      }
      return 0;
    });

    for (const group of sortedGroups) {
      // 그룹에 속할 컬럼들 선택 (span 범위만큼)
      const groupColumns = sortedColumns.slice(
        columnIndex,
        columnIndex + group.span
      );

      if (groupColumns.length > 0) {
        // 하위 컬럼들을 columnHelper.accessor()로 생성
        const subColumns = groupColumns.map((c) =>
          columnHelper.accessor(String(c.key), {
            id: String(c.key),
            header: () => <span style={{}}>{c.label}</span>,
            size: c.width ?? 150,
            minSize: c.minWidth,
            maxSize: c.maxWidth,
            enableSorting: c.allowsSorting ?? true,
            enableResizing: c.enableResizing ?? true,
            cell: (info: { getValue: () => unknown }) => {
              const value = info.getValue();
              // 중첩 객체는 JSON 문자열로 변환
              if (value && typeof value === "object" && !React.isValidElement(value)) {
                return JSON.stringify(value);
              }
              return value as React.ReactNode;
            },
          })
        );

        // TanStack Table의 columnHelper.group()을 사용한 Column Group 생성
        const groupColumn = columnHelper.group({
          id: `group-${group.id}`,
          header: () => (
            <span
              style={{
                color: group.variant === "primary" ? "#ffffff" : "#374151",
                backgroundColor:
                  group.variant === "primary"
                    ? "#3b82f6"
                    : group.variant === "secondary"
                      ? "#6b7280"
                      : "#f8fafc",

                textAlign: group.align || "center",
              }}
            >
              {group.label}
            </span>
          ),
          columns: subColumns,
          meta: {
            isGroupHeader: true,
            align: group.align || "center",
            variant: group.variant || "default",
            sticky: group.sticky || false,
            elementId: group.id, // Column Group의 elementId 추가
          },
        });

        result.push(groupColumn);
      }

      columnIndex += group.span;
    }

    // 남은 컬럼들을 개별 컬럼으로 추가 (Column Group이 아닌 컬럼들)
    if (columnIndex < sortedColumns.length) {
      const remainingColumns = sortedColumns.slice(columnIndex);
      for (const c of remainingColumns) {
        result.push(
          columnHelper.accessor(String(c.key), {
            id: String(c.key),
            header: () => (
              <span
                style={{
                  fontWeight: "500",
                  fontSize: "13px",
                  color: "#374151",
                }}
              >
                {c.label}
              </span>
            ),
            size: c.width ?? 150,
            minSize: c.minWidth,
            maxSize: c.maxWidth,
            enableSorting: c.allowsSorting ?? true,
            enableResizing: c.enableResizing ?? true,
            cell: (info: { getValue: () => unknown }) => {
              const value = info.getValue();
              // 중첩 객체는 JSON 문자열로 변환
              if (value && typeof value === "object" && !React.isValidElement(value)) {
                return JSON.stringify(value);
              }
              return value as React.ReactNode;
            },
          })
        );
      }
    }

    return result;
  }, [columns, columnGroups, detectedColumns]);

  // ---------- 사용할 컬럼 결정 ----------
  const effectiveColumns = React.useMemo(() => {
    return columns.length > 0 ? columns : detectedColumns;
  }, [columns, detectedColumns]);

  // ---------- 비동기 상태 ----------
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [pageRows, setPageRows] = React.useState<T[]>([]);
  const [currentItemsPerPage, setCurrentItemsPerPage] = React.useState(itemsPerPage); // 내부 상태 추가
  const [flatRows, setFlatRows] = React.useState<T[]>([]);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  // ---------- Static/Supabase 클라이언트 사이드 페이지네이션 상태 ----------
  const [clientPageIndex, setClientPageIndex] = React.useState(0);

  // Static/Supabase 데이터의 클라이언트 페이지네이션
  const clientPaginatedData = React.useMemo(() => {
    if (isAsync || !staticData) return staticData || [];
    if (mode !== "pagination") return staticData;

    const start = clientPageIndex * currentItemsPerPage;
    const end = start + currentItemsPerPage;
    return staticData.slice(start, end);
  }, [isAsync, staticData, mode, clientPageIndex, currentItemsPerPage]);

  const clientTotalPages = React.useMemo(() => {
    if (isAsync || !staticData) return 0;
    return Math.ceil(staticData.length / currentItemsPerPage);
  }, [isAsync, staticData, currentItemsPerPage]);

  // prop 변경 시 내부 상태 동기화
  React.useEffect(() => {
    setCurrentItemsPerPage(itemsPerPage);
  }, [itemsPerPage]);

  // ---------- API 데이터 자동 감지 ----------
  React.useEffect(() => {
    // API 데이터이고, 컬럼이 제공되지 않았고, 페이지 데이터가 있으면 자동 감지
    // 단, 이미 자동 감지된 컬럼이 있으면 건너뛰기 (중복 방지)
    if (isAsync && columns.length === 0 && pageRows && pageRows.length > 0 && detectedColumns.length === 0) {
      const detected = detectColumnsFromData(pageRows);
      setDetectedColumns(detected);
      console.log("🔍 API 데이터 컬럼 자동 감지:", detected);

      // 부모 컴포넌트에 자동 감지된 컬럼 전달
      if (onColumnsDetected) {
        onColumnsDetected(detected);
      }
    }
  }, [pageRows, columns.length, isAsync, detectColumnsFromData, onColumnsDetected, detectedColumns.length]);

  // ---------- API 어댑터 (더미 배열 응답 기반) ----------
  const isFetchingRef = React.useRef(false);

  const fetchPage = React.useCallback(
    async (nextIndex: number, pageSize?: number) => {
      if (!isAsync || !apiUrlKey || !endpointPath) {
        console.log("❌ fetchPage 중단:", { isAsync, apiUrlKey, endpointPath });
        return { items: [] as T[], total: 0 };
      }

      console.log("🚀 fetchPage 시작:", {
        apiUrlKey,
        endpointPath,
        nextIndex,
        pageSize,
        availableKeys: Object.keys(apiConfig),
      });

      // 중복 호출 방지
      if (isFetchingRef.current) {
        console.log("⏸️ Fetch already in progress, skipping...");
        return { items: [] as T[], total: 0 };
      }

      // Custom URL을 사용하는 경우와 일반 API 서비스를 사용하는 경우 구분
      const isCustomUrl = apiUrlKey === "CUSTOM";

      const service = !isCustomUrl
        ? (apiConfig[apiUrlKey as keyof typeof apiConfig] as (
          endpoint: string,
          params: Record<string, unknown>
        ) => Promise<T[]>)
        : null;

      if (!isCustomUrl && !service) {
        console.error("❌ API 서비스를 찾을 수 없음:", {
          apiUrlKey,
          availableKeys: Object.keys(apiConfig),
        });
        return { items: [] as T[], total: 0 };
      }

      if (isCustomUrl && !customApiUrl) {
        console.error("❌ Custom URL이 설정되지 않음");
        return { items: [] as T[], total: 0 };
      }

      isFetchingRef.current = true;
      setLoading(true);

      try {
        const sort = sorting[0]
          ? { sortBy: sorting[0].id, desc: sorting[0].desc }
          : undefined;
        const limit = pageSize ?? currentItemsPerPage; // itemsPerPage 대신 currentItemsPerPage 사용

        // 두 모드 모두 page/limit 방식 사용
        // apiParams를 먼저 spread하고, page와 limit으로 오버라이드
        const params = {
          ...(apiParams || {}), // API 파라미터 먼저 (기본값)
          ...sort,
          page: nextIndex + 1, // nextIndex는 0부터 시작하므로 +1 (오버라이드)
          limit, // (오버라이드)
        };

        console.log("🔍 API 호출 파라미터:", params, "nextIndex:", nextIndex);

        let response: T[] | Record<string, unknown>;

        if (isCustomUrl && customApiUrl) {
          // Custom URL 직접 fetch
          const fullUrl = `${customApiUrl}${endpointPath}`;
          const queryParams = new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          ).toString();
          const urlWithParams = queryParams ? `${fullUrl}?${queryParams}` : fullUrl;

          console.log("🌐 Custom API 호출:", urlWithParams);
          const res = await fetch(urlWithParams);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          response = await res.json();
        } else if (service) {
          response = await service(endpointPath, params);
        } else {
          throw new Error("API 서비스가 설정되지 않음");
        }

        console.log("📦 API 응답:", {
          responseType: Array.isArray(response) ? 'Array' : typeof response,
          responseLength: Array.isArray(response) ? response.length : 'N/A',
          dataMapping,
        });

        // 데이터 매핑 적용
        const { items, total } = processApiResponse(response, dataMapping);

        console.log("📊 processApiResponse 결과:", {
          itemsLength: items.length,
          total,
          firstItem: items[0],
        });

        // 컬럼이 제공되지 않았고 데이터가 있으면 자동 감지
        if (columns.length === 0 && items.length > 0) {
          const detected = detectColumnsFromData(items);
          setDetectedColumns(detected);
          console.log("🔍 자동 감지된 컬럼:", detected);

          // 부모 컴포넌트에 자동 감지된 컬럼 전달
          if (onColumnsDetected) {
            onColumnsDetected(detected);
          }
        } else {
          console.log("⚠️ 자동 감지 조건 미충족:", {
            columnsLength: columns.length,
            itemsLength: items.length,
          });
        }

        // API 응답에서 메타데이터 확인 (Pagination용)
        const meta = (response as unknown as Record<string, unknown>).__meta as
          | { totalItems?: number; currentPage?: number; itemsPerPage?: number }
          | undefined;
        let actualTotal = total;

        if (meta && typeof meta.totalItems === "number") {
          // API에서 제공하는 정확한 정보 사용
          actualTotal = meta.totalItems;
          console.log("🔍 API 메타데이터 사용 (Pagination):", {
            totalItems: meta.totalItems,
            currentPage: meta.currentPage,
            itemsPerPage: meta.itemsPerPage,
          });
        }

        return { items, total: actualTotal };
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [
      isAsync,
      apiUrlKey,
      customApiUrl,
      endpointPath,
      currentItemsPerPage, // itemsPerPage 대신 currentItemsPerPage
      sorting,
      processApiResponse,
      dataMapping,
      apiParams,
      columns.length,
      detectColumnsFromData,
      setDetectedColumns,
      onColumnsDetected,
    ]
  );

  const fetchMore = React.useCallback(
    async (nextCursor?: string) => {
      if (!isAsync || !apiUrlKey || !endpointPath) {
        return {
          items: [] as T[],
          nextCursor: undefined as string | undefined,
        };
      }

      // 중복 호출 방지
      if (isFetchingRef.current) {
        console.log("⏸️ Fetch already in progress, skipping...");
        return {
          items: [] as T[],
          nextCursor: undefined as string | undefined,
        };
      }

      // Custom URL을 사용하는 경우와 일반 API 서비스를 사용하는 경우 구분
      const isCustomUrl = apiUrlKey === "CUSTOM";

      const service = !isCustomUrl
        ? (apiConfig[apiUrlKey as keyof typeof apiConfig] as (
          endpoint: string,
          params: Record<string, unknown>
        ) => Promise<T[]>)
        : null;

      isFetchingRef.current = true;
      setLoading(true);

      try {
        const page = nextCursor ? parseInt(nextCursor, 10) : 1;
        const sort = sorting[0]
          ? { sortBy: sorting[0].id, desc: sorting[0].desc }
          : undefined;

        const params = {
          page,
          limit: currentItemsPerPage, // itemsPerPage 대신 currentItemsPerPage
          ...sort,
        };

        let response: T[] | Record<string, unknown>;

        if (isCustomUrl && customApiUrl) {
          // Custom URL 직접 fetch
          const fullUrl = `${customApiUrl}${endpointPath}`;
          const queryParams = new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          ).toString();
          const urlWithParams = queryParams ? `${fullUrl}?${queryParams}` : fullUrl;

          console.log("🌐 Custom API 호출 (fetchMore):", urlWithParams);
          const res = await fetch(urlWithParams);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          response = await res.json();
        } else if (service) {
          response = await service(endpointPath, params);
        } else {
          throw new Error("API 서비스가 설정되지 않음");
        }

        console.log("📦 API 응답 (fetchMore):", {
          responseType: Array.isArray(response) ? 'Array' : typeof response,
          responseLength: Array.isArray(response) ? response.length : 'N/A',
          dataMapping,
        });

        // 데이터 매핑 적용
        const { items } = processApiResponse(response, dataMapping);

        console.log("📊 processApiResponse 결과 (fetchMore):", {
          itemsLength: items.length,
          firstItem: items[0],
        });

        // 컬럼이 제공되지 않았고 데이터가 있으면 자동 감지
        if (columns.length === 0 && items.length > 0) {
          const detected = detectColumnsFromData(items);
          setDetectedColumns(detected);
          console.log("🔍 자동 감지된 컬럼 (fetchMore):", detected);

          // 부모 컴포넌트에 자동 감지된 컬럼 전달
          if (onColumnsDetected) {
            onColumnsDetected(detected);
          }
        } else {
          console.log("⚠️ 자동 감지 조건 미충족 (fetchMore):", {
            columnsLength: columns.length,
            itemsLength: items.length,
          });
        }

        if (!items || items.length === 0) {
          return { items: [], nextCursor: undefined };
        }
        const next =
          items.length === currentItemsPerPage ? String(page + 1) : undefined; // itemsPerPage 대신 currentItemsPerPage
        return { items, nextCursor: next };
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [
      isAsync,
      apiUrlKey,
      customApiUrl,
      endpointPath,
      currentItemsPerPage, // itemsPerPage 대신 currentItemsPerPage
      sorting,
      processApiResponse,
      dataMapping,
      columns.length,
      detectColumnsFromData,
      setDetectedColumns,
      onColumnsDetected,
    ]
  );

  // ---------- 초기/리로드 ----------
  const containerRef = React.useRef<HTMLDivElement>(null);
  const initialLoadRef = React.useRef(false);
  const prevModeRef = React.useRef<PaginationMode>(mode);
  const prevApiConfigRef = React.useRef({ apiUrlKey, customApiUrl, endpointPath, isAsync });
  const prevStaticDataRef = React.useRef(staticData);

  // Static 데이터 변경 감지 - 데이터 소스가 변경되면 detectedColumns 초기화
  React.useEffect(() => {
    if (prevStaticDataRef.current !== staticData) {
      prevStaticDataRef.current = staticData;
      setDetectedColumns([]);
      console.log("🔄 Static 데이터 변경 감지 - 자동 감지 컬럼 초기화");
    }
  }, [staticData]);

  React.useEffect(() => {
    // 모드 변경 또는 API 설정 변경 감지
    const modeChanged = prevModeRef.current !== mode;
    const apiConfigChanged =
      prevApiConfigRef.current.apiUrlKey !== apiUrlKey ||
      prevApiConfigRef.current.customApiUrl !== customApiUrl ||
      prevApiConfigRef.current.endpointPath !== endpointPath ||
      prevApiConfigRef.current.isAsync !== isAsync;

    if (modeChanged || apiConfigChanged) {
      // 상태 초기화
      initialLoadRef.current = false;
      prevModeRef.current = mode;
      prevApiConfigRef.current = { apiUrlKey, customApiUrl, endpointPath, isAsync };

      // 기존 데이터 초기화
      setPageRows([]);
      setFlatRows([]);
      setPageIndex(0);
      setPageCount(null);
      setCursor(undefined);
      setHasNext(true);

      // 자동 감지된 컬럼도 초기화 (데이터 소스 변경 시 새로 감지)
      setDetectedColumns([]);
      console.log("🔄 데이터 소스 변경 감지 - 자동 감지 컬럼 초기화");
    }

    // isAsync가 false면 API 호출하지 않음
    if (!isAsync) {
      console.log("⏭️ isAsync=false, API 호출 건너뛰기");
      return;
    }

    // API 설정이 완전하지 않으면 API 호출하지 않음
    if (!apiUrlKey || !endpointPath || endpointPath.trim().length === 0) {
      console.log("⏭️ API 설정 불완전, API 호출 건너뛰기:", { apiUrlKey, endpointPath });
      return;
    }

    // 초기 로드 중복 방지 (React Strict Mode 대응)
    if (initialLoadRef.current) {
      console.log(
        "⏸️ Initial load already in progress, skipping duplicate effect"
      );
      return;
    }

    initialLoadRef.current = true;

    if (mode === "pagination") {
      (async () => {
        const { items, total } = await fetchPage(0);
        setPageRows(items);
        setPageIndex(0);
        setPageCount(Math.max(1, Math.ceil((total || 0) / currentItemsPerPage)));
        initialLoadRef.current = false;
      })();
    } else {
      (async () => {
        setFlatRows([]);
        setCursor(undefined);
        setHasNext(true);
        const { items, nextCursor } = await fetchMore("1");
        setFlatRows(items);
        setCursor(nextCursor);
        setHasNext(Boolean(nextCursor));

        // 초기 화면이 안 찼으면 한 번 더 (약간의 지연 후)
        if (containerRef.current && nextCursor) {
          setTimeout(() => {
            if (!containerRef.current) return;
            const el = containerRef.current;
            if (el.scrollHeight <= el.clientHeight + 10) {
              console.log("📥 Loading more to fill viewport: page 2");
              fetchMore(nextCursor).then((r) => {
                setFlatRows((prev) => [...prev, ...r.items]);
                setCursor(r.nextCursor);
                setHasNext(Boolean(r.nextCursor));
              });
            }
          }, 100);
        }
        initialLoadRef.current = false;
      })();
    }
    // fetchPage와 fetchMore는 의도적으로 의존성에서 제외 (초기 로드만 실행, 리렌더링 시 재실행 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAsync, mode, currentItemsPerPage, apiUrlKey, customApiUrl, endpointPath, enableAsyncLoading]);

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
        if ((av as number | string) < (bv as number | string))
          return s.desc ? 1 : -1;
        if ((av as number | string) > (bv as number | string))
          return s.desc ? -1 : 1;
        return 0;
      });
      return sorted;
    }

    // 클라이언트 사이드 페이지네이션 (Static/Supabase)
    if (!isAsync && mode === "pagination") {
      return clientPaginatedData;
    }

    // 서버 사이드 페이지네이션 (API)
    return mode === "pagination" ? pageRows : flatRows;
  }, [staticData, sorting, mode, pageRows, flatRows, isAsync, clientPaginatedData]);

  // ---------- React Table ----------
  const table = useReactTable({
    data,
    columns: columnDefsWithGroups,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: enableResize,
    columnResizeMode: "onChange",
    debugTable: process.env.NODE_ENV === "development",
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
      typeof window !== "undefined" &&
        navigator.userAgent.indexOf("Firefox") === -1
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
  const onScrollFetch = React.useCallback(
    (el?: HTMLDivElement | null) => {
      if (!isAsync || mode !== "infinite") return;
      if (!el || !hasNext || loading) return; // loading 체크로 중복 방지

      const { scrollHeight, scrollTop, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 500) {
        // 하단 500px 이내
        console.log("📥 Scroll triggered load");
        void (async () => {
          const next = cursor ?? "1";
          const { items, nextCursor } = await fetchMore(next);
          setFlatRows((prev) => [...prev, ...items]);
          setCursor(nextCursor);
          setHasNext(Boolean(nextCursor));
        })();
      }
    },
    [isAsync, mode, hasNext, cursor, loading, fetchMore]
  );

  // ---------- 렌더 ----------
  return (
    <>
      <div
        data-element-id={props["data-element-id"]}
        className={["react-aria-Table", className].filter(Boolean).join(" ")}
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
            height: calculatedHeight,
            overflow: "auto",
            position: "relative",
          }}
        >
          <table style={{ display: "grid" }}>
            {/* 헤더(Sticky) */}
            <thead
              className="react-aria-TableHeader react-aria-Resizable"
              role="rowgroup"
              data-element-id={tableHeaderElementId}
              style={{ display: "grid", position: "sticky", top: 0, zIndex: 1 }}
            >
              {table.getHeaderGroups().map((headerGroup) => {
                // Column Group과 개별 컬럼을 분리
                const groupHeaders = headerGroup.headers.filter((header) => {
                  const groupMeta = header.column.columnDef.meta as Record<
                    string,
                    unknown
                  >;
                  return groupMeta?.isGroupHeader === true;
                });

                const individualHeaders = headerGroup.headers.filter(
                  (header) => {
                    const groupMeta = header.column.columnDef.meta as Record<
                      string,
                      unknown
                    >;
                    return groupMeta?.isGroupHeader !== true;
                  }
                );

                return (
                  <React.Fragment key={headerGroup.id}>
                    {/* Column Group 행 */}
                    {groupHeaders.length > 0 && (
                      <tr
                        className="react-aria-Row column-group-row"
                        role="row"
                        style={{ display: "flex", width: "100%" }}
                      >
                        {groupHeaders.map((header, colIndex) => {
                          const groupMeta = header.column.columnDef
                            .meta as Record<string, unknown>;
                          const groupAlign =
                            (groupMeta?.align as string) || "center";
                          const groupVariant =
                            (groupMeta?.variant as string) || "default";
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
                                justifyContent:
                                  groupAlign === "center"
                                    ? "center"
                                    : groupAlign === "right"
                                      ? "flex-end"
                                      : "flex-start",
                                textAlign: groupAlign as
                                  | "left"
                                  | "center"
                                  | "right",
                                width: header.getSize(),
                                minWidth: header.getSize(),
                                backgroundColor:
                                  groupVariant === "primary"
                                    ? "#3b82f6"
                                    : groupVariant === "secondary"
                                      ? "#6b7280"
                                      : "#f8fafc",
                                color:
                                  groupVariant !== "default"
                                    ? "#ffffff"
                                    : "#374151",
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    )}

                    {/* 개별 컬럼 행 */}
                    {individualHeaders.length > 0 && (
                      <tr
                        className="react-aria-Row individual-column-row"
                        role="row"
                        style={{ display: "flex", width: "100%" }}
                      >
                        {individualHeaders.map((header, colIndex) => {
                          const columnDef = effectiveColumns.find(
                            (c) => String(c.key) === header.column.id
                          );
                          const align = columnDef?.align ?? "left";
                          const isSorted = header.column.getIsSorted();
                          const elementId = columnDef?.elementId;

                          return (
                            <th
                              key={header.id}
                              className="react-aria-Column individual-column"
                              role="columnheader"
                              data-element-id={elementId}
                              aria-colindex={colIndex + 1}
                              aria-sort={
                                isSorted === "asc"
                                  ? "ascending"
                                  : isSorted === "desc"
                                    ? "descending"
                                    : "none"
                              }
                              colSpan={header.colSpan}
                              style={{
                                justifyContent:
                                  align === "center"
                                    ? "center"
                                    : align === "right"
                                      ? "flex-end"
                                      : "flex-start",
                                textAlign: align as "left" | "center" | "right",
                                width: header.getSize(),
                                minWidth: header.getSize(),
                              }}
                            >
                              <div
                                className={`flex items-center gap-2 ${header.column.getCanSort()
                                  ? "cursor-pointer select-none hover:text-blue-600"
                                  : ""
                                  }`}
                                onClick={header.column.getToggleSortingHandler()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    header.column.toggleSorting();
                                  }
                                }}
                                tabIndex={0}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "inherit",
                                  gap: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: "inherit",
                                    fontSize: "inherit",
                                    lineHeight: "inherit",
                                  }}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                                {header.column.getIsSorted() === "asc" ? (
                                  <ChevronUp
                                    size={16}
                                    style={{ color: "#3b82f6" }}
                                  />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ChevronDown
                                    size={16}
                                    style={{ color: "#3b82f6" }}
                                  />
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
                display: "grid",
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
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
                      display: "flex",
                      position: "absolute",
                      transform: `translateY(${virtualRow.start}px)`,
                      width: "100%",
                    }}
                    tabIndex={0}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const align =
                        effectiveColumns.find((c) => String(c.key) === cell.column.id)
                          ?.align ?? "left";
                      return (
                        <td
                          key={cell.id}
                          className="react-aria-Cell"
                          role="gridcell"
                          aria-colindex={cellIndex + 1}
                          style={{
                            textAlign: align as "left" | "center" | "right",
                            width: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
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
      {shouldShowPagination && (
        (isAsync && pageCount !== null) ||
        (staticData && staticData.length > 0)
      ) && (
          <div className="react-aria-Pagination">
            {isAsync && pageCount !== null ? (
              // 서버 사이드 페이지네이션 (API)
              <>
                {/* 페이지 정보 */}
                <div className="react-aria-PageInfo">
                  {pageIndex * currentItemsPerPage + 1} to{" "}
                  {Math.min(
                    (pageIndex + 1) * currentItemsPerPage,
                    pageRows.length + pageIndex * currentItemsPerPage
                  )}{" "}
                  of {pageCount * currentItemsPerPage} entries
                </div>

                {/* 페이지 네비게이션 */}
                <div className="react-aria-PageNavigation">
                  <Button
                    onClick={async () => {
                      const { items, total } = await fetchPage(0, currentItemsPerPage);
                      setPageRows(items);
                      setPageIndex(0);
                      setPageCount(
                        Math.max(1, Math.ceil((total || 0) / currentItemsPerPage))
                      );
                    }}
                    isDisabled={pageIndex === 0 || loading}
                    className="react-aria-PageButton"
                    aria-label="First page"
                    size="sm"
                  >
                    <ChevronFirst size={16} />
                  </Button>

                  <Button
                    onClick={async () => {
                      const next = Math.max(0, pageIndex - 1);
                      const { items } = await fetchPage(next, currentItemsPerPage);
                      setPageRows(items);
                      setPageIndex(next);
                    }}
                    isDisabled={pageIndex === 0 || loading}
                    className="react-aria-PageButton"
                    aria-label="Previous page"
                    size="sm"
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  {/* 페이지 번호 표시 */}
                  <div className="react-aria-PageNumbers">
                    {(() => {
                      const totalPages = pageCount;
                      const currentPage = pageIndex + 1;
                      const maxVisible = 5;
                      let startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisible / 2)
                      );
                      const endPage = Math.min(
                        totalPages,
                        startPage + maxVisible - 1
                      );

                      if (endPage - startPage < maxVisible - 1) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }

                      const pages = [];
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            onClick={async () => {
                              const targetPage = i - 1;
                              const { items } = await fetchPage(
                                targetPage,
                                currentItemsPerPage
                              );
                              setPageRows(items);
                              setPageIndex(targetPage);
                            }}
                            isDisabled={loading}
                            className={`react-aria-PageButton ${i === currentPage ? "active" : ""
                              }`}
                            size="sm"
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                  </div>

                  <Button
                    onClick={async () => {
                      const next = Math.min((pageCount ?? 1) - 1, pageIndex + 1);
                      const { items } = await fetchPage(next, currentItemsPerPage);
                      setPageRows(items);
                      setPageIndex(next);
                    }}
                    isDisabled={
                      pageCount === 0 || pageIndex >= pageCount - 1 || loading
                    }
                    className="react-aria-PageButton"
                    aria-label="Next page"
                    size="sm"
                  >
                    <ChevronRight size={16} />
                  </Button>

                  <Button
                    onClick={async () => {
                      const next = (pageCount ?? 1) - 1;
                      const { items } = await fetchPage(next, currentItemsPerPage);
                      setPageRows(items);
                      setPageIndex(next);
                    }}
                    isDisabled={
                      pageCount === 0 || pageIndex >= pageCount - 1 || loading
                    }
                    className="react-aria-PageButton"
                    aria-label="Last page"
                    size="sm"
                  >
                    <ChevronLast size={16} />
                  </Button>
                </div>

                {/* Go to page */}
                <div className="react-aria-GoToPage">
                  <label
                    htmlFor="go-to-page-input"
                    className="react-aria-GoToPageLabel"
                  >
                    Go to:
                  </label>
                  <input
                    id="go-to-page-input"
                    type="number"
                    min="1"
                    max={pageCount}
                    value={pageIndex + 1}
                    onChange={(e) => {
                      const targetPage = Math.max(
                        1,
                        Math.min(pageCount, Number(e.target.value))
                      );
                      setPageIndex(targetPage - 1);
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const targetPage = Math.max(
                          1,
                          Math.min(pageCount, Number(e.currentTarget.value))
                        );
                        const { items } = await fetchPage(
                          targetPage - 1,
                          currentItemsPerPage
                        );
                        setPageRows(items);
                        setPageIndex(targetPage - 1);
                      }
                    }}
                    disabled={loading}
                    className="react-aria-GoToPageInput"
                  />
                  <Button
                    onClick={async () => {
                      const targetPage = Math.max(
                        1,
                        Math.min(pageCount, pageIndex + 1)
                      );
                      const { items } = await fetchPage(targetPage - 1, currentItemsPerPage);
                      setPageRows(items);
                      setPageIndex(targetPage - 1);
                    }}
                    isDisabled={loading}
                    className="react-aria-GoToPageButton"
                    size="sm"
                  >
                    <ChevronLast size={16} />
                  </Button>
                </div>

                {/* 페이지 크기 선택 */}
                <div className="react-aria-PageSizeSelector">
                  <Select
                    id="page-size-select"
                    selectedKey={currentItemsPerPage.toString()}
                    onSelectionChange={async (key) => {
                      const newPageSize = Number(key);
                      setCurrentItemsPerPage(newPageSize); // 내부 상태 업데이트
                      const { items, total } = await fetchPage(0, newPageSize);
                      setPageRows(items);
                      setPageIndex(0);
                      setPageCount(
                        Math.max(1, Math.ceil((total || 0) / newPageSize))
                      );
                      // 부모 컴포넌트에 페이지당 항목 수 변경 알림
                      if (onItemsPerPageChange) {
                        onItemsPerPageChange(newPageSize);
                      }
                    }}
                    isDisabled={loading}
                    className="react-aria-PageSizeSelect"
                    items={[
                      { value: 5, label: "5" },
                      { value: 10, label: "10" },
                      { value: 20, label: "20" },
                      { value: 50, label: "50" },
                      { value: 100, label: "100" },
                    ]}
                  >
                    {(item) => (
                      <SelectItem key={item.value} id={item.value.toString()}>
                        {item.label}
                      </SelectItem>
                    )}
                  </Select>
                </div>

                {loading && <span className="react-aria-LoadingText">Loading…</span>}
              </>
            ) : staticData ? (
              // 클라이언트 사이드 페이지네이션 (Static/Supabase)
              <>
                {/* 페이지 정보 */}
                <div className="react-aria-PageInfo">
                  {clientPageIndex * currentItemsPerPage + 1} to{" "}
                  {Math.min(
                    (clientPageIndex + 1) * currentItemsPerPage,
                    staticData.length
                  )}{" "}
                  of {staticData.length} entries
                </div>

                {/* 페이지 네비게이션 */}
                <div className="react-aria-PageNavigation">
                  <Button
                    onClick={() => setClientPageIndex(0)}
                    isDisabled={clientPageIndex === 0}
                    className="react-aria-PageButton"
                    aria-label="First page"
                    size="sm"
                  >
                    <ChevronFirst size={16} />
                  </Button>

                  <Button
                    onClick={() => setClientPageIndex(Math.max(0, clientPageIndex - 1))}
                    isDisabled={clientPageIndex === 0}
                    className="react-aria-PageButton"
                    aria-label="Previous page"
                    size="sm"
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  {/* 페이지 번호 표시 */}
                  <div className="react-aria-PageNumbers">
                    {(() => {
                      const totalPages = clientTotalPages;
                      const currentPage = clientPageIndex + 1;
                      const maxVisible = 5;
                      let startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisible / 2)
                      );
                      const endPage = Math.min(
                        totalPages,
                        startPage + maxVisible - 1
                      );

                      if (endPage - startPage < maxVisible - 1) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }

                      const pages = [];
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            onClick={() => setClientPageIndex(i - 1)}
                            className={`react-aria-PageButton ${i === currentPage ? "active" : ""
                              }`}
                            size="sm"
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                  </div>

                  <Button
                    onClick={() => setClientPageIndex(Math.min(clientTotalPages - 1, clientPageIndex + 1))}
                    isDisabled={clientPageIndex >= clientTotalPages - 1}
                    className="react-aria-PageButton"
                    aria-label="Next page"
                    size="sm"
                  >
                    <ChevronRight size={16} />
                  </Button>

                  <Button
                    onClick={() => setClientPageIndex(clientTotalPages - 1)}
                    isDisabled={clientPageIndex >= clientTotalPages - 1}
                    className="react-aria-PageButton"
                    aria-label="Last page"
                    size="sm"
                  >
                    <ChevronLast size={16} />
                  </Button>
                </div>

                {/* Go to page */}
                <div className="react-aria-GoToPage">
                  <label
                    htmlFor="go-to-page-input"
                    className="react-aria-GoToPageLabel"
                  >
                    Go to:
                  </label>
                  <input
                    id="go-to-page-input"
                    type="number"
                    min="1"
                    max={clientTotalPages}
                    value={clientPageIndex + 1}
                    onChange={(e) => {
                      const targetPage = Math.max(
                        1,
                        Math.min(clientTotalPages, Number(e.target.value))
                      );
                      setClientPageIndex(targetPage - 1);
                    }}
                    className="react-aria-GoToPageInput"
                  />
                </div>

                {/* 페이지 크기 선택 */}
                <div className="react-aria-PageSizeSelector">
                  <Select
                    id="page-size-select"
                    selectedKey={currentItemsPerPage.toString()}
                    onSelectionChange={(key) => {
                      const newPageSize = Number(key);
                      setCurrentItemsPerPage(newPageSize);
                      setClientPageIndex(0);
                      // 부모 컴포넌트에 페이지당 항목 수 변경 알림
                      if (onItemsPerPageChange) {
                        onItemsPerPageChange(newPageSize);
                      }
                    }}
                    className="react-aria-PageSizeSelect"
                    items={[
                      { value: 5, label: "5" },
                      { value: 10, label: "10" },
                      { value: 20, label: "20" },
                      { value: 50, label: "50" },
                      { value: 100, label: "100" },
                    ]}
                  >
                    {(item) => (
                      <SelectItem key={item.value} id={item.value.toString()}>
                        {item.label}
                      </SelectItem>
                    )}
                  </Select>
                </div>
              </>
            ) : null}
          </div>
        )}
    </>
  );
});
