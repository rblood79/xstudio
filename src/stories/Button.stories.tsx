import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../builder/components/Button';

const meta: Meta<typeof Button> = {
  title: 'Builder/Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria 기반의 접근 가능한 버튼 컴포넌트입니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'surface'],
      description: '버튼의 시각적 스타일 변형',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: '버튼의 크기',
    },
    isDisabled: {
      control: 'boolean',
      description: '버튼 비활성화 상태',
    },
    children: {
      control: 'text',
      description: '버튼 내용',
    },
    onBlur: { action: 'onBlur' },
    onFocus: { action: 'onFocus' },
    onFocusChange: { action: 'onFocusChange' },
    onHoverChange: { action: 'onHoverChange' },
    onHoverEnd: { action: 'onHoverEnd' },
    onHoverStart: { action: 'onHoverStart' },
    onKeyDown: { action: 'onKeyDown' },
    onKeyUp: { action: 'onKeyUp' },
    onPress: { action: 'onPress' },
    onPressChange: { action: 'onPressChange' },
    onPressEnd: { action: 'onPressEnd' },
    onPressStart: { action: 'onPressStart' },
    onPressUp: { action: 'onPressUp' },
  },
  args: {
    isDisabled: false,
    children: '버튼',
    variant: 'primary',
    size: 'md',
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: '기본 버튼',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: '보조 버튼',
    variant: 'secondary',
  },
};

export const Surface: Story = {
  args: {
    children: 'Surface 버튼',
    variant: 'surface',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <Button size="sm">작은 버튼</Button>
      <Button size="md">보통 버튼</Button>
      <Button size="lg">큰 버튼</Button>
    </div>
  ),
};
