import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Form } from 'react-aria-components';
import { Button } from '../builder/components/Button';
import { TextField } from '../builder/components/TextField';

const meta: Meta<typeof TextField> = {
  component: TextField,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    label: 'Name'
  }
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Example: Story = (args) => <TextField {...args} />;

export const Validation: Story = (args) => (
  <Form className="flex flex-col gap-2 items-start">
    <TextField {...args} />
    <Button type="submit" variant="secondary">Submit</Button>
  </Form>
);

Validation.args = {
  isRequired: true
};
