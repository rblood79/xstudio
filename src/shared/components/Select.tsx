/**
 * Select Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import React from "react";
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
  composeRenderProps,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import type {
  SelectVariant,
  ComponentSize,
} from "../../types/componentVariants";
import type {
  DataBinding,
  ColumnMapping,
} from "../../types/builder/unified.types";
import type { DataBindingValue } from "../../builder/panels/common/PropertyDataBinding";
import { useCollectionData } from "../../builder/hooks/useCollectionData";
import { Skeleton } from "./Skeleton";
import "./styles/Select.css";

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children" | "selectionMode"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
  placeholder?: string;
  itemKey?: keyof T | ((item: T) => React.Key);
  dataBinding?: DataBinding | DataBindingValue;
  columnMapping?: ColumnMapping;
  // M3 props
  variant?: SelectVariant;
  size?: ComponentSize;
  /**
   * React Aria 1.13.0: 선택 모드
   * @default 'single'
   */
  selectionMode?: "single" | "multiple";
  /**
   * 다중 선택 시 표시 형식
   * - 'count': "3개 선택됨"
   * - 'list': "항목1, 항목2, 항목3"
   * - 'custom': renderMultipleValue 사용
   * @default 'count'
   */
  multipleDisplayMode?: "count" | "list" | "custom";
  /**
   * 다중 선택 시 커스텀 렌더러
   */
  renderMultipleValue?: (selectedItems: T[]) => React.ReactNode;
  /**
   * Show loading skeleton instead of select
   * @default false
   */
  isLoading?: boolean;
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  placeholder,
  dataBinding,
  columnMapping,
  variant = "primary",
  size = "md",
  selectionMode = "single",
  multipleDisplayMode = "count",
  renderMultipleValue,
  isLoading: externalLoading,
  ...props
}: SelectProps<T>) {
  // useCollectionData Hook - 항상 최상단에서 호출 (Rules of Hooks)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: "Select",
    fallbackData: [
      { id: 1, name: "Option 1", value: "option-1" },
      { id: 2, name: "Option 2", value: "option-2" },
    ],
  });

  // Label 및 ARIA 처리
  const hasVisibleLabel = label && String(label).trim();
  const ariaLabel = hasVisibleLabel
    ? undefined
    : props["aria-label"] || placeholder || "Select an option";

  // DataBinding이 있고 데이터가 로드되었을 때 동적 아이템 생성
  // PropertyDataBinding 형식 (source, name) 또는 DataBinding 형식 (type: "collection") 둘 다 지원
  const isPropertyBinding =
    dataBinding &&
    "source" in dataBinding &&
    "name" in dataBinding &&
    !("type" in dataBinding);
  const hasDataBinding =
    (!isPropertyBinding &&
      dataBinding &&
      "type" in dataBinding &&
      dataBinding.type === "collection") ||
    isPropertyBinding;

  // Prepare items for rendering
  const selectItems = React.useMemo(() => {
    if (!hasDataBinding || loading || error) {
      return items;
    }

    if (columnMapping && boundData.length > 0) {
      return boundData.map((item, index) => ({
        id: String(item.id || index),
        ...item,
      })) as Iterable<T>;
    }

    if (boundData.length > 0) {
      const config = (dataBinding as { config?: Record<string, unknown> })
        ?.config as
        | {
            columnMapping?: {
              id: string;
              label: string;
            };
            dataMapping?: {
              idField: string;
              labelField: string;
            };
          }
        | undefined;

      const idField =
        config?.columnMapping?.id || config?.dataMapping?.idField || "id";
      const labelField =
        config?.columnMapping?.label ||
        config?.dataMapping?.labelField ||
        "label";

      return boundData.map((item, index) => ({
        id: String(item[idField] || item.id || index),
        label: String(
          item[labelField] || item.label || item.name || `Item ${index + 1}`
        ),
        ...item,
      })) as Iterable<T>;
    }

    return items;
  }, [
    hasDataBinding,
    loading,
    error,
    boundData,
    columnMapping,
    dataBinding,
    items,
  ]);

  // 다중 선택 모드일 때 선택된 값 표시 로직
  const renderMultipleSelectValue = React.useCallback(
    (
      selectedKeys: React.Key[] | "all" | null,
      selectedItems: Iterable<T> | null
    ) => {
      if (
        selectionMode !== "multiple" ||
        !selectedKeys ||
        selectedKeys === "all" ||
        (Array.isArray(selectedKeys) && selectedKeys.length === 0)
      ) {
        return null;
      }

      const selectedItemsArray = selectedItems ? Array.from(selectedItems) : [];
      const keyCount = Array.isArray(selectedKeys) ? selectedKeys.length : 0;

      if (keyCount === 0) {
        return null;
      }

      switch (multipleDisplayMode) {
        case "count":
          return `${keyCount}개 선택됨`;
        case "list": {
          const labels = selectedItemsArray
            .map((item) => {
              const itemRecord = item as Record<string, unknown>;
              return String(
                itemRecord.label || itemRecord.name || itemRecord.id || ""
              );
            })
            .filter(Boolean);
          return labels.length > 0 ? labels.join(", ") : `${keyCount}개 선택됨`;
        }
        case "custom":
          return renderMultipleValue
            ? renderMultipleValue(selectedItemsArray)
            : `${keyCount}개 선택됨`;
        default:
          return `${keyCount}개 선택됨`;
      }
    },
    [selectionMode, multipleDisplayMode, renderMultipleValue]
  );

  // Render ListBox content based on state - memoized to prevent unnecessary re-renders
  const listBoxContent: React.ReactNode | ((item: T) => React.ReactNode) =
    React.useMemo(() => {
      // Loading state
      if (hasDataBinding && loading) {
        return (
          <ListBoxItem
            key="loading"
            textValue="Loading"
            className="react-aria-ListBoxItem"
          >
            ⏳ 데이터 로딩 중...
          </ListBoxItem>
        );
      }

      // Error state
      if (hasDataBinding && error) {
        return (
          <ListBoxItem
            key="error"
            textValue="Error"
            className="react-aria-ListBoxItem"
          >
            ❌ 오류: {error}
          </ListBoxItem>
        );
      }

      // ColumnMapping mode with children (Field-based rendering)
      if (hasDataBinding && columnMapping && boundData.length > 0) {
        return children;
      }

      // Dynamic collection without columnMapping
      if (hasDataBinding && !columnMapping && boundData.length > 0) {
        return ((item: Record<string, unknown>) => {
          const itemId =
            item.id !== undefined && item.id !== null
              ? String(item.id)
              : undefined;
          const itemLabel =
            item.label !== undefined && item.label !== null
              ? String(item.label)
              : undefined;

          return (
            <ListBoxItem
              key={itemId}
              id={itemId}
              textValue={itemLabel}
              className="react-aria-ListBoxItem"
            >
              {itemLabel}
            </ListBoxItem>
          );
        }) as (item: T) => React.ReactNode;
      }

      // Static children
      return children;
    }, [hasDataBinding, loading, error, columnMapping, boundData, children]);

  // Single unified return structure - prevents popover remounting
  if (externalLoading) {
    return (
      <Skeleton
        componentVariant="input"
        size={size}
        className={props.className as string}
        aria-label="Loading select..."
      />
    );
  }

  return (
    <AriaSelect
      {...props}
      data-variant={variant}
      data-size={size}
      className={composeRenderProps(
        props.className,
        (cls) => cls ? `react-aria-Select ${cls}` : "react-aria-Select"
      )}
      aria-label={ariaLabel}
      placeholder={placeholder}
      isDisabled={hasDataBinding && (loading || !!error)}
      data-selection-mode={selectionMode}
    >
      {(renderProps) => (
        <>
          {hasVisibleLabel && (
            <Label className="react-aria-Label">{String(label)}</Label>
          )}

          <Button className="react-aria-Button">
            <SelectValue />
            <span aria-hidden="true" className="select-chevron">
              <ChevronDown size={16} />
            </span>
          </Button>

          {description && String(description).trim() && (
            <Text slot="description" className="react-aria-Description">
              {String(description)}
            </Text>
          )}

          {/* Show loading message */}
          {hasDataBinding && loading && (
            <Text slot="description" className="react-aria-Description">
              ⏳ 데이터 로딩 중...
            </Text>
          )}

          {/* Show error message */}
          {hasDataBinding && error && (
            <FieldError className="react-aria-FieldError">
              ❌ 오류: {error}
            </FieldError>
          )}

          {/* Show validation error */}
          {errorMessage && !error && (
            <FieldError className="react-aria-FieldError">
              {typeof errorMessage === "function"
                ? errorMessage({ isInvalid: true } as ValidationResult)
                : String(errorMessage)}
            </FieldError>
          )}

          <Popover
            className="react-aria-Popover"
            placement="bottom start"
            offset={4}
          >
            <ListBox
              items={selectItems}
              className="react-aria-ListBox"
              selectionMode={selectionMode}
            >
              {listBoxContent}
            </ListBox>
          </Popover>
        </>
      )}
    </AriaSelect>
  );
}

export { Select as MySelect };

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
