//import Layout from './layout';

import './index.css';
import { Display } from './styles';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';

function Inspector() {
    return (
        <div className="inspector-container">
            <Tabs>
                <TabList>
                    <Tab id="styles">Styles</Tab>
                    <Tab id="props">Props</Tab>
                    <Tab id="events">Events</Tab>
                </TabList>
                <TabPanel id="styles">
                    <Display />
                </TabPanel>
                <TabPanel id="props">
                    <h3 className='panel-title'>Properties</h3>
                    Content for Properties
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