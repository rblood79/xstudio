/**
 * ProgressBar Component
 *
 * A visual indicator for showing progress of a task
 * Based on React Aria Components ProgressBar
 */

import {
  Label,
  ProgressBar as AriaProgressBar,
  ProgressBarProps as AriaProgressBarProps,
  composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { ComponentSizeSubset, ProgressBarVariant } from '../../types/builder/componentVariants.types';
import { formatPercent, formatNumber } from '../../utils/core/numberUtils';
import { Skeleton } from './Skeleton';

import './styles/ProgressBar.css';

export interface ProgressBarProps extends AriaProgressBarProps {
  label?: string;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: ProgressBarVariant;
  /**
   * Size of the progress bar
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
   * Show loading skeleton instead of progress bar
   * @default false
   */
  isLoading?: boolean;
}

const progressBar = tv({
  base: 'react-aria-ProgressBar',
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

export function ProgressBar({
  label,
  variant = 'default',
  size = 'md',
  locale = 'ko-KR',
  valueFormat = 'percent',
  showValue = true,
  customFormatter,
  isLoading,
  ...props
}: ProgressBarProps) {
  if (isLoading) {
    return (
      <Skeleton
        componentVariant="progress"
        size={size}
        className={props.className as string}
        aria-label="Loading progress bar..."
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
    <AriaProgressBar
      {...props}
      className={composeRenderProps(
        props.className,
        (className) => progressBar({ variant, size, className })
      )}
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
    </AriaProgressBar>
  );
}
