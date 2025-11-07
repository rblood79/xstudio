import type { Meta, StoryObj } from '@storybook/react';
import { Panel } from '../builder/components/Panel';

const meta: Meta<typeof Panel> = {
  title: 'Builder/Components/Panel',
  component: Panel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Panel 컴포넌트를 래핑한 패널 컴포넌트입니다. 컨텐츠를 표시하고 그룹화하는 데 사용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: '패널의 제목',
    },
    children: {
      control: 'text',
      description: '패널 내부에 렌더링될 React 노드 또는 텍스트',
    },
    variant: {
      control: 'radio',
      options: ['default', 'tab', 'sidebar', 'card', 'modal'],
      description: '패널의 시각적 변형',
    },
  },
  args: {
    title: '패널 제목',
    children: '이것은 패널 내용입니다.',
    variant: 'default',
  }
};

export default meta;

type Story = StoryObj<typeof Panel>;

export const BasicPanel: Story = {
  args: {
    children: (
      <div className="p-4 text-sm text-gray-700">
        <p>기본 스타일의 패널입니다.</p>
        <span className="text-xs text-gray-500">간단한 정보를 표시합니다.</span>
      </div>
    ),
  },
};

export const SidebarPanel: Story = {
  args: {
    variant: 'sidebar',
    title: '사이드바 패널',
    children: (
      <ul className="space-y-2 p-4">
        <li className="text-gray-800">대시보드</li>
        <li className="text-gray-700">프로젝트</li>
        <li className="text-gray-700">설정</li>
      </ul>
    ),
  }
};

export const TabPanel: Story = {
  args: {
    variant: 'tab',
    title: '탭 패널',
    children: (
      <div className="p-4 text-sm">
        <p className="text-gray-800">탭 내용 영역입니다.</p>
        <p className="text-gray-600 text-xs mt-2">Tab 컴포넌트와 함께 사용됩니다.</p>
      </div>
    ),
  }
};

export const CardStylePanel: Story = {
  args: {
    variant: 'card',
    title: '카드 스타일 패널',
    children: (
      <div className="p-4 space-y-2">
        <p className="text-gray-800">카드처럼 보이는 패널입니다.</p>
        <span className="text-xs text-gray-500">간단한 정보 카드로 사용할 수 있습니다.</span>
      </div>
    ),
  }
};

export const ModalStylePanel: Story = {
  args: {
    variant: 'modal',
    title: '작업 확인',
    children: (
      <div className="space-y-3 p-4">
        <p className="text-gray-800">정말 진행하시겠습니까?</p>
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">확인</button>
          <button className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 text-sm">취소</button>
        </div>
      </div>
    ),
  }
};
