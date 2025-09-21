import type { Meta, StoryObj } from '@storybook/react';
import { GridList, GridListItem } from '../builder/components/GridList';

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
}

const files: FileItem[] = [
  { id: '1', name: 'Photos', type: 'Folder', size: '1.2 GB' },
  { id: '2', name: 'Videos', type: 'Folder', size: '5.4 GB' },
  { id: '3', name: 'Presentation.pptx', type: 'PowerPoint', size: '24 MB' },
  { id: '4', name: 'Budget.xlsx', type: 'Excel', size: '4.5 MB' }
];

const meta: Meta<typeof GridList> = {
  title: 'GridList',
  component: GridList,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    selectionMode: 'multiple'
  }
};

export default meta;

type Story = StoryObj<typeof GridList>;

export const Basic: Story = {
  render: (args) => (
    <GridList {...args} items={files} aria-label="Project files" className="max-w-md w-full">
      {(item: FileItem) => (
        <GridListItem key={item.id}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-gray-500">{item.type} • {item.size}</span>
          </div>
        </GridListItem>
      )}
    </GridList>
  )
};

export const WithSingleSelection: Story = {
  render: (args) => (
    <GridList
      {...args}
      selectionMode="single"
      items={files}
      aria-label="Project files"
      className="max-w-md w-full"
    >
      {(item: FileItem) => (
        <GridListItem key={item.id}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-gray-500">{item.type} • {item.size}</span>
          </div>
        </GridListItem>
      )}
    </GridList>
  )
};
