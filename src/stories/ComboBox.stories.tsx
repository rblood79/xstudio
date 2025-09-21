import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ComboBox, ComboBoxItem } from '../builder/components/ComboBox';

const fruits = [
  { id: 'apple', name: 'Apple' },
  { id: 'banana', name: 'Banana' },
  { id: 'cherry', name: 'Cherry' },
  { id: 'grape', name: 'Grape' },
  { id: 'orange', name: 'Orange' }
];

function ControlledComboBox(props: ComponentProps<typeof ComboBox>) {
  const [inputValue, setInputValue] = useState('');

  return (
    <ComboBox
      {...props}
      inputValue={inputValue}
      onInputChange={setInputValue}
      items={fruits}
    >
      {(item: { id: string; name: string }) => (
        <ComboBoxItem key={item.id}>{item.name}</ComboBoxItem>
      )}
    </ComboBox>
  );
}

const meta: Meta<typeof ComboBox> = {
  title: 'ComboBox',
  component: ComboBox,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    label: 'Choose a fruit',
    placeholder: 'Type or select a fruit'
  }
};

export default meta;

type Story = StoryObj<typeof ComboBox>;

export const Basic: Story = {
  render: (args) => (
    <ComboBox {...args} items={fruits}>
      {(item) => <ComboBoxItem key={item.id}>{item.name}</ComboBoxItem>}
    </ComboBox>
  )
};

export const WithControlledValue: Story = {
  render: (args) => <ControlledComboBox {...args} />
};
