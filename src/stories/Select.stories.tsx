import type { Meta, StoryObj } from '@storybook/react';
import { Form, Section, Header } from 'react-aria-components';
import { Button } from '../shared/components/Button';
import { Select, SelectItem } from '../shared/components/Select';

const meta: Meta<typeof Select> = {
  title: 'Builder/Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Select 컴포넌트를 래핑한 선택 상자 컴포넌트입니다. 드롭다운 목록에서 단일 항목을 선택할 수 있습니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '선택 상자의 라벨',
    },
    description: {
      control: 'text',
      description: '선택 상자에 대한 추가 설명',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
    isDisabled: {
      control: 'boolean',
      description: '선택 상자 비활성화 여부',
    },
    isInvalid: {
      control: 'boolean',
      description: '유효성 검사 실패 상태인지 여부',
    },
    isRequired: {
      control: 'boolean',
      description: '필수 입력 필드인지 여부',
    },
    selectedKey: {
      control: 'text',
      description: '제어되는 선택된 항목의 키',
    },
    defaultSelectedKey: {
      control: 'text',
      description: '초기 선택된 항목의 키 (비제어)',
    },
    onSelectionChange: { action: 'onSelectionChange', description: '항목 선택 변경 시 호출되는 콜백' },
    onOpenChange: { action: 'onOpenChange', description: '선택 상자 열림/닫힘 상태 변경 시 호출되는 콜백' },
  },
  args: {
    label: '아이스크림 맛',
    isDisabled: false,
    isInvalid: false,
    isRequired: false,
    children: (
      <>
        <SelectItem id="chocolate">초콜릿</SelectItem>
        <SelectItem id="mint">민트</SelectItem>
        <SelectItem id="strawberry">딸기</SelectItem>
        <SelectItem id="vanilla">바닐라</SelectItem>
      </>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const BasicSelect: Story = {
  args: {
    label: '기본 선택 상자',
  },
};

export const SelectWithDisabledItems: Story = {
  args: {
    label: '비활성화된 항목이 있는 선택 상자',
    disabledKeys: ['mint'],
  },
};

export const SelectWithSections: Story = {
  args: {
    label: '섹션이 있는 선택 상자',
    children: (
      <>
        <Section>
          <Header>과일</Header>
          <SelectItem id="apple">사과</SelectItem>
          <SelectItem id="banana">바나나</SelectItem>
          <SelectItem id="orange">오렌지</SelectItem>
        </Section>
        <Section>
          <Header>채소</Header>
          <SelectItem id="carrot">당근</SelectItem>
          <SelectItem id="broccoli">브로콜리</SelectItem>
          <SelectItem id="spinach">시금치</SelectItem>
        </Section>
      </>
    ),
  },
};

export const SelectWithValidation: Story = {
  render: (args) => (
    <Form className="flex flex-col gap-2 items-start p-4 border rounded-md shadow-sm bg-white">
      <Select {...args} />
      <Button type="submit" variant="secondary" className="mt-2">제출</Button>
    </Form>
  ),
  args: {
    label: '필수 선택 상자',
    isRequired: true,
    children: (
      <>
        <SelectItem id="option1">옵션 1</SelectItem>
        <SelectItem id="option2">옵션 2</SelectItem>
      </>
    ),
  },
};
