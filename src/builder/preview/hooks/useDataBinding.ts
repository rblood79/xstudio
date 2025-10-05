import { useState, useEffect } from "react";
import type { Element } from "../../../types/unified";

interface APICollectionConfig {
  baseUrl: string;
  endpoint: string;
  method: string;
  params: Record<string, unknown>;
  headers: Record<string, string>;
  dataMapping: {
    resultPath: string;
    idKey: string;
    totalKey: string;
  };
}

interface DataBindingResult {
  data: Array<Record<string, unknown>>;
  loading: boolean;
  error: string | null;
}

/**
 * dataBinding 설정에 따라 데이터를 가져오는 훅
 */
export function useDataBinding(element: Element): DataBindingResult {
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const binding = element.dataBinding;

    // 데이터 바인딩이 없으면 스킵
    if (!binding) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    // API Collection 타입만 처리 (현재)
    if (binding.type === "collection" && binding.source === "api") {
      const config = binding.config as unknown as APICollectionConfig;

      // 필수 설정 확인
      if (!config.baseUrl || !config.endpoint) {
        console.warn("⚠️ API 설정 불완전:", {
          baseUrl: config.baseUrl,
          endpoint: config.endpoint,
        });
        return;
      }

      setLoading(true);
      setError(null);

      console.log("🌐 API 호출 시작:", {
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        method: config.method,
        params: config.params,
      });

      // API 호출
      const fetchData = async () => {
        try {
          // MOCK_DATA URL 매핑
          const apiUrls: Record<string, string> = {
            MOCK_DATA: "https://jsonplaceholder.typicode.com",
          };

          const baseUrl = apiUrls[config.baseUrl] || config.baseUrl;
          const url = new URL(config.endpoint, baseUrl);

          // Query params 추가
          if (config.params) {
            Object.entries(config.params).forEach(([key, value]) => {
              url.searchParams.append(key, String(value));
            });
          }

          console.log("📡 최종 URL:", url.toString());

          const response = await fetch(url.toString(), {
            method: config.method || "GET",
            headers: {
              "Content-Type": "application/json",
              ...config.headers,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const responseData = await response.json();
          console.log("✅ API 응답:", responseData);

          // dataMapping에 따라 데이터 추출
          const resultPath = config.dataMapping?.resultPath || "data";
          let items = responseData;

          // resultPath가 'data'가 아니고 실제 존재하면 해당 경로에서 추출
          if (resultPath && resultPath !== "data" && responseData[resultPath]) {
            items = responseData[resultPath];
          }

          // 배열이 아니면 배열로 감싸기
          if (!Array.isArray(items)) {
            items = [items];
          }

          console.log("📊 추출된 데이터:", items.length, "개");

          setData(items);
          setLoading(false);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("❌ API 호출 실패:", errorMessage);
          setError(errorMessage);
          setData([]);
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [element.dataBinding]);

  return { data, loading, error };
}
