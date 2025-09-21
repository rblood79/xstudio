import type { Meta, StoryObj } from '@storybook/react';
import {
  FieldGroup,
  Label,
  Input,
  Description,
  FieldError
} from '../builder/components/Field';

const meta: Meta<typeof FieldGroup> = {
  title: 'Field',
  component: FieldGroup,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;

type Story = StoryObj<typeof FieldGroup>;

export const Basic: Story = {
  render: () => (
    <FieldGroup className="flex flex-col gap-2 max-w-sm">
      <Label htmlFor="field-basic">Label</Label>
      <Input id="field-basic" placeholder="Type something" />
      <Description>Helpful instructions for the input.</Description>
    </FieldGroup>
  )
};

export const WithErrorState: Story = {
  render: () => (
    <FieldGroup
      aria-describedby="field-error"
      aria-invalid
      className="flex flex-col gap-2 max-w-sm"
    >
      <Label htmlFor="field-error-input">Email</Label>
      <Input id="field-error-input" placeholder="you@example.com" />
      <FieldError id="field-error">Please provide a valid email.</FieldError>
    </FieldGroup>
  )
};
