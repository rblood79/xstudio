import { createContext, useContext, type ReactNode } from 'react';
import {
  Tabs as RACTabs,
  TabsProps,
  TabList as RACTabList,
  TabListProps,
  Tab as RACTab,
  TabProps,
  TabPanel as RACTabPanel,
  TabPanelProps,
  SelectionIndicator,
  SharedElementTransition,
  composeRenderProps,
} from 'react-aria-components';
import type { TabsVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { DataBindingValue } from '../../builder/components';
import { useCollectionData } from '../../builder/hooks/useCollectionData';
import { Skeleton } from './Skeleton';
import './styles/Tabs.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface TabsExtendedProps extends TabsProps {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: TabsVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  /**
   * Data binding for dynamic tabs
   */
  dataBinding?: DataBinding | DataBindingValue;
  /**
   * Column mapping for data binding
   */
  columnMapping?: ColumnMapping;
  /**
   * Show loading skeleton instead of tabs
   * @default false
   */
  isLoading?: boolean;
  /**
   * Number of skeleton tabs to show when loading
   * @default 3
   */
  skeletonTabCount?: number;
}

export interface TabListExtendedProps<T extends object> extends TabListProps<T> {
  /**
   * M3 variant (inherited from Tabs)
   * @default 'primary'
   */
  variant?: TabsVariant;
  /**
   * Size variant (inherited from Tabs)
   * @default 'md'
   */
  size?: ComponentSize;
  /**
   * React Aria 1.13.0: 선택된 탭을 표시하는 애니메이션 인디케이터
   * @default false
   */
  showIndicator?: boolean;
}

/**
 * Tabs Component with Material Design 3 support
 *
 * M3 Features:
 * - 3 variants: primary, secondary, tertiary
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Tabbed navigation interface
 * - Horizontal and vertical orientation support
 * - Keyboard accessible (Arrow keys, Home, End)
 * - Focus management
 * - DataBinding support for dynamic tabs
 *
 * @example
 * <Tabs variant="primary" size="md">
 *   <TabList variant="primary" size="md">
 *     <Tab>Tab 1</Tab>
 *     <Tab>Tab 2</Tab>
 *   </TabList>
 *   <TabPanel>Content 1</TabPanel>
 *   <TabPanel>Content 2</TabPanel>
 * </Tabs>
 */
export function Tabs({
  variant = 'primary',
  size = 'md',
  dataBinding,
  columnMapping,
  isLoading: externalLoading,
  skeletonTabCount = 3,
  children,
  ...props
}: TabsExtendedProps) {
  // useCollectionData Hook - 항상 최상단에서 호출 (Rules of Hooks)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: 'Tabs',
    fallbackData: [
      { id: 'tab-1', title: 'Tab 1', content: 'Content 1' },
      { id: 'tab-2', title: 'Tab 2', content: 'Content 2' },
    ],
  });

  // External loading state - show skeleton tabs
  if (externalLoading) {
    return (
      <div
        className={props.className ? `react-aria-Tabs ${props.className}` : 'react-aria-Tabs'}
        data-variant={variant}
        data-size={size}
        role="tablist"
        aria-busy="true"
        aria-label="Loading tabs..."
      >
        <div className="react-aria-TabList" style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: skeletonTabCount }).map((_, i) => (
            <Skeleton key={i} componentVariant="tab" size={size} index={i} />
          ))}
        </div>
        <div className="react-aria-TabPanel" style={{ padding: '16px' }}>
          <Skeleton variant="text" lines={3} />
        </div>
      </div>
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

  const tabsClassName = composeRenderProps(props.className, (className) => {
    return className ? `react-aria-Tabs ${className}` : 'react-aria-Tabs';
  });

  // DataBinding이 있고 columnMapping이 있으면 children 템플릿 사용
  if (hasDataBinding && columnMapping) {
    if (loading) {
      return (
        <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">⏳ 로딩 중...</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">로딩 중...</RACTabPanel>
        </RACTabs>
      );
    }

    if (error) {
      return (
        <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">❌ 오류</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">{error}</RACTabPanel>
        </RACTabs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>
          {children}
        </RACTabs>
      );
    }
  }

  // DataBinding이 있고 columnMapping이 없으면 동적 Tab/TabPanel 생성
  if (hasDataBinding && !columnMapping) {
    if (loading) {
      return (
        <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">⏳ 로딩 중...</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">로딩 중...</RACTabPanel>
        </RACTabs>
      );
    }

    if (error) {
      return (
        <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">❌ 오류</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">{error}</RACTabPanel>
        </RACTabs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>
          <RACTabList className="react-aria-TabList">
            {boundData.map((item, index) => (
              <RACTab
                key={String(item.id || index)}
                id={String(item.id || index)}
                className="react-aria-Tab"
              >
                {String(item.title || item.name || item.label || `Tab ${index + 1}`)}
              </RACTab>
            ))}
          </RACTabList>
          {boundData.map((item, index) => (
            <RACTabPanel
              key={String(item.id || index)}
              id={String(item.id || index)}
              className="react-aria-TabPanel"
            >
              {String(item.content || item.description || item.body || `Content ${index + 1}`)}
            </RACTabPanel>
          ))}
        </RACTabs>
      );
    }
  }

  // Static children (기존 방식)
  return <RACTabs {...props} className={tabsClassName} data-variant={variant} data-size={size}>{children}</RACTabs>;
}

// TabList용 Context - showIndicator 상태 공유
const TabListIndicatorContext = createContext(false);

export function TabList<T extends object>({
  variant = 'primary',
  size = 'md',
  showIndicator = false,
  children,
  ...props
}: TabListExtendedProps<T>) {
  const tabListClassName = composeRenderProps(props.className, (className) => {
    return className ? `react-aria-TabList ${className}` : 'react-aria-TabList';
  });

  // showIndicator가 true면 SharedElementTransition으로 감싸기
  // SelectionIndicator는 각 Tab 내부에서 렌더링됨
  if (showIndicator) {
    return (
      <RACTabList {...props} className={tabListClassName} data-variant={variant} data-size={size} data-show-indicator="true">
        <SharedElementTransition>
          <TabListIndicatorContext.Provider value={true}>
            {children as ReactNode}
          </TabListIndicatorContext.Provider>
        </SharedElementTransition>
      </RACTabList>
    );
  }

  // 기본: CSS ::before 기반 인디케이터
  return (
    <RACTabList {...props} className={tabListClassName} data-variant={variant} data-size={size}>
      <TabListIndicatorContext.Provider value={false}>
        {children as ReactNode}
      </TabListIndicatorContext.Provider>
    </RACTabList>
  );
}

// Tab에서 showIndicator 컨텍스트 사용
export function useTabListIndicator() {
  return useContext(TabListIndicatorContext);
}

export function Tab({ children, ...props }: TabProps) {
  const showIndicator = useTabListIndicator();

  return (
    <RACTab {...props} className="react-aria-Tab">
      {showIndicator && <SelectionIndicator />}
      {children as ReactNode}
    </RACTab>
  );
}

export function TabPanel(props: TabPanelProps) {
  return <RACTabPanel {...props} className="react-aria-TabPanel" />;
}
