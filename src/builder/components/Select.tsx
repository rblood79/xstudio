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
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import type { DataBinding, ColumnMapping } from "../../types/unified";
import { useCollectionData } from "../hooks/useCollectionData";
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

  // ColumnMapping이 있으면 각 데이터 항목마다 SelectItem 렌더링
  // ListBox와 동일한 패턴: Element tree의 SelectItem 템플릿 + Field 자식 사용
  if (hasDataBinding && columnMapping) {
    console.log('🎯 Select: columnMapping 감지 - 데이터로 아이템 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaSelect
          {...props}
          className="react-aria-Select"
          aria-label={ariaLabel}
          placeholder={placeholder}
          isDisabled
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

          <Text slot="description" className="react-aria-Description">
            ⏳ 데이터 로딩 중...
          </Text>
        </AriaSelect>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaSelect
          {...props}
          className="react-aria-Select"
          aria-label={ariaLabel}
          placeholder={placeholder}
          isDisabled
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

          <FieldError className="react-aria-FieldError">
            ❌ 오류: {error}
          </FieldError>
        </AriaSelect>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (boundData.length > 0) {
      const selectItems = boundData.map((item, index) => ({
        id: String(item.id || index),
        ...item,
      })) as T[];

      console.log('✅ Select with columnMapping - items:', selectItems);

      return (
        <AriaSelect
          {...props}
          className="react-aria-Select"
          aria-label={ariaLabel}
          placeholder={placeholder}
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

          {errorMessage && (
            <FieldError className="react-aria-FieldError">
              {typeof errorMessage === "function"
                ? errorMessage({
                    isInvalid: true,
                  } as ValidationResult)
                : String(errorMessage)}
            </FieldError>
          )}

          <Popover className="react-aria-Popover">
            <ListBox
              items={selectItems}
              className="react-aria-ListBox"
              selectionMode="single"
            >
              {children}
            </ListBox>
          </Popover>
        </AriaSelect>
      );
    }

    // 데이터 없음
    return (
      <AriaSelect
        {...props}
        className="react-aria-Select"
        aria-label={ariaLabel}
        placeholder={placeholder}
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

        {errorMessage && (
          <FieldError className="react-aria-FieldError">
            {typeof errorMessage === "function"
              ? errorMessage({ isInvalid: true } as ValidationResult)
              : String(errorMessage)}
          </FieldError>
        )}

        <Popover className="react-aria-Popover">
          <ListBox className="react-aria-ListBox" selectionMode="single">
            {children}
          </ListBox>
        </Popover>
      </AriaSelect>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
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
        placeholder={placeholder}
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

        {errorMessage && (
          <FieldError className="react-aria-FieldError">
            {typeof errorMessage === "function"
              ? errorMessage({
                  isInvalid: true,
                } as ValidationResult)
              : String(errorMessage)}
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
        placeholder={placeholder}
        isDisabled
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
        placeholder={placeholder}
        isDisabled
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
      placeholder={placeholder}
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

      {errorMessage && (
        <FieldError className="react-aria-FieldError">
          {typeof errorMessage === "function"
            ? errorMessage({ isInvalid: true } as ValidationResult)
            : String(errorMessage)}
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
