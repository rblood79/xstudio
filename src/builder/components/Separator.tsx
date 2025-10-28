/**
 * Separator Component
 *
 * A visual divider for separating content sections
 * Based on React Aria Components Separator
 */

import { Separator as AriaSeparator, SeparatorProps as AriaSeparatorProps } from 'react-aria-components';
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
  variant?: 'default' | 'dashed' | 'dotted';

  /**
   * Size/thickness of the separator
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS class name
   */
  className?: string;
}

export function Separator({
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: SeparatorProps) {
  return (
    <AriaSeparator
      orientation={orientation}
      className={`react-aria-Separator ${className}`}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}
