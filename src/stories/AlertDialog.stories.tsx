import type { Meta } from '@storybook/react';
import React from 'react';
import { DialogTrigger } from 'react-aria-components';
import { AlertDialog } from '../builder/components/AlertDialog';
import { Button } from '../builder/components/Button';
import { Modal } from '../builder/components/Modal';

const meta: Meta<typeof AlertDialog> = {
  component: AlertDialog,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
};

export default meta;

export const Example = (args: any) => (
  <DialogTrigger>
    <Button variant="secondary">AlertDialog</Button>
    <Modal>
      <AlertDialog {...args} />
    </Modal>
  </DialogTrigger>
);

Example.args = {
  title: 'Delete folder',
  children: 'Are you sure you want to delete "Documents"? All contents will be permanently destroyed.',
  variant: 'destructive',
  actionLabel: 'Delete'
};
