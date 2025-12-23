import {Breadcrumbs as RACBreadcrumbs, BreadcrumbsProps, Breadcrumb, Link, composeRenderProps} from 'react-aria-components';
import type { BreadcrumbsVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { DataBindingValue } from '../../builder/panels/common/PropertyDataBinding';
import { useCollectionData } from '../../builder/hooks/useCollectionData';
import { Skeleton } from './Skeleton';
import './styles/Breadcrumbs.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

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
  /**
   * Show loading skeleton instead of breadcrumbs
   * @default false
   */
  isLoading?: boolean;
  /**
   * Number of skeleton items to show when loading
   * @default 3
   */
  skeletonCount?: number;
}

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
  isLoading: externalLoading,
  skeletonCount = 3,
  children,
  ...props
}: BreadcrumbsExtendedProps<T>) {
  // useCollectionData Hook - 항상 최상단에서 호출 (Rules of Hooks)
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

  // External loading state - show skeleton breadcrumbs
  if (externalLoading) {
    return (
      <nav
        className={props.className ? `react-aria-Breadcrumbs ${props.className}` : 'react-aria-Breadcrumbs'}
        data-variant={variant}
        data-size={size}
        aria-busy="true"
        aria-label="Loading breadcrumbs..."
      >
        <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton componentVariant="breadcrumb" size={size} index={i} />
              {i < skeletonCount - 1 && <span style={{ color: 'var(--color-gray-400)' }}>/</span>}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

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

  // 🚀 ClassNameOrFunction 타입 지원 - 문자열로 단순화
  const baseClassName = typeof props.className === 'string' ? props.className : undefined;
  const breadcrumbsClassName = baseClassName ? `react-aria-Breadcrumbs ${baseClassName}` : 'react-aria-Breadcrumbs';

  // DataBinding이 있고 columnMapping이 있으면 children 템플릿 사용
  if (hasDataBinding && columnMapping) {
    if (loading) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>
          <Breadcrumb><Link>⏳ 로딩 중...</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (error) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>
          <Breadcrumb><Link>❌ 오류</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>
          {children}
        </RACBreadcrumbs>
      );
    }
  }

  // DataBinding이 있고 columnMapping이 없으면 동적 Breadcrumb 생성
  if (hasDataBinding && !columnMapping) {
    if (loading) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>
          <Breadcrumb><Link>⏳ 로딩 중...</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (error) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>
          <Breadcrumb><Link>❌ 오류</Link></Breadcrumb>
        </RACBreadcrumbs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>
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
  return <RACBreadcrumbs {...props} className={breadcrumbsClassName} data-variant={variant} data-size={size}>{children}</RACBreadcrumbs>;
}
