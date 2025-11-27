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
  composeRenderProps
} from "react-aria-components";
import { tv } from 'tailwind-variants';
import { ChevronDown } from "lucide-react";
import type { SelectVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from "../../types/builder/unified.types";
import { useCollectionData } from "../../builder/hooks/useCollectionData";
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
  columnMapping?: ColumnMapping;
  // M3 props
  variant?: SelectVariant;
  size?: ComponentSize;
}

const selectStyles = tv({
  base: 'react-aria-Select',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  placeholder,
  dataBinding,
  columnMapping,
  variant = 'primary',
  size = 'md',
  ...props
}: SelectProps<T>) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding,
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
  const hasDataBinding = dataBinding?.type === "collection";

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

      return boundData.map((item, index) => ({
        id: String(item[idField] || item.id || index),
        label: String(
          item[labelField] || item.label || item.name || `Item ${index + 1}`
        ),
        ...item,
      })) as Iterable<T>;
    }

    return items;
  }, [hasDataBinding, loading, error, boundData, columnMapping, dataBinding, items]);

  // Render ListBox content based on state - memoized to prevent unnecessary re-renders
  const listBoxContent: React.ReactNode | ((item: T) => React.ReactNode) = React.useMemo(() => {
    // Loading state
    if (hasDataBinding && loading) {
      return (
        <ListBoxItem key="loading" textValue="Loading" className="react-aria-ListBoxItem">
          ⏳ 데이터 로딩 중...
        </ListBoxItem>
      );
    }

    // Error state
    if (hasDataBinding && error) {
      return (
        <ListBoxItem key="error" textValue="Error" className="react-aria-ListBoxItem">
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
        const itemId = item.id !== undefined && item.id !== null ? String(item.id) : undefined;
        const itemLabel = item.label !== undefined && item.label !== null ? String(item.label) : undefined;

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
  return (
    <AriaSelect
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          return selectStyles({
            ...renderProps,
            variant,
            size,
            className,
          });
        }
      )}
      aria-label={ariaLabel}
      placeholder={placeholder}
      isDisabled={hasDataBinding && (loading || !!error)}
    >
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

      <Popover className="react-aria-Popover" placement="bottom start" offset={4}>
        <ListBox
          items={selectItems}
          className="react-aria-ListBox"
          selectionMode="single"
        >
          {listBoxContent}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export { Select as MySelect };

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
