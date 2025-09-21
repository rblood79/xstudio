import type { Meta, StoryObj } from '@storybook/react';
import { Panel } from '../builder/components/Panel';

const meta: Meta<typeof Panel> = {
  title: 'Panel',
  component: Panel,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    title: 'Panel Title',
    children: 'This is panel content.'
  }
};

export default meta;

type Story = StoryObj<typeof Panel>;

export const Basic: Story = {};

export const Sidebar: Story = {
  args: {
    variant: 'sidebar',
    title: 'Sidebar panel',
    children: (
      <ul className="space-y-2">
        <li>Dashboard</li>
        <li>Projects</li>
        <li>Settings</li>
      </ul>
    )
  }
};

export const ModalStyle: Story = {
  args: {
    variant: 'modal',
    title: 'Confirm action',
    children: (
      <div className="space-y-3">
        <p>Are you sure you want to proceed?</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-blue-600 text-white">Confirm</button>
          <button className="px-3 py-1 rounded border">Cancel</button>
        </div>
      </div>
    )
  }
};
