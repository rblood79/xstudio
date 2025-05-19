import type { Meta } from '@storybook/react';
import React from 'react';
import { ListBox, ListBoxItem } from '../builder/components/ListBox';
import { ListBoxProps } from 'react-aria-components';

const meta: Meta<typeof ListBox> = {
  component: ListBox,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;

export const Example = (args: ListBoxProps<object>) => (
  <ListBox aria-label="Ice cream flavor" {...args}>
    <ListBoxItem id="chocolate">Chocolate</ListBoxItem>
    <ListBoxItem id="mint">Mint</ListBoxItem>
    <ListBoxItem id="strawberry">Strawberry</ListBoxItem>
    <ListBoxItem id="vanilla">Vanilla</ListBoxItem>
  </ListBox>
);

Example.args = {
  onAction: null,
  selectionMode: 'multiple'
};

export const DisabledItems = (args: ListBoxProps<object>) => <Example {...args} />;
DisabledItems.args = {
  ...Example.args,
  disabledKeys: ['mint']
};
