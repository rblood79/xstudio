import {
  Tabs as RACTabs,
  TabsProps,
  TabList as RACTabList,
  TabListProps,
  Tab as RACTab,
  TabProps,
  TabPanel as RACTabPanel,
  TabPanelProps
} from 'react-aria-components';
import './components.css';

export function Tabs(props: TabsProps) {
  return <RACTabs {...props} className='react-aria-Tabs' />;
}

export function TabList(props: TabListProps) {
  return <RACTabList {...props} className='react-aria-TabList' />;
}

export function Tab(props: TabProps) {
  return <RACTab {...props} className='react-aria-Tab' />;
}

export function TabPanel(props: TabPanelProps) {
  return <RACTabPanel {...props} className='react-aria-TabPanel' />;
}
