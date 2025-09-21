import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../builder/components/Card';

const meta: Meta<typeof Card> = {
  title: 'Card',
  component: Card,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    title: 'Project Aurora',
    description: 'A design system exploration for next generation products.'
  }
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Basic: Story = {};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div className="space-y-2">
        <p>A card with elevation styling.</p>
        <button className="px-3 py-1 rounded bg-blue-600 text-white">Open project</button>
      </div>
    )
  }
};

export const QuietSelection: Story = {
  args: {
    isQuiet: true,
    isSelected: true,
    children: (
      <div className="space-y-2">
        <p>Selected state with quiet appearance.</p>
        <span className="text-sm text-gray-500">Last updated 2 hours ago</span>
      </div>
    )
  }
};
