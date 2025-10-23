import React, { useMemo, useState, useEffect } from "react";
import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxItemProps,
  Popover,
  Select as AriaSelect,
  SelectProps as AriaSelectProps,
  SelectValue,
  Text,
  ValidationResult,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import type { DataBinding } from "../../types/unified";
import "./styles/Select.css";

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
  placeholder?: string;
  itemKey?: keyof T | ((item: T) => React.Key);
  dataBinding?: DataBinding;
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  placeholder,
  dataBinding,
  ...props
}: SelectProps<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staticData, setStaticData] = useState<Record<string, unknown>[]>([]);
  const [apiData, setApiData] = useState<Record<string, unknown>[]>([]);

  // Static Collection 데이터 바인딩
  useEffect(() => {
    if (dataBinding?.type === "collection" && dataBinding.source === "static") {
      console.log("📋 Select Static 데이터 바인딩:", dataBinding);

      const staticConfig = dataBinding.config as { data?: unknown[] };
      const data = staticConfig.data;

      if (data && Array.isArray(data)) {
        console.log("✅ Select Static 데이터 설정:", data);
        setStaticData(data as Record<string, unknown>[]);
      } else {
        console.warn("⚠️ Select Static 데이터가 배열이 아님 또는 없음");
        setStaticData([]);
      }
    }
  }, [dataBinding]);

  // API Collection 데이터 바인딩
  useEffect(() => {
    const fetchData = async () => {
      if (dataBinding?.type === "collection" && dataBinding.source === "api") {
        const config = dataBinding.config as {
          baseUrl?: string;
          endpoint?: string;
          method?: string;
          headers?: Record<string, string>;
          params?: Record<string, unknown>;
          dataMapping: {
            resultPath?: string;
            idField: string;
            labelField: string;
          };
        };

        if (!config.baseUrl || !config.endpoint) {
          console.warn("⚠️ Select: API 설정 불완전");
          return;
        }

        setLoading(true);
        setError(null);

        console.log("🌐 Select API 호출:", {
          baseUrl: config.baseUrl,
          endpoint: config.endpoint,
        });

        try {
          // MOCK_DATA 특별 처리
          if (config.baseUrl === "MOCK_DATA") {
            console.log("🎭 Select MOCK_DATA 모드 - Mock API 호출");

            // Mock API를 실제 fetch처럼 호출
            try {
              const mockApiUrl = `MOCK_DATA${config.endpoint || "/status"}`;
              console.log("📡 Select Mock API 호출:", mockApiUrl);

              // apiConfig의 MOCK_DATA 함수 호출
              const { apiConfig } = await import("../../services/api");
              const mockFetch = apiConfig.MOCK_DATA;

              if (mockFetch) {
                const data = await mockFetch(
                  config.endpoint || "/status",
                  config.params
                );
                const resultData = config.dataMapping.resultPath
                  ? (data as any)[config.dataMapping.resultPath]
                  : data;

                setApiData(Array.isArray(resultData) ? resultData : []);
              }
            } catch (err) {
              console.error("Select Mock API 오류:", err);
              // Fallback: 기본 샘플 데이터
              const mockData = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                name: `Option ${i + 1}`,
                value: `option-${i + 1}`,
              }));
              setApiData(mockData);
            }

            setLoading(false);
            return;
          }

          // 일반 API 호출
          const response = await fetch(`${config.baseUrl}${config.endpoint}`, {
            method: config.method || "GET",
            headers: {
              ...config.headers,
              "Content-Type": "application/json",
            },
            body:
              config.method !== "GET"
                ? JSON.stringify(config.params)
                : undefined,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const resultData = config.dataMapping.resultPath
            ? data[config.dataMapping.resultPath]
            : data;

          setApiData(resultData);
        } catch (err) {
          console.error("Select API 호출 오류:", err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [dataBinding]);

  // ComboBox와 동일한 방식으로 placeholder 처리
  const stableProps = useMemo(() => {
    const processedPlaceholder = placeholder
      ? String(placeholder).trim()
      : undefined;
    return {
      label,
      description,
      errorMessage,
      placeholder: processedPlaceholder,
    };
  }, [label, description, errorMessage, placeholder]);

  const hasVisibleLabel = stableProps.label && String(stableProps.label).trim();
  const ariaLabel = hasVisibleLabel
    ? undefined
    : props["aria-label"] || stableProps.placeholder || "Select an option";

  // DataBinding이 있고 데이터가 로드되었을 때 동적 아이템 생성
  const hasDataBinding = dataBinding?.type === "collection";
  const boundData = dataBinding?.source === "static" ? staticData : apiData;

  // Dynamic Collection: items prop 사용
  if (hasDataBinding && !loading && !error && boundData.length > 0) {
    const config = dataBinding.config as {
      columnMapping?: {
        id: string;
        label: string;
      };
      dataMapping?: {
        idField: string;
        labelField: string;
      };
    };

    const idField =
      config.columnMapping?.id || config.dataMapping?.idField || "id";
    const labelField =
      config.columnMapping?.label || config.dataMapping?.labelField || "label";

    const selectItems = boundData.map((item, index) => ({
      id: String(item[idField] || item.id || index),
      label: String(
        item[labelField] || item.label || item.name || `Item ${index + 1}`
      ),
      ...item,
    }));

    console.log("✅ Select Dynamic Collection - items:", selectItems);

    return (
      <AriaSelect
        {...props}
        className="react-aria-Select"
        aria-label={ariaLabel}
        placeholder={stableProps.placeholder}
      >
        {hasVisibleLabel && (
          <Label className="react-aria-Label">
            {String(stableProps.label)}
          </Label>
        )}

        <Button className="react-aria-Button">
          <SelectValue />
          <span aria-hidden="true" className="select-chevron">
            <ChevronDown size={16} />
          </span>
        </Button>

        {stableProps.description && String(stableProps.description).trim() && (
          <Text slot="description" className="react-aria-Description">
            {String(stableProps.description)}
          </Text>
        )}

        {stableProps.errorMessage && (
          <FieldError className="react-aria-FieldError">
            {typeof stableProps.errorMessage === "function"
              ? stableProps.errorMessage({
                  isInvalid: true,
                } as ValidationResult)
              : String(stableProps.errorMessage)}
          </FieldError>
        )}

        <Popover className="react-aria-Popover">
          <ListBox
            items={selectItems}
            className="react-aria-ListBox"
            selectionMode="single"
          >
            {(item) => (
              <ListBoxItem
                key={item.id}
                id={item.id}
                textValue={item.label}
                className="react-aria-ListBoxItem"
              >
                {item.label}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </AriaSelect>
    );
  }

  // Loading 상태
  if (hasDataBinding && loading) {
    return (
      <AriaSelect
        {...props}
        className="react-aria-Select"
        aria-label={ariaLabel}
        placeholder={stableProps.placeholder}
        isDisabled
      >
        {hasVisibleLabel && (
          <Label className="react-aria-Label">
            {String(stableProps.label)}
          </Label>
        )}

        <Button className="react-aria-Button">
          <SelectValue />
          <span aria-hidden="true" className="select-chevron">
            <ChevronDown size={16} />
          </span>
        </Button>

        <Text slot="description" className="react-aria-Description">
          Loading...
        </Text>
      </AriaSelect>
    );
  }

  // Error 상태
  if (hasDataBinding && error) {
    return (
      <AriaSelect
        {...props}
        className="react-aria-Select"
        aria-label={ariaLabel}
        placeholder={stableProps.placeholder}
        isDisabled
      >
        {hasVisibleLabel && (
          <Label className="react-aria-Label">
            {String(stableProps.label)}
          </Label>
        )}

        <Button className="react-aria-Button">
          <SelectValue />
          <span aria-hidden="true" className="select-chevron">
            <ChevronDown size={16} />
          </span>
        </Button>

        <FieldError className="react-aria-FieldError">
          Error: {error}
        </FieldError>
      </AriaSelect>
    );
  }

  // Static Children (기존 방식)
  return (
    <AriaSelect
      {...props}
      className="react-aria-Select"
      aria-label={ariaLabel}
      placeholder={stableProps.placeholder}
    >
      {hasVisibleLabel && (
        <Label className="react-aria-Label">{String(stableProps.label)}</Label>
      )}

      <Button className="react-aria-Button">
        <SelectValue />
        <span aria-hidden="true" className="select-chevron">
          <ChevronDown size={16} />
        </span>
      </Button>

      {stableProps.description && String(stableProps.description).trim() && (
        <Text slot="description" className="react-aria-Description">
          {String(stableProps.description)}
        </Text>
      )}

      {stableProps.errorMessage && (
        <FieldError className="react-aria-FieldError">
          {typeof stableProps.errorMessage === "function"
            ? stableProps.errorMessage({ isInvalid: true } as ValidationResult)
            : String(stableProps.errorMessage)}
        </FieldError>
      )}

      <Popover className="react-aria-Popover">
        <ListBox
          items={items}
          className="react-aria-ListBox"
          selectionMode="single"
        >
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export { Select as MySelect };

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
