/**
 * Switch Component
 *
 * A toggle switch for on/off states
 * Based on React Aria Components Switch
 */

import {
  Switch as AriaSwitch,
  SwitchProps as AriaSwitchProps,
  composeRenderProps
} from 'react-aria-components';
import { useFocusRing } from '@react-aria/focus';
import { mergeProps } from '@react-aria/utils';
import type { ComponentSizeSubset, SwitchVariant } from '../types';
import { Skeleton } from './Skeleton';

import './styles/Switch.css';

export interface SwitchProps extends Omit<AriaSwitchProps, 'children'> {
  children: React.ReactNode;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: SwitchVariant;
  /**
   * Size of the switch
   * @default 'md'
   */
  size?: ComponentSizeSubset;
  /**
   * Show loading skeleton instead of switch
   * @default false
   */
  isLoading?: boolean;
}

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size, data-focus-visible 속성 사용
 */
export function Switch({ children, variant = 'default', size = 'md', isLoading, ...props }: SwitchProps) {
  const { focusProps, isFocusVisible } = useFocusRing();

  if (isLoading) {
    return (
      <Skeleton
        componentVariant="switch"
        size={size}
        aria-label="Loading switch..."
      />
    );
  }

  return (
    <AriaSwitch
      {...mergeProps(props, focusProps)}
      data-focus-visible={isFocusVisible || undefined}
      data-variant={variant}
      data-size={size}
      className={composeRenderProps(
        props.className,
        (className) => className ? `react-aria-Switch ${className}` : 'react-aria-Switch'
      )}
    >
      <div className="indicator" />
      {children}
    </AriaSwitch>
  );
}
