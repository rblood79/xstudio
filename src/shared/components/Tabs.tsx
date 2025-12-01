import {
  Tabs as RACTabs,
  TabsProps,
  TabList as RACTabList,
  TabListProps,
  Tab as RACTab,
  TabProps,
  TabPanel as RACTabPanel,
  TabPanelProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { TabsVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import type { DataBindingValue } from '../../builder/panels/common/PropertyDataBinding';
import { useCollectionData } from '../../builder/hooks/useCollectionData';
import './styles/Tabs.css';

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
}

const tabsStyles = tv({
  base: 'react-aria-Tabs',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
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

const tabListStyles = tv({
  base: 'react-aria-TabList',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
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
  children,
  ...props
}: TabsExtendedProps) {
  // useCollectionData Hook으로 데이터 가져오기 (PropertyDataBinding 형식 지원)
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

  const tabsClassName = composeRenderProps(props.className, (className, renderProps) => {
    return tabsStyles({ ...renderProps, variant, size, className });
  });

  // DataBinding이 있고 columnMapping이 있으면 children 템플릿 사용
  if (hasDataBinding && columnMapping) {
    if (loading) {
      return (
        <RACTabs {...props} className={tabsClassName}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">⏳ 로딩 중...</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">로딩 중...</RACTabPanel>
        </RACTabs>
      );
    }

    if (error) {
      return (
        <RACTabs {...props} className={tabsClassName}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">❌ 오류</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">{error}</RACTabPanel>
        </RACTabs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACTabs {...props} className={tabsClassName}>
          {children}
        </RACTabs>
      );
    }
  }

  // DataBinding이 있고 columnMapping이 없으면 동적 Tab/TabPanel 생성
  if (hasDataBinding && !columnMapping) {
    if (loading) {
      return (
        <RACTabs {...props} className={tabsClassName}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">⏳ 로딩 중...</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">로딩 중...</RACTabPanel>
        </RACTabs>
      );
    }

    if (error) {
      return (
        <RACTabs {...props} className={tabsClassName}>
          <RACTabList className="react-aria-TabList">
            <RACTab className="react-aria-Tab">❌ 오류</RACTab>
          </RACTabList>
          <RACTabPanel className="react-aria-TabPanel">{error}</RACTabPanel>
        </RACTabs>
      );
    }

    if (boundData.length > 0) {
      return (
        <RACTabs {...props} className={tabsClassName}>
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
  return <RACTabs {...props} className={tabsClassName}>{children}</RACTabs>;
}

export function TabList<T extends object>({
  variant = 'primary',
  size = 'md',
  ...props
}: TabListExtendedProps<T>) {
  const tabListClassName = composeRenderProps(props.className, (className, renderProps) => {
    return tabListStyles({ ...renderProps, variant, size, className });
  });

  return <RACTabList {...props} className={tabListClassName} />;
}

export function Tab(props: TabProps) {
  return <RACTab {...props} className="react-aria-Tab" />;
}

export function TabPanel(props: TabPanelProps) {
  return <RACTabPanel {...props} className="react-aria-TabPanel" />;
}
