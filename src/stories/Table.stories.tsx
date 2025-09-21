import type { Meta, StoryObj } from '@storybook/react';
import { Cell, TableBody } from 'react-aria-components';
import { Column, Row, Table, TableHeader } from '../builder/components/Table';

interface Person {
  id: string;
  name: string;
  role: string;
  status: string;
}

const columns = [
  { id: 'name', name: 'Name' },
  { id: 'role', name: 'Role' },
  { id: 'status', name: 'Status' }
] as const;

const rows: Person[] = [
  { id: '1', name: 'Alice', role: 'Designer', status: 'Active' },
  { id: '2', name: 'Bob', role: 'Developer', status: 'Away' },
  { id: '3', name: 'Charlie', role: 'Product Manager', status: 'Offline' }
];

const meta: Meta<typeof Table> = {
  title: 'Table',
  component: Table,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    selectionMode: 'none'
  }
};

export default meta;

type Story = StoryObj<typeof Table>;

export const Basic: Story = {
  render: (args) => (
    <Table {...args} aria-label="Team members" className="w-[480px]">
      <TableHeader columns={columns}>
        {(column) => <Column>{column.name}</Column>}
      </TableHeader>
      <TableBody items={rows}>
        {(item) => (
          <Row id={item.id} columns={columns}>
            {(column) => <Cell>{item[column.id as keyof Person]}</Cell>}
          </Row>
        )}
      </TableBody>
    </Table>
  )
};

export const WithSelection: Story = {
  render: (args) => (
    <Table
      {...args}
      selectionMode="multiple"
      aria-label="Selectable team members"
      className="w-[480px]"
    >
      <TableHeader columns={columns}>
        {(column) => <Column allowsSorting={column.id === 'name'}>{column.name}</Column>}
      </TableHeader>
      <TableBody items={rows}>
        {(item) => (
          <Row id={item.id} columns={columns}>
            {(column) => <Cell>{item[column.id as keyof Person]}</Cell>}
          </Row>
        )}
      </TableBody>
    </Table>
  )
};
