import { useState, useEffect, useMemo } from "react";
import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
} from "react-aria-components";
import type { DataBinding } from "../../types/unified";

import "./styles/ListBox.css";

interface ExtendedListBoxProps<T extends object> extends ListBoxProps<T> {
  dataBinding?: DataBinding;
}

export function ListBox<T extends object>({
  children,
  dataBinding,
  ...props
}: ExtendedListBoxProps<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<Record<string, unknown>[]>([]);

  // dataBinding을 JSON으로 직렬화하여 안정화 (무한 루프 방지)
  const dataBindingKey = useMemo(
    () => (dataBinding ? JSON.stringify(dataBinding) : null),
    [dataBinding]
  );

  useEffect(() => {
    // API Collection 데이터 바인딩 처리
    const fetchData = async () => {
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

        try {
          // MOCK_DATA 특별 처리
          if (config.baseUrl === "MOCK_DATA") {
            console.log("🎭 ListBox MOCK_DATA 모드 - Mock API 호출");

            // Mock API를 실제 fetch처럼 호출
            try {
              const mockApiUrl = `MOCK_DATA${config.endpoint || "/countries"}`;
              console.log("📡 ListBox Mock API 호출:", mockApiUrl);

              // apiConfig의 MOCK_DATA 함수 호출
              const { apiConfig } = await import("../../services/api");
              const mockFetch = apiConfig.MOCK_DATA;

              if (mockFetch) {
                const data = await mockFetch(
                  config.endpoint || "/countries",
                  config.params
                );
                const resultData = config.dataMapping.resultPath
                  ? (data as any)[config.dataMapping.resultPath]
                  : data;

                setApiData(Array.isArray(resultData) ? resultData : []);
              }
            } catch (err) {
              console.error("ListBox Mock API 오류:", err);
              // Fallback: 기본 샘플 데이터
              const mockData = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                name: `User ${i + 1}`,
                email: `user${i + 1}@example.com`,
                role: i % 2 === 0 ? "Admin" : "User",
              }));
              setApiData(mockData);
            }

            setLoading(false);
            return;
          }

          // 일반 API 호출
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

          const data = await response.json();
          const resultData = config.dataMapping.resultPath
            ? data[config.dataMapping.resultPath]
            : data;

          setApiData(resultData);
        } catch (err) {
          console.error("ListBox API 호출 오류:", err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
    // dataBinding 대신 dataBindingKey 사용 (객체 참조 비교 대신 JSON 문자열 비교)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBindingKey]);

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
