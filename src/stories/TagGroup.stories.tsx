import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Tag, TagGroup } from '../builder/components/TagGroup';

interface TagItem {
  id: string;
  name: string;
}

const tags: TagItem[] = [
  { id: 'design', name: 'Design' },
  { id: 'development', name: 'Development' },
  { id: 'marketing', name: 'Marketing' }
];

const meta: Meta<typeof TagGroup> = {
  title: 'TagGroup',
  component: TagGroup,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    label: 'Team focus'
  }
};

export default meta;

type Story = StoryObj<typeof TagGroup>;

export const Basic: Story = {
  render: (args) => (
    <TagGroup {...args} items={tags}>
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  )
};

export const Removable: Story = {
  render: (args) => (
    <TagGroup {...args} items={tags} allowsRemoving onRemove={action('remove')}>
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  )
};

export const Selectable: Story = {
  render: (args) => (
    <TagGroup
      {...args}
      items={tags}
      selectionMode="multiple"
      defaultSelectedKeys={['design']}
    >
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  )
};
