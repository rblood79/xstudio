import { useAsyncList } from "react-stately";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { DataBinding } from "../../types/builder/unified.types";
import type { AsyncListLoadOptions } from "../../types/builder/stately.types";
import { useDatasetStore } from "../stores/dataset";
import { useDataTables, useApiEndpoints, useDataStore } from "../stores/data";
import { useRuntimeStore } from "../../canvas/store/runtimeStore";
import { collectionDataCache, createCacheKey } from "./useCollectionDataCache";

/**
 * Collection 데이터 바인딩을 위한 공통 Hook
 *
 * React Stately의 useAsyncList를 사용하여 비동기 데이터 로딩을 자동화합니다.
 * Static, API, Supabase 데이터 소스를 통합 처리합니다.
 * Select, ListBox, Menu, Tree 등 Collection 컴포넌트에서 공통으로 사용됩니다.
 *
 * Dataset 지원:
 * - datasetId가 있으면 Dataset Store에서 데이터를 가져옵니다.
 * - dataBinding이 있으면 직접 데이터를 로드합니다.
 * - 둘 다 있으면 datasetId가 우선합니다.
 */

export interface UseCollectionDataOptions {
  /** 데이터 바인딩 설정 */
  dataBinding?: DataBinding;
  /** 컴포넌트 이름 (디버깅용) */
  componentName: string;
  /** Mock API 실패 시 사용할 기본 데이터 */
  fallbackData?: Record<string, unknown>[];
  /** Dataset ID (dataBinding 대신 사용) */
  datasetId?: string;
  /** 컴포넌트 ID (Dataset consumer 등록용) */
  elementId?: string;
}

/** DataTable 스키마 필드 타입 */
export interface SchemaField {
  key: string;
  type: string;
  label?: string;
}

export interface UseCollectionDataResult {
  /** 가져온 데이터 배열 */
  data: Record<string, unknown>[];
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 메시지 (없으면 null) */
  error: string | null;
  /** 데이터 재로드 */
  reload: () => void;
  /** 캐시 삭제 (이 바인딩의 캐시만 삭제) */
  clearCache: () => void;
  /** DataTable 스키마 정보 (Field 자동 생성용) */
  schema?: SchemaField[];
  /** 정렬 함수 */
  sort?: (descriptor: {
    column: string;
    direction: "ascending" | "descending";
  }) => void;
  /** 필터 텍스트 */
  filterText?: string;
  /** 필터 텍스트 설정 */
  setFilterText?: (text: string) => void;
  /** 더 많은 데이터 로드 (페이지네이션) */
  loadMore?: () => void;
  /** 더 로드할 데이터가 있는지 여부 */
  hasMore?: boolean;
}

/**
 * Static 데이터 로드 함수
 */
async function loadStaticData(
  dataBinding: DataBinding,
  componentName: string
): Promise<Record<string, unknown>[]> {
  console.log(`📋 ${componentName} Static 데이터 바인딩:`, dataBinding);

  const staticConfig = dataBinding.config as { data?: unknown[] };
  const staticData = staticConfig.data;

  if (staticData && Array.isArray(staticData)) {
    console.log(`✅ ${componentName} Static 데이터 설정:`, staticData);
    return staticData as Record<string, unknown>[];
  } else {
    console.warn(`⚠️ ${componentName} Static 데이터가 배열이 아님 또는 없음`);
    throw new Error("Static data is not an array or is missing");
  }
}

/**
 * API 데이터 로드 함수
 */
async function loadApiData(
  dataBinding: DataBinding,
  componentName: string,
  fallbackData: Record<string, unknown>[],
  signal: AbortSignal
): Promise<Record<string, unknown>[]> {
  const config = dataBinding.config as {
    baseUrl?: string;
    customUrl?: string;
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    dataMapping?: {
      resultPath?: string;
      idKey?: string;
      totalKey?: string;
    };
  };

  if (!config.baseUrl || !config.endpoint) {
    console.warn(`⚠️ ${componentName}: API 설정 불완전`);
    throw new Error("API configuration is incomplete");
  }

  console.log(`🌐 ${componentName} API 호출:`, {
    baseUrl: config.baseUrl,
    endpoint: config.endpoint,
    params: config.params,
  });

  // MOCK_DATA 특별 처리
  if (config.baseUrl === "MOCK_DATA") {
    console.log(`🎭 ${componentName} MOCK_DATA 모드 - Mock API 호출`);

    try {
      const { apiConfig } = await import("../../services/api");
      const mockFetch = apiConfig.MOCK_DATA;

      if (mockFetch) {
        const responseData = await mockFetch(
          config.endpoint || "/data",
          config.params
        );

        // resultPath가 있으면 해당 경로의 데이터 추출
        const resultData = config.dataMapping?.resultPath
          ? (responseData as Record<string, unknown>)[
              config.dataMapping.resultPath
            ]
          : responseData;

        const finalData = Array.isArray(resultData)
          ? (resultData as Record<string, unknown>[])
          : [];

        console.log(
          `✅ ${componentName} Mock API 데이터 로드 완료:`,
          finalData.length,
          "items"
        );
        return finalData;
      } else {
        throw new Error("Mock API function not found");
      }
    } catch (err) {
      console.error(`${componentName} Mock API 오류:`, err);
      // Fallback 데이터 사용
      if (fallbackData.length > 0) {
        console.log(`🔄 ${componentName} Fallback 데이터 사용`);
        return fallbackData;
      }
      throw err;
    }
  }

  // Base URL 매핑 (APICollectionEditor와 동일한 매핑)
  let resolvedBaseUrl = config.baseUrl || "";
  switch (config.baseUrl) {
    case "JSONPLACEHOLDER":
      resolvedBaseUrl = "https://jsonplaceholder.typicode.com";
      break;
    case "DUMMYJSON":
      resolvedBaseUrl = "https://dummyjson.com";
      break;
    case "CUSTOM":
      resolvedBaseUrl = config.customUrl || "";
      break;
    // MOCK_DATA는 위에서 이미 처리됨
  }

  const fullUrl = `${resolvedBaseUrl}${config.endpoint}`;
  console.log(`🌐 ${componentName} API 호출 URL:`, fullUrl);

  // 실제 REST API 호출
  const response = await fetch(fullUrl, {
    method: config.method || "GET",
    headers: {
      ...config.headers,
      "Content-Type": "application/json",
    },
    body: config.method !== "GET" ? JSON.stringify(config.params) : undefined,
    signal, // AbortController signal 전달
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseData = await response.json();

  // resultPath가 있으면 해당 경로의 데이터 추출
  const resultData = config.dataMapping?.resultPath
    ? responseData[config.dataMapping.resultPath]
    : responseData;

  const finalData = Array.isArray(resultData)
    ? (resultData as Record<string, unknown>[])
    : [];

  console.log(
    `✅ ${componentName} API 데이터 로드 완료:`,
    finalData.length,
    "items"
  );
  return finalData;
}

/**
 * Collection 데이터 바인딩 Hook
 *
 * React Stately의 useAsyncList를 사용하여 비동기 데이터 로딩, 에러 처리, cleanup을 자동화합니다.
 *
 * @example
 * ```typescript
 * const { data, loading, error, reload } = useCollectionData({
 *   dataBinding: {
 *     type: "collection",
 *     source: "api",
 *     config: {
 *       baseUrl: "MOCK_DATA",
 *       endpoint: "/users",
 *       dataMapping: { resultPath: "data" }
 *     }
 *   },
 *   componentName: "ListBox",
 *   fallbackData: [{ id: 1, name: "Default" }]
 * });
 * ```
 */
export function useCollectionData({
  dataBinding,
  componentName,
  fallbackData = [],
  datasetId,
  elementId,
}: UseCollectionDataOptions): UseCollectionDataResult {
  // Dataset Store 접근
  const datasetState = useDatasetStore((state) =>
    datasetId ? state.datasetStates.get(datasetId) : undefined
  );
  const addConsumer = useDatasetStore((state) => state.addConsumer);
  const removeConsumer = useDatasetStore((state) => state.removeConsumer);
  const loadDataset = useDatasetStore((state) => state.loadDataset);

  // Canvas 컨텍스트 감지 (iframe 내부인지 확인)
  const isCanvasContext = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.parent !== window;
  }, []);

  // DataTable Store 접근 (PropertyDataBinding 형식 지원)
  // Canvas에서는 runtime store, Builder에서는 builder store 사용
  const builderDataTables = useDataTables();
  const canvasDataTables = useRuntimeStore((state) => state.dataTables);
  const dataTables = isCanvasContext ? canvasDataTables : builderDataTables;

  // ApiEndpoint Store 접근 (PropertyDataBinding 형식 지원)
  // Canvas에서는 runtime store, Builder에서는 builder store 사용
  const builderApiEndpoints = useApiEndpoints();
  const canvasApiEndpoints = useRuntimeStore((state) => state.apiEndpoints);
  const apiEndpoints = isCanvasContext ? canvasApiEndpoints : builderApiEndpoints;
  const executeApiEndpoint = useDataStore((state) => state.executeApiEndpoint);

  // Dataset consumer 등록/해제
  useEffect(() => {
    if (datasetId && elementId) {
      addConsumer(datasetId, elementId);

      // Dataset이 아직 로드되지 않았으면 로드
      if (!datasetState || datasetState.status === "idle") {
        loadDataset(datasetId);
      }

      return () => {
        removeConsumer(datasetId, elementId);
      };
    }
  }, [datasetId, elementId, addConsumer, removeConsumer, loadDataset, datasetState]);

  // 정렬 상태
  const [sortDescriptor, setSortDescriptor] = useState<{
    column: string;
    direction: "ascending" | "descending";
  } | null>(null);

  // 필터 상태
  const [filterText, setFilterText] = useState<string>("");

  // ⭐ dataBinding 안정화: 참조 변경 방지 (리렌더링 시 불필요한 재계산 방지)
  const dataBindingRef = useRef(dataBinding);
  const dataBindingKey = useMemo(() => {
    if (!dataBinding) return '';
    // JSON 직렬화로 내용 기반 키 생성
    try {
      return JSON.stringify(dataBinding);
    } catch {
      return String(dataBinding);
    }
  }, [dataBinding]);

  // 내용이 변경된 경우에만 ref 업데이트
  useEffect(() => {
    dataBindingRef.current = dataBinding;
  }, [dataBindingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 안정화된 dataBinding 사용
  const stableDataBinding = dataBindingRef.current;

  // PropertyDataBinding 형식 감지 (source: 'dataTable', name: 'xxx')
  const propertyBindingFormat = stableDataBinding &&
    'source' in stableDataBinding &&
    'name' in stableDataBinding &&
    !('type' in stableDataBinding);

  // Auto-refresh 설정 추출
  const refreshMode = useMemo(() => {
    if (propertyBindingFormat) {
      const binding = stableDataBinding as unknown as { refreshMode?: string };
      return binding.refreshMode || 'manual';
    }
    return 'manual';
  }, [propertyBindingFormat, stableDataBinding]);

  const refreshInterval = useMemo(() => {
    if (propertyBindingFormat) {
      const binding = stableDataBinding as unknown as { refreshInterval?: number };
      return binding.refreshInterval || 5000;
    }
    return 5000;
  }, [propertyBindingFormat, stableDataBinding]);

  // DataTable 바인딩인 경우 mockData와 schema 직접 반환
  const dataTableResult = useMemo(() => {
    // 🔍 DEBUG: 상세 로깅
    console.log(`🔍 [${componentName}] useCollectionData 실행:`, {
      isCanvasContext,
      propertyBindingFormat,
      dataTablesCount: dataTables.length,
      dataTablesNames: dataTables.map(dt => dt.name),
      stableDataBinding,
    });

    if (propertyBindingFormat) {
      const binding = stableDataBinding as unknown as { source: string; name: string };
      if (binding.source === 'dataTable' && binding.name) {
        console.log(`🔍 [${componentName}] DataTable 바인딩 검색: "${binding.name}"`);
        const table = dataTables.find(dt => dt.name === binding.name);
        if (table) {
          const data = table.useMockData ? table.mockData : (table.runtimeData || table.mockData);
          console.log(`✅ [${componentName}] DataTable 찾음:`, {
            name: table.name,
            useMockData: table.useMockData,
            mockDataCount: table.mockData?.length || 0,
            runtimeDataCount: table.runtimeData?.length || 0,
            resolvedDataCount: data?.length || 0,
          });
          // schema를 SchemaField 형식으로 변환
          const schema: SchemaField[] = (table.schema || []).map(field => ({
            key: field.key,
            type: field.type,
            label: field.label,
          }));
          return { data, schema };
        } else {
          console.warn(`⚠️ ${componentName}: DataTable '${binding.name}'을 찾을 수 없습니다`);
          console.warn(`⚠️ [${componentName}] 사용 가능한 DataTables:`, dataTables.map(dt => dt.name));
        }
      }
    }
    return null;
  }, [propertyBindingFormat, dataBindingKey, dataTables, componentName, isCanvasContext]);

  // 하위 호환성을 위해 dataTableData 유지
  const dataTableData = dataTableResult?.data || null;
  const dataTableSchema = dataTableResult?.schema;

  // API Endpoint 바인딩 상태
  const [apiEndpointData, setApiEndpointData] = useState<Record<string, unknown>[] | null>(null);
  const [apiEndpointLoading, setApiEndpointLoading] = useState(false);
  const [apiEndpointError, setApiEndpointError] = useState<string | null>(null);
  // 재로드 트리거 (값이 바뀌면 useEffect 재실행)
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // API Endpoint 바인딩인 경우 데이터 로드 (캐시 지원)
  useEffect(() => {
    if (!propertyBindingFormat) return;

    const binding = stableDataBinding as unknown as { source: string; name: string };
    if (binding.source !== 'api' || !binding.name) return;

    // API Endpoint 찾기
    const endpoint = apiEndpoints.find(ep => ep.name === binding.name);
    if (!endpoint) {
      console.warn(`⚠️ ${componentName}: API Endpoint '${binding.name}'을 찾을 수 없습니다`);
      setApiEndpointError(`API Endpoint '${binding.name}'을 찾을 수 없습니다`);
      return;
    }

    // ⭐ 캐시 키 생성
    const cacheKey = createCacheKey(stableDataBinding);

    // ⭐ reloadTrigger가 0이면 캐시 확인 (수동 재로드 시에는 캐시 스킵)
    if (reloadTrigger === 0 && cacheKey) {
      const cachedData = collectionDataCache.get<Record<string, unknown>[]>(cacheKey);
      if (cachedData) {
        console.log(`✅ ${componentName}: 캐시에서 데이터 로드`);
        setApiEndpointData(cachedData);
        setApiEndpointLoading(false);
        setApiEndpointError(null);
        return;
      }
    }

    console.log(`🌐 ${componentName}: API Endpoint '${binding.name}' 데이터 로드 시작 [isCanvas: ${isCanvasContext}]`, endpoint);
    setApiEndpointLoading(true);
    setApiEndpointError(null);

    // Canvas에서는 직접 API 호출, Builder에서는 executeApiEndpoint 사용
    const fetchData = async () => {
      try {
        let result: unknown;

        if (isCanvasContext) {
          // Canvas에서 직접 API 호출 (proxy 경유)
          const url = `${endpoint.baseUrl}${endpoint.path}`;
          console.log(`🌐 ${componentName}: Canvas에서 직접 API 호출: ${url}`);

          // CORS bypass를 위해 proxy 사용
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl, {
            method: endpoint.method || 'GET',
            headers: endpoint.headers || {},
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          result = await response.json();
        } else {
          // Builder에서 executeApiEndpoint 사용
          result = await executeApiEndpoint(endpoint.id);
        }

        console.log(`✅ ${componentName}: API Endpoint '${binding.name}' 데이터 로드 완료`, result);

        // 결과가 배열인지 확인
        let items: Record<string, unknown>[] = [];
        if (Array.isArray(result)) {
          items = result as Record<string, unknown>[];
        } else if (result && typeof result === 'object') {
          // 결과가 객체이고 results/data 필드가 있으면 사용
          const resultObj = result as Record<string, unknown>;
          if (Array.isArray(resultObj.results)) {
            items = resultObj.results as Record<string, unknown>[];
          } else if (Array.isArray(resultObj.data)) {
            items = resultObj.data as Record<string, unknown>[];
          } else if (Array.isArray(resultObj.items)) {
            items = resultObj.items as Record<string, unknown>[];
          } else {
            // 단일 객체를 배열로 변환
            items = [resultObj];
          }
        }

        // ⭐ 캐시에 저장
        if (cacheKey) {
          collectionDataCache.set(cacheKey, items);
        }

        setApiEndpointData(items);
        setApiEndpointLoading(false);
      } catch (error) {
        console.error(`❌ ${componentName}: API Endpoint '${binding.name}' 데이터 로드 실패`, error);
        setApiEndpointError((error as Error).message || '데이터 로드 실패');
        setApiEndpointLoading(false);
      }
    };

    fetchData();
  }, [propertyBindingFormat, dataBindingKey, apiEndpoints, executeApiEndpoint, componentName, isCanvasContext, reloadTrigger, stableDataBinding]);

  const list = useAsyncList<Record<string, unknown>>({
    async load({ signal }: AsyncListLoadOptions) {
      // DataTable 바인딩인 경우 useAsyncList 스킵 (이미 dataTableData에서 처리)
      if (propertyBindingFormat) {
        return { items: [] };
      }

      // datasetId가 있으면 Dataset Store에서 데이터 사용 (useAsyncList 스킵)
      if (datasetId) {
        return { items: [] };
      }

      // dataBinding이 없으면 빈 배열 반환
      if (!dataBinding || dataBinding.type !== "collection") {
        return { items: [] };
      }

      try {
        let items: Record<string, unknown>[] = [];

        // Static Collection 처리
        if (dataBinding.source === "static") {
          items = await loadStaticData(dataBinding, componentName);
        }
        // API Collection 처리
        else if (dataBinding.source === "api") {
          items = await loadApiData(
            dataBinding,
            componentName,
            fallbackData,
            signal
          );
        }
        // Supabase Collection 처리 (향후 구현)
        else if (dataBinding.source === "supabase") {
          console.warn(
            `⚠️ ${componentName}: Supabase 데이터 바인딩은 아직 구현되지 않았습니다`
          );
          throw new Error("Supabase data binding not yet implemented");
        }
        // 알 수 없는 소스
        else {
          console.warn(
            `⚠️ ${componentName}: 알 수 없는 데이터 소스:`,
            dataBinding.source
          );
          throw new Error(`Unknown data source: ${dataBinding.source}`);
        }

        return { items };
      } catch (error) {
        // AbortError는 무시 (컴포넌트 언마운트 시)
        if ((error as Error).name === "AbortError") {
          console.log(`🚫 ${componentName} 데이터 로딩이 취소되었습니다`);
          return { items: [] };
        }
        // 다른 에러는 그대로 throw하여 error state에 저장
        throw error;
      }
    },
    getKey: (item) => String(item.id || Math.random()),
  });

  // 정렬 함수
  const sort = useCallback(
    (descriptor: { column: string; direction: "ascending" | "descending" }) => {
      setSortDescriptor(descriptor);
      console.log(`🔄 ${componentName} 정렬:`, descriptor);
    },
    [componentName]
  );

  // 필터링 및 정렬된 데이터
  const processedData = useMemo(() => {
    // 데이터 소스 우선순위: DataTable > API Endpoint > Dataset > AsyncList
    let sourceData: Record<string, unknown>[];

    if (dataTableData && dataTableData.length > 0) {
      // PropertyDataBinding 형식의 DataTable 바인딩
      sourceData = dataTableData;
    } else if (apiEndpointData && apiEndpointData.length > 0) {
      // PropertyDataBinding 형식의 API Endpoint 바인딩
      sourceData = apiEndpointData;
    } else if (datasetId && datasetState) {
      // Dataset Store에서 데이터 사용
      sourceData = datasetState.data;
    } else {
      // AsyncList에서 데이터 사용
      sourceData = list.items;
    }

    let result = [...sourceData];

    // 필터링 적용
    if (filterText.trim()) {
      const lowerFilterText = filterText.toLowerCase();
      result = result.filter((item) => {
        // 모든 필드에서 검색
        return Object.values(item).some((value) =>
          String(value).toLowerCase().includes(lowerFilterText)
        );
      });
    }

    // 정렬 적용
    if (sortDescriptor) {
      result.sort((a, b) => {
        const aVal = a[sortDescriptor.column] as string | number;
        const bVal = b[sortDescriptor.column] as string | number;

        let comparison = 0;
        if (aVal < bVal) {
          comparison = -1;
        } else if (aVal > bVal) {
          comparison = 1;
        }

        return sortDescriptor.direction === "descending"
          ? -comparison
          : comparison;
      });
    }

    return result;
  }, [list.items, filterText, sortDescriptor, datasetId, datasetState, dataTableData, apiEndpointData]);

  // 페이지네이션 지원 (향후 구현)
  // 현재는 API가 cursor를 반환하지 않으므로 loadMore는 undefined
  const loadMore = undefined; // API가 cursor 지원 시 list.loadMore 사용
  const hasMore = false; // API가 cursor 지원 시 true/false 판단

  // Dataset 사용 시 reload 함수 재정의
  const reload = useCallback(() => {
    if (datasetId) {
      loadDataset(datasetId);
    } else if (propertyBindingFormat) {
      // PropertyDataBinding API의 경우 수동 재로드
      const binding = stableDataBinding as unknown as { source: string; name: string };
      if (binding.source === 'api' && binding.name) {
        console.log(`🔄 ${componentName}: API Endpoint 재로드 트리거`);

        // ⭐ 캐시 무효화
        const cacheKey = createCacheKey(stableDataBinding);
        if (cacheKey) {
          collectionDataCache.invalidate(cacheKey);
        }

        // reloadTrigger를 증가시켜 useEffect 재실행
        setReloadTrigger((prev) => prev + 1);
      }
    } else {
      list.reload();
    }
  }, [datasetId, loadDataset, list, propertyBindingFormat, stableDataBinding, componentName]);

  // ⭐ Auto-refresh 기능
  // onMount: 마운트 시 1회 갱신
  // interval: 설정된 간격으로 자동 갱신
  useEffect(() => {
    // DataTable은 reactive하므로 별도 갱신 불필요, API만 처리
    const isApiBinding = propertyBindingFormat &&
      (stableDataBinding as unknown as { source: string }).source === 'api';

    if (!isApiBinding) return;

    // onMount 모드: 마운트 시 1회 실행 (이미 useEffect로 처리됨)
    if (refreshMode === 'onMount') {
      console.log(`🔄 ${componentName}: onMount 모드 - 마운트 시 자동 갱신`);
      // 이미 위의 useEffect에서 API 호출이 일어남
    }

    // interval 모드: 주기적 갱신
    if (refreshMode === 'interval' && refreshInterval > 0) {
      console.log(`⏰ ${componentName}: interval 모드 - ${refreshInterval}ms 간격으로 자동 갱신 시작`);

      const intervalId = setInterval(() => {
        console.log(`🔄 ${componentName}: 주기적 자동 갱신 실행`);
        reload();
      }, refreshInterval);

      return () => {
        console.log(`⏰ ${componentName}: interval 모드 정리`);
        clearInterval(intervalId);
      };
    }
  }, [refreshMode, refreshInterval, propertyBindingFormat, stableDataBinding, reload, componentName]);

  // 로딩/에러 상태: datasetId가 있으면 Dataset Store에서, 아니면 useAsyncList에서
  // 로딩/에러 상태: DataTable > API Endpoint > Dataset > AsyncList
  const isApiBinding = propertyBindingFormat &&
    (stableDataBinding as unknown as { source: string }).source === 'api';

  const loading = propertyBindingFormat
    ? (isApiBinding ? apiEndpointLoading : false)  // API는 비동기, DataTable은 동기
    : datasetId
      ? datasetState?.status === "loading"
      : list.isLoading;

  const error = propertyBindingFormat
    ? (isApiBinding
        ? apiEndpointError
        : (dataTableData === null && stableDataBinding ? `DataTable을 찾을 수 없습니다` : null))
    : datasetId
      ? datasetState?.error || null
      : list.error ? list.error.message : null;

  // ⭐ 캐시 삭제 함수
  const clearCache = useCallback(() => {
    const cacheKey = createCacheKey(stableDataBinding);
    if (cacheKey) {
      collectionDataCache.invalidate(cacheKey);
      console.log(`🧹 ${componentName}: 캐시 삭제됨`);
    }
  }, [stableDataBinding, componentName]);

  return {
    data: processedData,
    loading,
    error,
    reload,
    clearCache,
    schema: dataTableSchema,
    sort,
    filterText,
    setFilterText,
    loadMore,
    hasMore,
  };
}

// ⭐ 캐시 인스턴스 및 유틸리티 export (전역 캐시 관리용)
export { collectionDataCache, createCacheKey };
