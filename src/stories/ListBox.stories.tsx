import type { Meta, StoryObj } from '@storybook/react';
import { ListBox, ListBoxItem } from '../builder/components/ListBox';

const meta: Meta<typeof ListBox> = {
  title: 'Builder/Components/ListBox',
  component: ListBox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria ListBox 컴포넌트를 래핑한 목록 상자 컴포넌트입니다. 선택 가능한 항목 목록을 표시합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'ListBoxItem 컴포넌트 또는 항목을 렌더링할 함수',
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
    'aria-label': '아이스크림 맛',
    selectionMode: 'multiple',
  }
};

export default meta;

type Story = StoryObj<typeof ListBox>;

export const BasicListBox: Story = {
  args: {
    children: (
      <>
        <ListBoxItem id="chocolate">초콜릿</ListBoxItem>
        <ListBoxItem id="mint">민트</ListBoxItem>
        <ListBoxItem id="strawberry">딸기</ListBoxItem>
        <ListBoxItem id="vanilla">바닐라</ListBoxItem>
      </>
    ),
  },
};

export const SingleSelection: Story = {
  args: {
    selectionMode: 'single',
    children: (
      <>
        <ListBoxItem id="apple">사과</ListBoxItem>
        <ListBoxItem id="banana">바나나</ListBoxItem>
        <ListBoxItem id="orange">오렌지</ListBoxItem>
      </>
    ),
  },
};

export const DisabledItems: Story = {
  args: {
    disabledKeys: ['mint', 'strawberry'],
    children: (
      <>
        <ListBoxItem id="chocolate">초콜릿</ListBoxItem>
        <ListBoxItem id="mint">민트</ListBoxItem>
        <ListBoxItem id="strawberry">딸기</ListBoxItem>
        <ListBoxItem id="vanilla">바닐라</ListBoxItem>
      </>
    ),
  },
};
