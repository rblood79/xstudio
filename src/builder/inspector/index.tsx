//import Layout from './layout';

import './index.css';
import Design from './design';
import Properties from './properties';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';

function Inspector() {
    return (
        <div className="inspector-container">
            <Tabs>
                <TabList>
                    <Tab id="design">Design</Tab>
                    <Tab id="props">Props</Tab>
                    <Tab id="events">Events</Tab>
                </TabList>
                <TabPanel id="design">
                    <Design />
                </TabPanel>
                <TabPanel id="props">
                    <Properties />
                </TabPanel>
                <TabPanel id="events">
                    <h3 className='panel-title'>Events</h3>
                    Content for Events
                </TabPanel>
            </Tabs>

        </div>
    );
}

export default Inspector;