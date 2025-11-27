import {Breadcrumbs as RACBreadcrumbs, BreadcrumbsProps} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { composeRenderProps } from 'react-aria-components';
import type { BreadcrumbsVariant, ComponentSize } from '../../types/componentVariants';
import './styles/Breadcrumbs.css';

export interface BreadcrumbsExtendedProps<T extends object> extends BreadcrumbsProps<T> {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: BreadcrumbsVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
}

const breadcrumbsStyles = tv({
  base: 'react-aria-Breadcrumbs',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

/**
 * Breadcrumbs Component with Material Design 3 support
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, filled
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Navigation hierarchy
 * - Current page indicator
 * - Keyboard accessible
 * - Responsive separators
 *
 * @example
 * <Breadcrumbs variant="primary" size="md">
 *   <Breadcrumb><Link href="/">Home</Link></Breadcrumb>
 *   <Breadcrumb><Link href="/products">Products</Link></Breadcrumb>
 *   <Breadcrumb><Link>Current Page</Link></Breadcrumb>
 * </Breadcrumbs>
 */
export function Breadcrumbs<T extends object>({ variant = 'primary', size = 'md', ...props }: BreadcrumbsExtendedProps<T>) {
  const breadcrumbsClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return breadcrumbsStyles({
        ...renderProps,
        variant,
        size,
        className,
      });
    }
  );

  return <RACBreadcrumbs {...props} className={breadcrumbsClassName} />;
}
