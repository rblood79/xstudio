import { useState, useEffect, useMemo } from "react";
import type { DataBinding } from "../../types/unified";

/**
 * Collection 데이터 바인딩을 위한 공통 Hook
 *
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
}

/**
 * Collection 데이터 바인딩 Hook
 *
 * @example
 * ```typescript
 * const { data, loading, error } = useCollectionData({
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
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dataBinding을 JSON으로 직렬화하여 안정화 (무한 루프 방지)
  const dataBindingKey = useMemo(
    () => (dataBinding ? JSON.stringify(dataBinding) : null),
    [dataBinding]
  );

  useEffect(() => {
    // dataBinding이 없으면 빈 배열 반환
    if (!dataBinding || dataBinding.type !== "collection") {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Static Collection 처리
    if (dataBinding.source === "static") {
      console.log(`📋 ${componentName} Static 데이터 바인딩:`, dataBinding);

      const staticConfig = dataBinding.config as { data?: unknown[] };
      const staticData = staticConfig.data;

      if (staticData && Array.isArray(staticData)) {
        console.log(`✅ ${componentName} Static 데이터 설정:`, staticData);
        setData(staticData as Record<string, unknown>[]);
        setError(null);
      } else {
        console.warn(`⚠️ ${componentName} Static 데이터가 배열이 아님 또는 없음`);
        setData([]);
        setError("Static data is not an array or is missing");
      }
      setLoading(false);
      return;
    }

    // API Collection 처리
    if (dataBinding.source === "api") {
      const fetchData = async () => {
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
          setError("API configuration is incomplete");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        console.log(`🌐 ${componentName} API 호출:`, {
          baseUrl: config.baseUrl,
          endpoint: config.endpoint,
          params: config.params,
        });

        try {
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
                setData(finalData);
              } else {
                throw new Error("Mock API function not found");
              }
            } catch (err) {
              console.error(`${componentName} Mock API 오류:`, err);
              // Fallback 데이터 사용
              if (fallbackData.length > 0) {
                console.log(`🔄 ${componentName} Fallback 데이터 사용`);
                setData(fallbackData);
              } else {
                setError(err instanceof Error ? err.message : String(err));
              }
            }

            setLoading(false);
            return;
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
                config.method !== "GET"
                  ? JSON.stringify(config.params)
                  : undefined,
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
          setData(finalData);
        } catch (err) {
          console.error(`${componentName} API 호출 오류:`, err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      return;
    }

    // Supabase Collection 처리 (향후 구현)
    if (dataBinding.source === "supabase") {
      console.warn(`⚠️ ${componentName}: Supabase 데이터 바인딩은 아직 구현되지 않았습니다`);
      setData([]);
      setLoading(false);
      setError("Supabase data binding not yet implemented");
      return;
    }

    // 알 수 없는 소스
    console.warn(`⚠️ ${componentName}: 알 수 없는 데이터 소스:`, dataBinding.source);
    setData([]);
    setLoading(false);
    setError(`Unknown data source: ${dataBinding.source}`);

    // dataBindingKey가 변경될 때만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBindingKey, componentName]);

  return { data, loading, error };
}
