import type { Meta, StoryObj } from '@storybook/react';
import { Tab, TabList, TabPanel, Tabs } from '../builder/components/Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    selectedKey: 'overview'
  }
};

export default meta;

type Story = StoryObj<typeof Tabs>;

export const Basic: Story = {
  render: (args) => (
    <Tabs {...args} className="w-[360px]">
      <TabList aria-label="Project sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="details">Details</Tab>
        <Tab id="activity">Activity</Tab>
      </TabList>
      <TabPanel id="overview">Overview content goes here.</TabPanel>
      <TabPanel id="details">Detailed information appears here.</TabPanel>
      <TabPanel id="activity">Recent activity is shown here.</TabPanel>
    </Tabs>
  )
};

export const DisabledTab: Story = {
  render: (args) => (
    <Tabs {...args} className="w-[360px]" selectedKey="overview">
      <TabList aria-label="Settings">
        <Tab id="general">General</Tab>
        <Tab id="security" isDisabled>Security</Tab>
        <Tab id="notifications">Notifications</Tab>
      </TabList>
      <TabPanel id="general">General settings form.</TabPanel>
      <TabPanel id="security">Security options are disabled.</TabPanel>
      <TabPanel id="notifications">Notification preferences.</TabPanel>
    </Tabs>
  )
};
