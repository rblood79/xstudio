import React from 'react';
import { Form } from 'react-aria-components';
import { Button } from '../builder/components/Button';
import { Radio, RadioGroup } from '../builder/components/RadioGroup';
import { StoryObj } from '@storybook/react';

export default {
  title: 'RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
  args: {
    label: 'Favorite sport',
    isDisabled: false,
    isRequired: false,
    description: '',
    children: <>
      <Radio value="soccer">Soccer</Radio>
      <Radio value="baseball">Baseball</Radio>
      <Radio value="basketball">Basketball</Radio>
    </>
  }
};

export const Default = {
  args: {},
};

type Story = StoryObj<typeof RadioGroup>;

export const Validation: Story = (args) => (
  <Form className="flex flex-col gap-2 items-start">
    <RadioGroup {...args} />
    <Button type="submit" variant="secondary">Submit</Button>
  </Form>
);

Validation.args = {
  isRequired: true
};
