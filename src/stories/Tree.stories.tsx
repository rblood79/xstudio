import type { Meta, StoryObj } from '@storybook/react';
// import { action } from '@storybook/addon-actions';
const action = (name: string) => (...args: unknown[]) => console.log(name, ...args);
import { Tree, TreeItem } from '../builder/components/Tree';

const meta: Meta<typeof Tree> = {
  title: 'Builder/Components/Tree',
  component: Tree,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Tree 컴포넌트를 래핑한 트리 뷰 컴포넌트입니다. 계층적 데이터를 탐색하고 선택할 수 있습니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'TreeItem 컴포넌트들 또는 항목을 렌더링할 함수',
    },
    selectionMode: {
      control: 'radio',
      options: ['none', 'single', 'multiple'],
      description: '항목 선택 모드 (없음, 단일, 다중)',
    },
    selectedKeys: {
      control: 'object',
      description: '제어되는 선택된 항목들의 키 배열',
    },
    defaultSelectedKeys: {
      control: 'object',
      description: '초기 선택된 항목들의 키 배열 (비제어)',
    },
    expandedKeys: {
      control: 'object',
      description: '제어되는 확장된 항목들의 키 배열',
    },
    defaultExpandedKeys: {
      control: 'object',
      description: '초기 확장된 항목들의 키 배열 (비제어)',
    },
    disabledKeys: {
      control: 'object',
      description: '비활성화된 항목들의 키 배열',
    },
    onSelectionChange: { action: 'onSelectionChange', description: '항목 선택 변경 시 호출되는 콜백' },
    onExpandedChange: { action: 'onExpandedChange', description: '항목 확장 상태 변경 시 호출되는 콜백' },
    onAction: { action: 'onAction', description: '항목이 활성화될 때 (클릭/엔터) 호출되는 콜백' },
  },
  args: {
    selectionMode: 'multiple',
    'aria-label': '프로젝트 탐색기',
    children: (
      <>
        <TreeItem id="getting-started" title="시작하기" hasChildren childItems={(
          <>
            <TreeItem id="overview" title="개요" />
            <TreeItem id="quickstart" title="빠른 시작" />
          </>
        )} />
        <TreeItem id="guides" title="가이드" hasChildren childItems={(
          <>
            <TreeItem id="styling" title="스타일링" />
            <TreeItem id="routing" title="라우팅" />
            <TreeItem id="state" title="상태 관리" />
          </>
        )} />
        <TreeItem id="api" title="API 레퍼런스" />
      </>
    ),
  }
};

export default meta;

type Story = StoryObj<typeof Tree>;

export const BasicTree: Story = {
  render: (args) => (
    <Tree {...args} className="w-[280px]">
      {args.children}
    </Tree>
  )
};

export const TreeWithActions: Story = {
  render: (args) => (
    <Tree {...args} aria-label="폴더" className="w-[280px]">
      <TreeItem
        id="projects"
        title="프로젝트"
        hasChildren
        onInfoClick={action('projects-info-click')}
        childItems={(
          <>
            <TreeItem id="project-alpha" title="알파 프로젝트" />
            <TreeItem id="project-beta" title="베타 프로젝트" />
          </>
        )}
      />
      <TreeItem
        id="archive"
        title="아카이브"
        hasChildren
        childItems={<TreeItem id="old" title="2019" />}
      />
    </Tree>
  )
};
