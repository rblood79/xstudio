import type { Meta, StoryObj } from '@storybook/react';
// import { action } from '@storybook/addon-actions';
const action = (name: string) => (...args: any[]) => console.log(name, ...args);
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
      control: 'object',
      description: '제어되는 선택된 태그들의 키 배열',
    },
    defaultSelectedKeys: {
      control: 'object',
      description: '초기 선택된 태그들의 키 배열 (비제어)',
    },
    disabledKeys: {
      control: 'object',
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
    <TagGroup {...args} items={tags}>
      {(item: TagItem) => <Tag key={item.id}>{item.name}</Tag>}
    </TagGroup>
  )
};

export const RemovableTagGroup: Story = {
  render: (args) => (
    <TagGroup {...args} items={tags} allowsRemoving onRemove={action('remove')}>
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
      items={tags}
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

export const PrimaryVariant: Story = {
  render: (args) => (
    <TagGroup {...args} variant="primary">
      <Tag>React</Tag>
      <Tag>TypeScript</Tag>
      <Tag>Tailwind</Tag>
      <Tag>Zustand</Tag>
    </TagGroup>
  ),
  args: {
    label: 'Primary 태그',
    variant: 'primary',
  },
};

export const SecondaryVariant: Story = {
  render: (args) => (
    <TagGroup {...args} variant="secondary">
      <Tag>Frontend</Tag>
      <Tag>Backend</Tag>
      <Tag>DevOps</Tag>
      <Tag>Design</Tag>
    </TagGroup>
  ),
  args: {
    label: 'Secondary 태그',
    variant: 'secondary',
  },
};

export const SurfaceVariant: Story = {
  render: (args) => (
    <TagGroup {...args} variant="surface">
      <Tag>HTML</Tag>
      <Tag>CSS</Tag>
      <Tag>JavaScript</Tag>
      <Tag>Node.js</Tag>
    </TagGroup>
  ),
  args: {
    label: 'Surface 태그',
    variant: 'surface',
  },
};

export const SmallSize: Story = {
  render: (args) => (
    <TagGroup {...args} variant="primary" size="sm">
      <Tag>Small</Tag>
      <Tag>Tags</Tag>
      <Tag>Here</Tag>
    </TagGroup>
  ),
  args: {
    label: 'Small 크기',
    variant: 'primary',
    size: 'sm',
  },
};

export const LargeSize: Story = {
  render: (args) => (
    <TagGroup {...args} variant="primary" size="lg">
      <Tag>Large</Tag>
      <Tag>Tags</Tag>
      <Tag>Here</Tag>
    </TagGroup>
  ),
  args: {
    label: 'Large 크기',
    variant: 'primary',
    size: 'lg',
  },
};

export const AllVariants: Story = {
  decorators: [
    () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '500px' }}>
        <TagGroup label="Default Variant">
          <Tag>React</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Tailwind</Tag>
        </TagGroup>
        <TagGroup label="Primary Variant" variant="primary">
          <Tag>React</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Tailwind</Tag>
        </TagGroup>
        <TagGroup label="Secondary Variant" variant="secondary">
          <Tag>React</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Tailwind</Tag>
        </TagGroup>
        <TagGroup label="Surface Variant" variant="surface">
          <Tag>React</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Tailwind</Tag>
        </TagGroup>
      </div>
    ),
  ],
};
