/**
 * NumberField Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  Button,
  FieldError,
  Group,
  Input,
  Label,
  NumberField as AriaNumberField,
  NumberFieldProps as AriaNumberFieldProps,
  Text,
  ValidationResult,
  composeRenderProps
} from 'react-aria-components';
import type { NumberFieldVariant, ComponentSize } from '../../types/componentVariants';
import { Plus, Minus } from 'lucide-react';

import './styles/NumberField.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface NumberFieldProps extends AriaNumberFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /**
   * 로케일 (기본값: 'ko-KR')
   * @default 'ko-KR'
   */
  locale?: string;
  /**
   * 포맷 스타일
   * - decimal: 일반 숫자 (기본값)
   * - currency: 통화 (₩1,234, $1,234.56)
   * - percent: 퍼센트 (15.5%)
   * - unit: 단위 (10 km, 25°C)
   * @default 'decimal'
   */
  formatStyle?: 'decimal' | 'currency' | 'percent' | 'unit';
  /**
   * 통화 코드 (formatStyle이 'currency'일 때 사용)
   * @example 'KRW', 'USD', 'EUR', 'JPY'
   * @default 'KRW'
   */
  currency?: string;
  /**
   * 단위 (formatStyle이 'unit'일 때 사용)
   * @example 'kilometer', 'celsius', 'gram'
   */
  unit?: string;
  /**
   * 숫자 표기법
   * - standard: 일반 표기 (1,234)
   * - compact: 축약 표기 (1.2K)
   * @default 'standard'
   */
  notation?: 'standard' | 'compact';
  /**
   * 소수점 자릿수
   */
  decimals?: number;
  /**
   * 천 단위 구분자 표시 여부
   * @default true
   */
  showGroupSeparator?: boolean;
  // M3 props
  variant?: NumberFieldVariant;
  size?: ComponentSize;
}

export function NumberField({
  label,
  description,
  errorMessage,
  formatStyle = 'decimal',
  currency = 'KRW',
  unit,
  notation = 'standard',
  decimals,
  showGroupSeparator = true,
  variant = 'primary',
  size = 'md',
  ...props
}: NumberFieldProps) {
  // NumberFormatter 옵션 생성
  const formatOptions: Intl.NumberFormatOptions = {
    style: formatStyle,
    notation,
    useGrouping: showGroupSeparator,
  };

  // 통화 설정
  if (formatStyle === 'currency') {
    formatOptions.currency = currency;
    formatOptions.currencyDisplay = 'symbol';
  }

  // 단위 설정
  if (formatStyle === 'unit' && unit) {
    formatOptions.unit = unit;
    formatOptions.unitDisplay = 'short';
  }

  // 소수점 자릿수 설정
  if (decimals !== undefined) {
    formatOptions.minimumFractionDigits = decimals;
    formatOptions.maximumFractionDigits = decimals;
  }

  return (
    <AriaNumberField
      {...props}
      className={composeRenderProps(
        props.className,
        (className) => className ? `react-aria-NumberField ${className}` : 'react-aria-NumberField'
      )}
      data-variant={variant}
      data-size={size}
      formatOptions={formatOptions}
    >
      {label && <Label>{label}</Label>}
      <Group>
        <Button slot="decrement"><Minus size={16}/></Button>
        <Input />
        <Button slot="increment"><Plus size={16}/></Button>
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaNumberField>
  );
}
