import { useAsyncList } from "react-stately";
import { useMemo } from "react";
import type { DataBinding } from "../../types/unified";
import type { AsyncListLoadOptions } from "../../types/stately";

/**
 * Collection 데이터 바인딩을 위한 공통 Hook
 *
 * React Stately의 useAsyncList를 사용하여 비동기 데이터 로딩을 자동화합니다.
 * Static, API, Supabase 데이터 소스를 통합 처리합니다.
 * Select, ListBox, Menu, Tree 등 Collection 컴포넌트에서 공통으로 사용됩니다.
 */

export interface UseCollectionDataOptions {
  /** 데이터 바인딩 설정 */
  dataBinding?: DataBinding;
  /** 컴포넌트 이름 (디버깅용) */
  componentName: string;
  /** Mock API 실패 시 사용할 기본 데이터 */
  fallbackData?: Record<string, unknown>[];
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

  // 실제 REST API 호출
  const response = await fetch(
    `${config.baseUrl}${config.customUrl || config.endpoint}`,
    {
      method: config.method || "GET",
      headers: {
        ...config.headers,
        "Content-Type": "application/json",
      },
      body:
        config.method !== "GET" ? JSON.stringify(config.params) : undefined,
      signal, // AbortController signal 전달
    }
  );

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
}: UseCollectionDataOptions): UseCollectionDataResult {
  // dataBinding을 JSON으로 직렬화하여 안정화 (무한 루프 방지)
  const dataBindingKey = useMemo(
    () => (dataBinding ? JSON.stringify(dataBinding) : null),
    [dataBinding]
  );

  const list = useAsyncList<Record<string, unknown>>({
    async load({ signal }: AsyncListLoadOptions) {
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

  return {
    data: list.items,
    loading: list.isLoading,
    error: list.error ? list.error.message : null,
    reload: list.reload,
  };
}
