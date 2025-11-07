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
import { tv } from 'tailwind-variants';
import type { ComponentSizeSubset, CheckboxVariant } from '../../types/componentVariants';

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
}

const checkboxStyles = tv({
  base: 'react-aria-Checkbox',
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

export function MyCheckbox(props: CheckboxProps) {
  const { children, isTreeItemChild = false, variant = 'default', size = 'md', ...restProps } = props;

  // TreeItem 내부에서 사용될 때는 slot을 설정하지 않음
  const checkboxProps = isTreeItemChild
    ? restProps
    : { slot: "selection", ...restProps };

  return (
    <AriaCheckbox
      {...checkboxProps}
      className={composeRenderProps(
        checkboxProps.className,
        (className) => checkboxStyles({ variant, size, className })
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
