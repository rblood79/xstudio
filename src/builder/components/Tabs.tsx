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
import type { TabsVariant, ComponentSize } from '../types/componentVariants';
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
export function Tabs({ variant = 'primary', size = 'md', ...props }: TabsExtendedProps) {
  const tabsClassName = composeRenderProps(props.className, (className, renderProps) => {
    return tabsStyles({ ...renderProps, variant, size, className });
  });

  return <RACTabs {...props} className={tabsClassName} />;
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
