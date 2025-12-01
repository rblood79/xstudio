import {Breadcrumbs as RACBreadcrumbs, BreadcrumbsProps, Breadcrumb, Link} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { composeRenderProps } from 'react-aria-components';
import type { BreadcrumbsVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { DataBindingValue } from '../../builder/panels/common/PropertyDataBinding';
import { useCollectionData } from '../../builder/hooks/useCollectionData';
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
  /**
   * Data binding for dynamic breadcrumb items
   */
  dataBinding?: DataBinding | DataBindingValue;
  /**
   * Column mapping for data binding
   */
  columnMapping?: ColumnMapping;
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
 * - DataBinding support for dynamic breadcrumb items
 *
 * @example
 * <Breadcrumbs variant="primary" size="md">
 *   <Breadcrumb><Link href="/">Home</Link></Breadcrumb>
 *   <Breadcrumb><Link href="/products">Products</Link></Breadcrumb>
 *   <Breadcrumb><Link>Current Page</Link></Breadcrumb>
 * </Breadcrumbs>
 */
export function Breadcrumbs<T extends object>({
  variant = 'primary',
  size = 'md',
  dataBinding,
  columnMapping,
  children,
  ...props
}: BreadcrumbsExtendedProps<T>) {
  // useCollectionData Hook으로 데이터 가져오기 (PropertyDataBinding 형식 지원)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: 'Breadcrumbs',
    fallbackData: [
      { id: 1, name: 'Home', href: '/' },
      { id: 2, name: 'Products', href: '/products' },
      { id: 3, name: 'Current', href: '' },
    ],
  });

  // PropertyDataBinding 형식 감지
  const isPropertyBinding =
    dataBinding &&
    'source' in dataBinding &&
    'name' in dataBinding &&
    !('type' in dataBinding);
  const hasDataBinding =
    (!isPropertyBinding &&
      dataBinding &&
      'type' in dataBinding &&
      dataBinding.type === 'collection') ||
    isPropertyBinding;

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

  // DataBinding이 있고 columnMapping이 있으면 children 템플릿 사용
  if (hasDataBinding && columnMapping) {
    if (loading) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName}>
          <Breadcrumb><Link>⏳ 로딩 중...</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (error) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName}>
          <Breadcrumb><Link>❌ 오류</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName}>
          {children}
        </RACBreadcrumbs>
      );
    }
  }

  // DataBinding이 있고 columnMapping이 없으면 동적 Breadcrumb 생성
  if (hasDataBinding && !columnMapping) {
    if (loading) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName}>
          <Breadcrumb><Link>⏳ 로딩 중...</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (error) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName}>
          <Breadcrumb><Link>❌ 오류</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName}>
          {boundData.map((item, index) => (
            <Breadcrumb key={String(item.id || index)}>
              <Link href={String(item.href || item.url || '')}>
                {String(item.name || item.title || item.label || `Item ${index + 1}`)}
              </Link>
            </Breadcrumb>
          ))}
        </RACBreadcrumbs>
      );
    }
  }

  // Static children (기존 방식)
  return <RACBreadcrumbs {...props} className={breadcrumbsClassName}>{children}</RACBreadcrumbs>;
}
