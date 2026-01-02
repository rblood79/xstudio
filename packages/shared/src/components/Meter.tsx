/**
 * Meter Component
 *
 * A visual indicator for showing a measurement value
 * Based on React Aria Components Meter
 */

import {
  Label,
  Meter as AriaMeter,
  MeterProps as AriaMeterProps,
  composeRenderProps
} from 'react-aria-components';
import type { ComponentSizeSubset, MeterVariant } from '../types';
import { formatPercent, formatNumber } from '../utils/core/numberUtils';
import { Skeleton } from './Skeleton';

import './styles/Meter.css';

export interface MeterProps extends AriaMeterProps {
  label?: string;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: MeterVariant;
  /**
   * Size of the meter
   * @default 'md'
   */
  size?: ComponentSizeSubset;
  /**
   * 로케일
   * @default 'ko-KR'
   */
  locale?: string;
  /**
   * 값 표시 형식
   * - number: 숫자로 표시 (75)
   * - percent: 퍼센트로 표시 (75%)
   * - custom: 커스텀 포맷터 사용
   * @default 'percent'
   */
  valueFormat?: 'number' | 'percent' | 'custom';
  /**
   * 값 표시 여부
   * @default true
   */
  showValue?: boolean;
  /**
   * 커스텀 포맷터 함수
   */
  customFormatter?: (value: number) => string;
  /**
   * Show loading skeleton instead of meter
   * @default false
   */
  isLoading?: boolean;
}

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */
export function Meter({
  label,
  variant = 'default',
  size = 'md',
  locale = 'ko-KR',
  valueFormat = 'percent',
  showValue = true,
  customFormatter,
  isLoading,
  ...props
}: MeterProps) {
  if (isLoading) {
    return (
      <Skeleton
        componentVariant="meter"
        size={size}
        className={props.className as string}
        aria-label="Loading meter..."
      />
    );
  }
  // 값 포맷팅 함수
  const formatValue = (value: number): string => {
    if (customFormatter) {
      return customFormatter(value);
    }

    switch (valueFormat) {
      case 'percent':
        return formatPercent(value / 100, locale, 0);
      case 'number':
        return formatNumber(value, locale);
      default:
        return String(value);
    }
  };

  return (
    <AriaMeter
      {...props}
      className={composeRenderProps(
        props.className,
        (className) => className ? `react-aria-Meter ${className}` : 'react-aria-Meter'
      )}
      data-variant={variant}
      data-size={size}
    >
      {({ percentage, valueText }) => (
        <>
          {label && <Label>{label}</Label>}
          {showValue && (
            <span className="value">
              {props.value !== undefined
                ? formatValue(props.value as number)
                : valueText}
            </span>
          )}
          <div className="bar">
            <div className="fill" style={{ width: percentage + '%' }} />
          </div>
        </>
      )}
    </AriaMeter>
  );
}
