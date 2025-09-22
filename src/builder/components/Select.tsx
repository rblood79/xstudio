import React, { useMemo } from 'react';
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
  ValidationResult
} from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import './components.css';

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, 'children'> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
  placeholder?: string;
  itemKey?: keyof T | ((item: T) => React.Key);
}

export function Select<T extends object>(
  { label, description, errorMessage, children, items, placeholder, itemKey, ...props }: SelectProps<T>
) {
  // ComboBox와 동일한 방식으로 placeholder 처리
  const stableProps = useMemo(() => {
    const processedPlaceholder = placeholder ? String(placeholder).trim() : undefined;
    return {
      label,
      description,
      errorMessage,
      placeholder: processedPlaceholder
    };
  }, [label, description, errorMessage, placeholder]);

  const hasVisibleLabel = stableProps.label && String(stableProps.label).trim();
  const ariaLabel = hasVisibleLabel
    ? undefined
    : (props['aria-label'] || stableProps.placeholder || 'Select an option');

  const getCollectionKey = useMemo(() => {
    if (itemKey) {
      if (typeof itemKey === 'function') {
        return itemKey;
      }
      return (item: T) => item[itemKey] as React.Key;
    }
    return undefined; // 기본 동작 사용 (item.id)
  }, [itemKey]);

  return (
    <AriaSelect
      {...props}
      className='react-aria-Select'
      aria-label={ariaLabel}
      // ComboBox처럼 placeholder를 AriaSelect에도 전달
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
          {typeof stableProps.errorMessage === 'function'
            ? stableProps.errorMessage({ isInvalid: true } as ValidationResult)
            : String(stableProps.errorMessage)}
        </FieldError>
      )}

      <Popover className="react-aria-Popover">
        <ListBox items={items} className='react-aria-ListBox' selectionMode="single" getKey={getCollectionKey}>
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
