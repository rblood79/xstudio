/**
 * Checkbox Component
 *
 * A checkbox for boolean selection
 * Based on React Aria Components Checkbox
 */

import {
  Checkbox as AriaCheckbox,
  CheckboxProps as AriaCheckboxProps,
  composeRenderProps
} from 'react-aria-components';
import { CheckIcon, Minus } from 'lucide-react';
import { useFocusRing } from '@react-aria/focus';
import { mergeProps } from '@react-aria/utils';
import type { ComponentSizeSubset, CheckboxVariant } from '../types';
import { Skeleton } from './Skeleton';

import './styles/Checkbox.css';

export interface CheckboxProps extends Omit<AriaCheckboxProps, 'children'> {
  children?: React.ReactNode;
  isTreeItemChild?: boolean; // TreeItem 내부에서 사용될 때를 위한 prop
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: CheckboxVariant;
  /**
   * Size of the checkbox
   * @default 'md'
   */
  size?: ComponentSizeSubset;
  /**
   * Show loading skeleton instead of checkbox
   * @default false
   */
  isLoading?: boolean;
}

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size, data-focus-visible 속성 사용
 */
export function MyCheckbox(props: CheckboxProps) {
  const { children, isTreeItemChild = false, variant = 'default', size = 'md', isLoading, ...restProps } = props;
  const { focusProps, isFocusVisible } = useFocusRing();

  if (isLoading) {
    return (
      <Skeleton
        componentVariant="checkbox"
        size={size}
        aria-label="Loading checkbox..."
      />
    );
  }

  // TreeItem 내부에서 사용될 때는 slot을 설정하지 않음
  const checkboxProps = isTreeItemChild
    ? mergeProps(restProps, focusProps)
    : mergeProps({ slot: "selection", ...restProps }, focusProps);

  return (
    <AriaCheckbox
      {...checkboxProps}
      data-focus-visible={isFocusVisible || undefined}
      data-variant={variant}
      data-size={size}
      className={composeRenderProps(
        checkboxProps.className,
        (className) => className ? `react-aria-Checkbox ${className}` : 'react-aria-Checkbox'
      )}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <div className="checkbox">
            {isIndeterminate ? <Minus size={16} strokeWidth={4} /> : isSelected && <CheckIcon size={16} strokeWidth={4} />}
          </div>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}

// 기존 Checkbox export도 유지
export function Checkbox(props: CheckboxProps) {
  return <MyCheckbox {...props} />;
}
