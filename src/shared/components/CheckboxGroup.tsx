import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  CheckboxGroupProps as AriaCheckboxGroupProps,
  FieldError,
  Label,
  Text,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import { CheckIcon, Minus } from 'lucide-react';
import { tv } from 'tailwind-variants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { ComponentSizeSubset, CheckboxVariant } from '../../types/builder/componentVariants.types';
import { useCollectionData } from '../../builder/hooks/useCollectionData';

import './styles/CheckboxGroup.css';

export interface CheckboxGroupProps
  extends Omit<AriaCheckboxGroupProps, 'children'> {
  children?: React.ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  orientation?: 'horizontal' | 'vertical';
  // 데이터 바인딩
  dataBinding?: DataBinding;
  columnMapping?: ColumnMapping;
  /**
   * Visual variant for child Checkbox buttons
   * @default 'default'
   */
  variant?: CheckboxVariant;
  /**
   * Size for child Checkbox buttons
   * @default 'md'
   */
  size?: ComponentSizeSubset;
}

const checkboxGroupStyles = tv({
  base: 'react-aria-CheckboxGroup',
  variants: {
    variant: {
      default: '',
      primary: 'primary',
      secondary: 'secondary',
      surface: 'surface',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export function CheckboxGroup(
  {
    label,
    description,
    errorMessage,
    children,
    orientation = 'vertical',
    dataBinding,
    columnMapping,
    variant = 'default',
    size = 'md',
    ...props
  }: CheckboxGroupProps
) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding,
    componentName: 'CheckboxGroup',
    fallbackData: [
      { id: 1, name: 'Option 1', value: 'option-1' },
      { id: 2, name: 'Option 2', value: 'option-2' },
    ],
  });

  // DataBinding이 있고 데이터가 로드되었을 때 동적 Checkbox 생성
  const hasDataBinding = dataBinding?.type === 'collection';

  const checkboxGroupClassName = composeRenderProps(
    props.className,
    (className) => checkboxGroupStyles({ variant, size, className })
  );

  // ColumnMapping이 있으면 각 데이터 항목마다 Checkbox 렌더링
  // ListBox와 동일한 패턴
  if (hasDataBinding && columnMapping) {
    console.log('🎯 CheckboxGroup: columnMapping 감지 - 데이터로 Checkbox 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaCheckboxGroup
          {...props}
          className={checkboxGroupClassName}
          data-orientation={orientation}
          data-checkbox-variant={variant}
          data-checkbox-size={size}
          isDisabled
        >
          {label && <Label>{label}</Label>}
          <Text>⏳ 데이터 로딩 중...</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaCheckboxGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaCheckboxGroup
          {...props}
          className={checkboxGroupClassName}
          data-orientation={orientation}
          data-checkbox-variant={variant}
          data-checkbox-size={size}
          isDisabled
        >
          {label && <Label>{label}</Label>}
          <Text>❌ 오류: {error}</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaCheckboxGroup>
      );
    }

    // 데이터가 있을 때: children 템플릿 사용
    if (boundData.length > 0) {
      console.log('✅ CheckboxGroup with columnMapping - using children template');

      // children은 Checkbox 템플릿 (Field 자식 포함 가능)
      return (
        <AriaCheckboxGroup
          {...props}
          className={checkboxGroupClassName}
          data-orientation={orientation}
          data-checkbox-variant={variant}
          data-checkbox-size={size}
        >
          {label && <Label>{label}</Label>}
          {children}
          {description && <Text slot="description">{description}</Text>}
          <FieldError>{errorMessage}</FieldError>
        </AriaCheckboxGroup>
      );
    }

    // 데이터 없음
    return (
      <AriaCheckboxGroup
        {...props}
        className={checkboxGroupClassName}
        data-orientation={orientation}
        data-checkbox-variant={variant}
        data-checkbox-size={size}
      >
        {label && <Label>{label}</Label>}
        {children}
        {description && <Text slot="description">{description}</Text>}
        <FieldError>{errorMessage}</FieldError>
      </AriaCheckboxGroup>
    );
  }

  // Dynamic Collection: 동적으로 Checkbox 생성 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaCheckboxGroup
          {...props}
          className={checkboxGroupClassName}
          data-orientation={orientation}
          data-checkbox-variant={variant}
          data-checkbox-size={size}
          isDisabled
        >
          {label && <Label>{label}</Label>}
          <Text>⏳ 데이터 로딩 중...</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaCheckboxGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaCheckboxGroup
          {...props}
          className={checkboxGroupClassName}
          data-orientation={orientation}
          data-checkbox-variant={variant}
          data-checkbox-size={size}
          isDisabled
        >
          {label && <Label>{label}</Label>}
          <Text>❌ 오류: {error}</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaCheckboxGroup>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const checkboxItems = boundData.map((item, index) => ({
        id: String(item.id || index),
        value: String(item.value || item.id || index),
        label: String(
          item.name || item.title || item.label || `Option ${index + 1}`
        ),
        isDisabled: Boolean(item.isDisabled),
      }));

      console.log('✅ CheckboxGroup Dynamic Collection - items:', checkboxItems);

      return (
        <AriaCheckboxGroup
          {...props}
          className={checkboxGroupClassName}
          data-orientation={orientation}
          data-checkbox-variant={variant}
          data-checkbox-size={size}
        >
          {label && <Label>{label}</Label>}
          {checkboxItems.map((item) => (
            <AriaCheckbox
              key={item.id}
              value={item.value}
              isDisabled={item.isDisabled}
              className='react-aria-Checkbox'
            >
              {({ isSelected, isIndeterminate }) => (
                <>
                  <div className="checkbox">
                    {isIndeterminate ? <Minus size={16} strokeWidth={4} /> : isSelected && <CheckIcon size={16} strokeWidth={4} />}
                  </div>
                  {item.label}
                </>
              )}
            </AriaCheckbox>
          ))}
          {description && <Text slot="description">{description}</Text>}
          <FieldError>{errorMessage}</FieldError>
        </AriaCheckboxGroup>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <AriaCheckboxGroup
      {...props}
      className={checkboxGroupClassName}
      data-orientation={orientation}
      data-checkbox-variant={variant}
      data-checkbox-size={size}
    >
      {label && <Label>{label}</Label>}
      {children}
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaCheckboxGroup>
  );
}

export { CheckboxGroup as MyCheckboxGroup };
