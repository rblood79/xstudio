import type { Meta, StoryObj } from '@storybook/react';
import { ToggleButton } from '../shared/components/ToggleButton';

const meta: Meta<typeof ToggleButton> = {
  title: 'Builder/Components/ToggleButton',
  component: ToggleButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria ToggleButton 컴포넌트를 래핑한 토글 버튼 컴포넌트입니다. 켜짐/꺼짐 상태를 전환하는 버튼입니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: '버튼 내부에 표시될 텍스트 또는 React 노드',
    },
    isSelected: {
      control: 'boolean',
      description: '토글 버튼이 선택된 (켜짐) 상태인지 여부 (제어용)',
    },
    defaultSelected: {
      control: 'boolean',
      description: '토글 버튼의 초기 선택 상태 (비제어용)',
    },
    isDisabled: {
      control: 'boolean',
      description: '토글 버튼 비활성화 여부',
    },
    onPress: { action: 'onPress', description: '버튼이 눌러질 때 호출되는 콜백' },
    onPressChange: { action: 'onPressChange', description: '버튼의 선택 상태가 변경될 때 호출되는 콜백' },
  },
  args: {
    children: '핀',
    isSelected: false,
    isDisabled: false,
  }
};

export default meta;

type Story = StoryObj<typeof ToggleButton>;

export const BasicToggleButton: Story = {
  args: {
    children: '저장',
  },
};

export const SelectedToggleButton: Story = {
  args: {
    children: '선택됨',
    isSelected: true,
  },
};

export const DisabledToggleButton: Story = {
  args: {
    children: '비활성화',
    isDisabled: true,
  },
};
