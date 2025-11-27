import type { Meta, StoryObj } from '@storybook/react';
import { ToggleButton } from '../shared/components/ToggleButton';
import { ToggleButtonGroup } from '../shared/components/ToggleButtonGroup';

const meta: Meta<typeof ToggleButtonGroup> = {
  title: 'Builder/Components/ToggleButtonGroup',
  component: ToggleButtonGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria ToggleButtonGroup 컴포넌트를 래핑한 토글 버튼 그룹 컴포넌트입니다. 여러 토글 버튼 중 하나 또는 여러 개를 선택할 수 있도록 그룹화합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'ToggleButton 컴포넌트들',
    },
    selectionMode: {
      control: 'radio',
      options: ['single', 'multiple'],
      description: '버튼 선택 모드 (단일 또는 다중)',
    },
    selectedKeys: {
      control: 'object',
      description: '제어되는 선택된 버튼들의 키 배열',
    },
    defaultSelectedKeys: {
      control: 'object',
      description: '초기 선택된 버튼들의 키 배열 (비제어)',
    },
    isDisabled: {
      control: 'boolean',
      description: '토글 버튼 그룹 비활성화 여부',
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: '토글 버튼 항목의 레이아웃 방향',
    },
    onSelectionChange: { action: 'onSelectionChange', description: '선택된 버튼 변경 시 호출되는 콜백' },
  },
  args: {
    selectionMode: 'multiple',
    isDisabled: false,
    orientation: 'horizontal',
    defaultSelectedKeys: ['bold'],
    children: (
      <>
        <ToggleButton id="bold" aria-label="굵게">굵게</ToggleButton>
        <ToggleButton id="italic" aria-label="기울임">기울임</ToggleButton>
        <ToggleButton id="underline" aria-label="밑줄">밑줄</ToggleButton>
      </>
    ),
  }
};

export default meta;

type Story = StoryObj<typeof ToggleButtonGroup>;

export const BasicToggleButtonGroup: Story = {};

export const SingleSelectionGroup: Story = {
  args: {
    selectionMode: 'single',
    defaultSelectedKeys: ['left'],
    children: (
      <>
        <ToggleButton id="left" aria-label="왼쪽 정렬">왼쪽</ToggleButton>
        <ToggleButton id="center" aria-label="가운데 정렬">가운데</ToggleButton>
        <ToggleButton id="right" aria-label="오른쪽 정렬">오른쪽</ToggleButton>
      </>
    ),
  },
};

export const VerticalToggleButtonGroup: Story = {
  args: {
    orientation: 'vertical',
    selectionMode: 'single',
    defaultSelectedKeys: ['optionA'],
    children: (
      <>
        <ToggleButton id="optionA">옵션 A</ToggleButton>
        <ToggleButton id="optionB">옵션 B</ToggleButton>
        <ToggleButton id="optionC">옵션 C</ToggleButton>
      </>
    ),
  },
};
