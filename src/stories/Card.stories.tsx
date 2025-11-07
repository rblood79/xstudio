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
      options: ['default', 'primary', 'secondary', 'surface', 'elevated', 'outlined'],
      description: '카드의 시각적 변형',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: '카드의 크기',
    },
    isQuiet: {
      control: 'boolean',
      description: '조용한 (배경 없는) 스타일을 적용할지 여부',
    },
    isDisabled: {
      control: 'boolean',
      description: '비활성화 상태 여부',
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
    size: 'md',
    isQuiet: false,
    isDisabled: false,
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

export const QuietCard: Story = {
  args: {
    title: '조용한 카드',
    description: '배경 없는 조용한 스타일의 카드입니다.',
    isQuiet: true,
    children: (
      <div className="space-y-2">
        <p>조용한 스타일의 카드입니다.</p>
        <span className="text-sm text-gray-500">마지막 업데이트: 2시간 전</span>
      </div>
    )
  }
};

export const Outlined: Story = {
  args: {
    title: '외곽선 카드',
    description: '테두리가 있는 카드 스타일입니다.',
    variant: 'outlined',
    children: (
      <div className="space-y-2">
        <p>외곽선 스타일의 카드입니다.</p>
        <span className="text-sm text-gray-500">간결한 테두리 디자인</span>
      </div>
    )
  }
};

export const Primary: Story = {
  args: {
    title: '주요 액션 카드',
    description: 'Primary Action 토큰을 사용한 카드입니다.',
    variant: 'primary',
    children: (
      <div className="space-y-2">
        <p>주요 액션을 강조하는 카드 스타일입니다.</p>
        <button className="px-3 py-1 rounded-md bg-white bg-opacity-20 text-white text-sm">
          자세히 보기
        </button>
      </div>
    ),
  }
};

export const Secondary: Story = {
  args: {
    title: '보조 액션 카드',
    description: 'Secondary Action 토큰을 사용한 카드입니다.',
    variant: 'secondary',
    children: (
      <div className="space-y-2">
        <p>보조 액션을 표시하는 카드 스타일입니다.</p>
        <span className="text-sm opacity-90">선택적 작업에 사용됩니다.</span>
      </div>
    ),
  }
};

export const Surface: Story = {
  args: {
    title: '표면 카드',
    description: 'Surface Action 토큰을 사용한 카드입니다.',
    variant: 'surface',
    children: (
      <div className="space-y-2">
        <p>중립적인 표면 스타일의 카드입니다.</p>
        <span className="text-sm opacity-90">다목적 카드 디자인</span>
      </div>
    ),
  }
};
