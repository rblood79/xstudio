import { useState, useEffect } from "react";
import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
} from "react-aria-components";
import type { DataBinding } from "../../types/unified";
import { apiConfig } from "../../services/api";

import "./components.css";

interface ExtendedListBoxProps<T extends object> extends ListBoxProps<T> {
  dataBinding?: DataBinding;
}

export function ListBox<T extends object>({
  children,
  dataBinding,
  ...props
}: ExtendedListBoxProps<T>) {
  const [apiData, setApiData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // API Collection 데이터 바인딩 처리
    if (dataBinding?.type === "collection" && dataBinding.source === "api") {
      const config = dataBinding.config as {
        baseUrl: string;
        customUrl?: string;
        endpoint: string;
        method: string;
        params: Record<string, unknown>;
        headers: Record<string, string>;
        dataMapping: {
          resultPath: string;
          idKey: string;
          totalKey: string;
        };
      };

      if (!config.baseUrl || !config.endpoint) {
        console.warn("⚠️ ListBox: API 설정 불완전");
        return;
      }

      setLoading(true);
      setError(null);

      console.log("🌐 ListBox API 호출:", {
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        params: config.params,
      });

      const fetchData = async () => {
        try {
          // Mock API 시스템 통합
          const useMockApi = config.baseUrl === "MOCK_DATA";

          if (useMockApi) {
            // 자체 Mock API 시스템 사용 (정적 import)
            const mockFetcher = apiConfig[config.baseUrl];

            if (mockFetcher) {
              const result = await mockFetcher(config.endpoint, config.params);
              const items = Array.isArray(result) ? result : [result];

              console.log("✅ Mock API 응답:", items.length, "개");
              console.log("📋 첫 번째 아이템:", items[0]); // 데이터 구조 확인
              setApiData(items);
              setLoading(false);
              return;
            }
          }

          // 외부 API 호출 (JSONPlaceholder 등)
          const apiUrls: Record<string, string> = {
            JSONPLACEHOLDER: "https://jsonplaceholder.typicode.com",
            CUSTOM: config.customUrl || "", // Custom URL 지원
          };

          const baseUrl = apiUrls[config.baseUrl] || config.baseUrl;

          // JSONPlaceholder는 underscore prefix 사용: _limit, _page
          const isJSONPlaceholder = baseUrl.includes(
            "jsonplaceholder.typicode.com"
          );
          const url = new URL(config.endpoint, baseUrl);

          if (config.params) {
            Object.entries(config.params).forEach(([key, value]) => {
              // JSONPlaceholder API인 경우 파라미터 이름 변환
              const paramKey =
                isJSONPlaceholder && (key === "limit" || key === "page")
                  ? `_${key}` // limit → _limit, page → _page
                  : key;
              url.searchParams.append(paramKey, String(value));
            });
          }

          console.log("📡 ListBox 최종 URL:", url.toString());

          const response = await fetch(url.toString(), {
            method: config.method || "GET",
            headers: {
              "Content-Type": "application/json",
              ...config.headers,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const responseData = await response.json();
          console.log("✅ ListBox API 응답:", responseData);

          const resultPath = config.dataMapping?.resultPath || "data";
          let items = responseData;

          if (resultPath && resultPath !== "data" && responseData[resultPath]) {
            items = responseData[resultPath];
          }

          if (!Array.isArray(items)) {
            items = [items];
          }

          console.log("📊 ListBox 데이터:", items.length, "개");

          setApiData(items);
          setLoading(false);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("❌ ListBox API 실패:", errorMessage);
          setError(errorMessage);
          setApiData([]);
          setLoading(false);
        }
      };

      fetchData();
    } else {
      // 데이터 바인딩이 없으면 초기화
      setApiData([]);
      setLoading(false);
      setError(null);
    }
  }, [dataBinding]);

  return (
    <AriaListBox {...props} className="react-aria-ListBox">
      {loading && (
        <AriaListBoxItem
          key="loading"
          value={{}}
          isDisabled
          className="react-aria-ListBoxItem"
        >
          ⏳ 데이터 로딩 중...
        </AriaListBoxItem>
      )}
      {error && (
        <AriaListBoxItem
          key="error"
          value={{}}
          isDisabled
          className="react-aria-ListBoxItem"
        >
          ❌ 오류: {error}
        </AriaListBoxItem>
      )}
      {!loading &&
        !error &&
        apiData.length > 0 &&
        apiData.map((item, index) => (
          <AriaListBoxItem
            key={String(item.id || index)}
            value={{ id: item.id || index } as object}
            className="react-aria-ListBoxItem"
          >
            {String(
              item.name || item.title || item.label || `Item ${index + 1}`
            )}
          </AriaListBoxItem>
        ))}
      {!loading &&
        !error &&
        apiData.length === 0 &&
        (typeof children === "function" ? null : children)}
    </AriaListBox>
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
