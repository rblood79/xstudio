/**
 * RadioGroup Component
 *
 * A group of radio buttons for single selection
 * Based on React Aria Components RadioGroup
 */

import {
  FieldError,
  Label,
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  RadioGroupProps as AriaRadioGroupProps,
  Text,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { DataBindingValue } from '../../builder/panels/common/PropertyDataBinding';
import type { ComponentSizeSubset, RadioVariant } from '../../types/builder/componentVariants.types';
import { useCollectionData } from '../../builder/hooks/useCollectionData';

import './styles/RadioGroup.css';

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, 'children'> {
  children?: React.ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  // 데이터 바인딩
  dataBinding?: DataBinding | DataBindingValue;
  columnMapping?: ColumnMapping;
  /**
   * Visual variant for child Radio buttons
   * @default 'default'
   */
  variant?: RadioVariant;
  /**
   * Size for child Radio buttons
   * @default 'md'
   */
  size?: ComponentSizeSubset;
}

const radioGroupStyles = tv({
  base: 'react-aria-RadioGroup',
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

export function RadioGroup(
  {
    label,
    description,
    errorMessage,
    children,
    dataBinding,
    columnMapping,
    variant = 'default',
    size = 'md',
    ...props
  }: RadioGroupProps
) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: 'RadioGroup',
    fallbackData: [
      { id: 1, name: 'Option 1', value: 'option-1' },
      { id: 2, name: 'Option 2', value: 'option-2' },
    ],
  });

  // DataBinding이 있고 데이터가 로드되었을 때 동적 Radio 생성
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

  const radioGroupClassName = composeRenderProps(
    props.className,
    (className) => radioGroupStyles({ variant, size, className })
  );

  // ColumnMapping이 있으면 각 데이터 항목마다 Radio 렌더링
  // ListBox와 동일한 패턴
  if (hasDataBinding && columnMapping) {
    console.log('🎯 RadioGroup: columnMapping 감지 - 데이터로 Radio 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaRadioGroup
          {...props}
          className={radioGroupClassName}
          isDisabled
          data-radio-variant={variant}
          data-radio-size={size}
        >
          {label && <Label>{label}</Label>}
          <Text>⏳ 데이터 로딩 중...</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaRadioGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaRadioGroup
          {...props}
          className={radioGroupClassName}
          isDisabled
          data-radio-variant={variant}
          data-radio-size={size}
        >
          {label && <Label>{label}</Label>}
          <Text>❌ 오류: {error}</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaRadioGroup>
      );
    }

    // 데이터가 있을 때: children 템플릿 사용
    if (boundData.length > 0) {
      console.log('✅ RadioGroup with columnMapping - using children template');

      // children은 Radio 템플릿 (Field 자식 포함 가능)
      return (
        <AriaRadioGroup
          {...props}
          className={radioGroupClassName}
          data-radio-variant={variant}
          data-radio-size={size}
        >
          {label && <Label>{label}</Label>}
          {children}
          {description && <Text slot="description">{description}</Text>}
          <FieldError>{errorMessage}</FieldError>
        </AriaRadioGroup>
      );
    }

    // 데이터 없음
    return (
      <AriaRadioGroup
        {...props}
        className={radioGroupClassName}
        data-radio-variant={variant}
        data-radio-size={size}
      >
        {label && <Label>{label}</Label>}
        {children}
        {description && <Text slot="description">{description}</Text>}
        <FieldError>{errorMessage}</FieldError>
      </AriaRadioGroup>
    );
  }

  // Dynamic Collection: 동적으로 Radio 생성 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaRadioGroup
          {...props}
          className={radioGroupClassName}
          isDisabled
          data-radio-variant={variant}
          data-radio-size={size}
        >
          {label && <Label>{label}</Label>}
          <Text>⏳ 데이터 로딩 중...</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaRadioGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaRadioGroup
          {...props}
          className={radioGroupClassName}
          isDisabled
          data-radio-variant={variant}
          data-radio-size={size}
        >
          {label && <Label>{label}</Label>}
          <Text>❌ 오류: {error}</Text>
          {description && <Text slot="description">{description}</Text>}
        </AriaRadioGroup>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const radioItems = boundData.map((item, index) => ({
        id: String(item.id || index),
        value: String(item.value || item.id || index),
        label: String(
          item.name || item.title || item.label || `Option ${index + 1}`
        ),
        isDisabled: Boolean(item.isDisabled),
      }));

      console.log('✅ RadioGroup Dynamic Collection - items:', radioItems);

      return (
        <AriaRadioGroup
          {...props}
          className={radioGroupClassName}
          data-radio-variant={variant}
          data-radio-size={size}
        >
          {label && <Label>{label}</Label>}
          {radioItems.map((item) => (
            <AriaRadio
              key={item.id}
              value={item.value}
              isDisabled={item.isDisabled}
              className='react-aria-Radio'
            >
              {item.label}
            </AriaRadio>
          ))}
          {description && <Text slot="description">{description}</Text>}
          <FieldError>{errorMessage}</FieldError>
        </AriaRadioGroup>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <AriaRadioGroup
      {...props}
      className={radioGroupClassName}
      data-radio-variant={variant}
      data-radio-size={size}
    >
      {label && <Label>{label}</Label>}
      {children}
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}
