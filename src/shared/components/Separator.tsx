/**
 * Separator Component
 *
 * A visual divider for separating content sections
 * Based on React Aria Components Separator
 */

import { Separator as AriaSeparator, SeparatorProps as AriaSeparatorProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { SeparatorVariant, ComponentSizeSubset } from '../../types/builder/componentVariants.types';
import './styles/Separator.css';

export interface SeparatorProps extends AriaSeparatorProps {
  /**
   * The orientation of the separator
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Visual variant
   * @default 'default'
   */
  variant?: SeparatorVariant;

  /**
   * Size/thickness of the separator
   * @default 'md'
   */
  size?: ComponentSizeSubset;
}

const separator = tv({
  base: 'react-aria-Separator',
  variants: {
    variant: {
      default: '',
      dashed: 'dashed',
      dotted: 'dotted',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
    orientation: {
      horizontal: 'horizontal',
      vertical: 'vertical',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    orientation: 'horizontal',
  },
});

export function Separator(props: SeparatorProps) {
  const { orientation = 'horizontal', variant = 'default', size = 'md' } = props;

  const className = separator({
    variant,
    size,
    orientation,
    className: props.className,
  });

  return (
    <AriaSeparator
      {...props}
      orientation={orientation}
      className={className}
    />
  );
}
