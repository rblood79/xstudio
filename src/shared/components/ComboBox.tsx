/**
 * ComboBox Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import React from 'react';
import {
  Button,
  ComboBox as AriaComboBox,
  ComboBoxProps as AriaComboBoxProps,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxItemProps,
  Popover,
  Text,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { ChevronDown } from 'lucide-react';
import type { ComboBoxVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { DataBindingValue } from '../../builder/panels/common/PropertyDataBinding';
import { useCollectionData } from '../../builder/hooks/useCollectionData';
import { Skeleton } from './Skeleton';
import './styles/ComboBox.css';

export interface ComboBoxProps<T extends object>
  extends Omit<AriaComboBoxProps<T>, 'children'> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
  dataBinding?: DataBinding | DataBindingValue;
  columnMapping?: ColumnMapping;
  popoverClassName?: string;
  // M3 props
  variant?: ComboBoxVariant;
  size?: ComponentSize;
  /**
   * Show loading skeleton instead of combobox
   * @default false
   */
  isLoading?: boolean;
}

const comboBoxStyles = tv({
  base: 'react-aria-ComboBox',
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

export function ComboBox<T extends object>({
  label,
  description,
  errorMessage,
  children,
  placeholder,
  inputValue,
  onInputChange,
  dataBinding,
  columnMapping,
  popoverClassName,
  variant = 'primary',
  size = 'md',
  isLoading: externalLoading,
  ...props
}: ComboBoxProps<T>) {
  // useCollectionData Hook - 항상 최상단에서 호출 (Rules of Hooks)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: 'ComboBox',
    fallbackData: [
      { id: 1, name: 'Option 1', value: 'option-1' },
      { id: 2, name: 'Option 2', value: 'option-2' },
    ],
  });

  // External loading state (from isLoading prop) - show skeleton
  if (externalLoading) {
    return (
      <Skeleton
        componentVariant="input"
        size={size}
        className={props.className as string}
        aria-label="Loading combobox..."
      />
    );
  }

  // Label 처리
  const hasVisibleLabel = label && String(label).trim();
  const ariaLabel = hasVisibleLabel
    ? undefined
    : props['aria-label'] || placeholder || 'Select an option';

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

  // ComboBox className generator (reused across all conditional renders)
  const getComboBoxClassName = (baseClassName?: string) =>
    composeRenderProps(
      baseClassName,
      (className, renderProps) => {
        return comboBoxStyles({
          ...renderProps,
          variant,
          size,
          className,
        });
      }
    );

  // ColumnMapping이 있으면 각 데이터 항목마다 ListBoxItem 렌더링
  // ListBox와 동일한 패턴: Element tree의 ComboBoxItem 템플릿 + Field 자식 사용
  if (hasDataBinding && columnMapping) {
    console.log('🎯 ComboBox: columnMapping 감지 - 데이터로 아이템 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaComboBox
          {...props}
          className={getComboBoxClassName(props.className)}
          aria-label={ariaLabel}
          isDisabled
        >
          {hasVisibleLabel && <Label>{String(label)}</Label>}
          <div className="combobox-container">
            <Input placeholder={placeholder} />
            <Button>
              <ChevronDown size={16} />
            </Button>
          </div>
          {description && <Text slot="description">{description}</Text>}
          <Popover className={popoverClassName}>
            <ListBox className='react-aria-ListBox'>
              <ListBoxItem key="loading" textValue="Loading">
                ⏳ 데이터 로딩 중...
              </ListBoxItem>
            </ListBox>
          </Popover>
        </AriaComboBox>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaComboBox
          {...props}
          className={getComboBoxClassName(props.className)}
          aria-label={ariaLabel}
          isDisabled
        >
          {hasVisibleLabel && <Label>{String(label)}</Label>}
          <div className="combobox-container">
            <Input placeholder={placeholder} />
            <Button>
              <ChevronDown size={16} />
            </Button>
          </div>
          <FieldError>❌ 오류: {error}</FieldError>
          <Popover className={popoverClassName}>
            <ListBox className='react-aria-ListBox'>
              <ListBoxItem key="error" textValue="Error">
                ❌ 오류: {error}
              </ListBoxItem>
            </ListBox>
          </Popover>
        </AriaComboBox>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (boundData.length > 0) {
      const items = boundData.map((item, index) => ({
        id: String(item.id || index),
        ...item,
      })) as T[];

      console.log('✅ ComboBox with columnMapping - items:', items);

      return (
        <AriaComboBox
          {...props}
          inputValue={inputValue}
          onInputChange={onInputChange}
          className={getComboBoxClassName(props.className)}
          aria-label={ariaLabel}
        >
          {hasVisibleLabel && <Label>{String(label)}</Label>}
          <div className="combobox-container">
            <Input placeholder={placeholder} />
            <Button>
              <ChevronDown size={16} />
            </Button>
          </div>
          {description && <Text slot="description">{description}</Text>}
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
          <Popover className={popoverClassName}>
            <ListBox className='react-aria-ListBox' items={items}>
              {children}
            </ListBox>
          </Popover>
        </AriaComboBox>
      );
    }

    // 데이터 없음
    return (
      <AriaComboBox
        {...props}
        inputValue={inputValue}
        onInputChange={onInputChange}
        className={getComboBoxClassName(props.className)}
        aria-label={ariaLabel}
      >
        {hasVisibleLabel && <Label>{String(label)}</Label>}
        <div className="combobox-container">
          <Input placeholder={placeholder} />
          <Button>
            <ChevronDown size={16} />
          </Button>
        </div>
        {description && <Text slot="description">{description}</Text>}
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
        <Popover className={popoverClassName}>
          <ListBox className='react-aria-ListBox'>
            {children}
          </ListBox>
        </Popover>
      </AriaComboBox>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding && !loading && !error && boundData.length > 0) {
    const config = (dataBinding as { config?: Record<string, unknown> })?.config as {
      columnMapping?: {
        id: string;
        label: string;
      };
      dataMapping?: {
        idField: string;
        labelField: string;
      };
    } | undefined;

    const idField =
      config?.columnMapping?.id || config?.dataMapping?.idField || 'id';
    const labelField =
      config?.columnMapping?.label || config?.dataMapping?.labelField || 'label';

    const comboBoxItems = boundData.map((item, index) => ({
      id: String(item[idField] || item.id || index),
      label: String(
        item[labelField] || item.label || item.name || `Item ${index + 1}`
      ),
      ...item,
    }));

    console.log('✅ ComboBox Dynamic Collection - items:', comboBoxItems);

    return (
      <AriaComboBox
        {...props}
        inputValue={inputValue}
        onInputChange={onInputChange}
        className={getComboBoxClassName(props.className)}
        aria-label={ariaLabel}
      >
        {hasVisibleLabel && <Label>{String(label)}</Label>}
        <div className="combobox-container">
          <Input placeholder={placeholder} />
          <Button>
            <ChevronDown size={16} />
          </Button>
        </div>
        {description && <Text slot="description">{description}</Text>}
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
        <Popover className={popoverClassName}>
          <ListBox className='react-aria-ListBox' items={comboBoxItems}>
            {(item) => (
              <ListBoxItem
                key={item.id}
                id={item.id}
                textValue={item.label}
              >
                {item.label}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </AriaComboBox>
    );
  }

  // Loading 상태
  if (hasDataBinding && loading) {
    return (
      <AriaComboBox
        {...props}
        className={getComboBoxClassName(props.className)}
        aria-label={ariaLabel}
        isDisabled
      >
        {hasVisibleLabel && <Label>{String(label)}</Label>}
        <div className="combobox-container">
          <Input placeholder={placeholder} />
          <Button>
            <ChevronDown size={16} />
          </Button>
        </div>
        <Text slot="description">⏳ 데이터 로딩 중...</Text>
      </AriaComboBox>
    );
  }

  // Error 상태
  if (hasDataBinding && error) {
    return (
      <AriaComboBox
        {...props}
        className={getComboBoxClassName(props.className)}
        aria-label={ariaLabel}
        isDisabled
      >
        {hasVisibleLabel && <Label>{String(label)}</Label>}
        <div className="combobox-container">
          <Input placeholder={placeholder} />
          <Button>
            <ChevronDown size={16} />
          </Button>
        </div>
        <FieldError>❌ 오류: {error}</FieldError>
      </AriaComboBox>
    );
  }

  // Static Children (기존 방식)
  return (
    <AriaComboBox
      {...props}
      inputValue={inputValue}
      onInputChange={onInputChange}
      className={getComboBoxClassName(props.className)}
      aria-label={ariaLabel}
    >
      {hasVisibleLabel && <Label>{String(label)}</Label>}
      <div className="combobox-container">
        <Input placeholder={placeholder} />
        <Button>
          <ChevronDown size={16} />
        </Button>
      </div>
      {description && <Text slot="description">{description}</Text>}
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
      <Popover className={popoverClassName}>
        <ListBox className='react-aria-ListBox'>
          {children}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}

/**
 * ComboBoxItem Props
 * React Aria 1.13.0: onAction 지원으로 "Create new item" 패턴 구현 가능
 */
export interface ComboBoxItemProps extends ListBoxItemProps {
  /**
   * React Aria 1.13.0: 아이템 클릭 시 실행되는 액션
   * "Create" 옵션 구현에 유용 (예: 검색 결과 없을 때 새 항목 생성)
   * @example
   * <ComboBoxItem
   *   id="create-new"
   *   textValue="Create new item"
   *   onAction={() => handleCreateItem(inputValue)}
   * >
   *   + Create "{inputValue}"
   * </ComboBoxItem>
   */
  onAction?: () => void;
}

export function ComboBoxItem({ onAction, ...props }: ComboBoxItemProps) {
  return <ListBoxItem {...props} onAction={onAction} />;
}
