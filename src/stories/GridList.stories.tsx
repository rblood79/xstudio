import type { Meta, StoryObj } from '@storybook/react';
import { GridList, GridListItem } from '../shared/components/GridList';

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
  title: 'Builder/Components/GridList',
  component: GridList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria GridList 컴포넌트를 래핑한 그리드 목록 컴포넌트입니다. 항목을 그리드 형태로 표시하고 선택할 수 있습니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    items: {
      table: { disable: true }
    },
    children: {
      control: 'text',
      description: '각 항목을 렌더링할 함수 또는 React 노드',
    },
    selectionMode: {
      control: 'radio',
      options: ['none', 'single', 'multiple'],
      description: '항목 선택 모드 (단일, 다중 또는 없음)',
    },
    selectedKeys: {
      control: 'object',
      description: '제어되는 선택된 항목들의 키 배열',
    },
    defaultSelectedKeys: {
      control: 'object',
      description: '초기 선택된 항목들의 키 배열 (비제어)',
    },
    disabledKeys: {
      control: 'object',
      description: '비활성화된 항목들의 키 배열',
    },
    onSelectionChange: { action: 'onSelectionChange', description: '항목 선택 변경 시 호출되는 콜백' },
    onAction: { action: 'onAction', description: '항목이 활성화될 때 (클릭/엔터) 호출되는 콜백' },
  },
  args: {
    items: files,
    selectionMode: 'multiple',
    'aria-label': '프로젝트 파일',
  }
};

export default meta;

type Story = StoryObj<typeof GridList>;

export const BasicGridList: Story = {
  render: (args) => (
    <GridList<FileItem>
      items={files}
      selectionMode={args.selectionMode}
      aria-label={args['aria-label']}
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

export const SingleSelection: Story = {
  render: (args) => (
    <GridList<FileItem>
      items={files}
      selectionMode="single"
      aria-label={args['aria-label']}
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
