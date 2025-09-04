import './index.css';
import './shared/styles.css';
import Design from './design';
import Properties from './properties';
import Events from './events';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import { INSPECTOR_PANELS } from './shared/constants';

const INSPECTOR_TABS = [
    { id: INSPECTOR_PANELS.DESIGN, label: 'Design', component: Design },
    { id: INSPECTOR_PANELS.PROPERTIES, label: 'Props', component: Properties },
    { id: INSPECTOR_PANELS.EVENTS, label: 'Events', component: Events }
] as const;

function Inspector() {
    return (
        <div className="inspector-container">
            <Tabs>
                <TabList>
                    {INSPECTOR_TABS.map(tab => (
                        <Tab key={tab.id} id={tab.id}>
                            {tab.label}
                        </Tab>
                    ))}
                </TabList>
                {INSPECTOR_TABS.map(tab => {
                    const Component = tab.component;
                    return (
                        <TabPanel key={tab.id} id={tab.id}>
                            <Component />
                        </TabPanel>
                    );
                })}
            </Tabs>
        </div>
    );
}

export default Inspector;