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
  title: 'Builder/Components/TagGroup',
  component: TagGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria TagGroup 컴포넌트를 래핑한 태그 그룹 컴포넌트입니다. 상호작용 가능한 태그 컬렉션을 표시합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '태그 그룹의 라벨',
    },
    items: {
      control: 'object',
      description: '태그 그룹에 표시될 항목들의 배열 (TagItem 인터페이스 필요)',
    },
    children: {
      control: 'text',
      description: '각 항목을 렌더링할 함수 또는 React 노드 (일반적으로 Tag 컴포넌트)',
    },
    allowsRemoving: {
      control: 'boolean',
      description: '태그를 제거할 수 있는지 여부',
    },
    onRemove: { action: 'onRemove', description: '태그가 제거될 때 호출되는 콜백' },
    selectionMode: {
      control: 'radio',
      options: ['none', 'single', 'multiple'],
      description: '태그 선택 모드 (없음, 단일, 다중)',
    },
    selectedKeys: {
      control: 'array',
      description: '제어되는 선택된 태그들의 키 배열',
    },
    defaultSelectedKeys: {
      control: 'array',
      description: '초기 선택된 태그들의 키 배열 (비제어)',
    },
    disabledKeys: {
      control: 'array',
      description: '비활성화된 태그들의 키 배열',
    },
    onSelectionChange: { action: 'onSelectionChange', description: '선택된 태그가 변경될 때 호출되는 콜백' },
  },
  args: {
    label: '팀 포커스',
    items: tags,
    allowsRemoving: false,
    selectionMode: 'none',
  }
};

export default meta;

type Story = StoryObj<typeof TagGroup>;

export const BasicTagGroup: Story = {
  render: (args) => (
    <TagGroup {...args}>
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  )
};

export const RemovableTagGroup: Story = {
  render: (args) => (
    <TagGroup {...args} allowsRemoving onRemove={action('remove')}>
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  ),
  args: {
    label: '제거 가능한 태그',
    allowsRemoving: true,
  },
};

export const SelectableTagGroup: Story = {
  render: (args) => (
    <TagGroup
      {...args}
      selectionMode="multiple"
      defaultSelectedKeys={['design']}
    >
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  ),
  args: {
    label: '선택 가능한 태그',
    selectionMode: 'multiple',
  },
};
