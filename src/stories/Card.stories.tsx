import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../builder/components/Card';

const meta: Meta<typeof Card> = {
  title: 'Builder/Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Card 컴포넌트를 래핑한 카드 컴포넌트입니다. 컨텐츠를 그룹화하고 정보를 표시하는 데 사용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: '카드의 제목',
    },
    description: {
      control: 'text',
      description: '카드의 상세 설명',
    },
    variant: {
      control: 'radio',
      options: ['default', 'elevated'],
      description: '카드의 시각적 변형 (기본 또는 입체)',
    },
    isQuiet: {
      control: 'boolean',
      description: '조용한 (배경 없는) 스타일을 적용할지 여부',
    },
    isSelected: {
      control: 'boolean',
      description: '카드가 선택된 상태인지 여부',
    },
    children: {
      control: 'text',
      description: '카드 내부에 렌더링될 React 노드 또는 텍스트',
    },
  },
  args: {
    title: '프로젝트 오로라',
    description: '차세대 제품을 위한 디자인 시스템 탐색',
    variant: 'default',
    isQuiet: false,
    isSelected: false,
    children: undefined,
  }
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  args: {
    children: (
      <div className="space-y-2 text-sm text-gray-700">
        <p>기본 스타일의 카드입니다.</p>
        <span className="text-xs text-gray-500">카드 내용이 여기에 들어갑니다.</span>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    title: '입체형 카드',
    description: '그림자가 있는 카드로 깊이감을 표현합니다.',
    variant: 'elevated',
    children: (
      <div className="space-y-2">
        <p>입체형 스타일의 카드입니다.</p>
        <button className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">자세히 보기</button>
      </div>
    ),
  }
};

export const QuietSelection: Story = {
  args: {
    title: '조용한 선택 카드',
    description: '선택 상태를 조용한 스타일로 표시합니다.',
    isQuiet: true,
    isSelected: true,
    children: (
      <div className="space-y-2">
        <p>선택된 상태의 조용한 카드입니다.</p>
        <span className="text-sm text-gray-500">마지막 업데이트: 2시간 전</span>
      </div>
    )
  }
};
