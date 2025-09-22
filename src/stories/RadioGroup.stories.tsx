import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Form, Radio } from 'react-aria-components'; // Radio 추가
import { Button } from '../builder/components/Button';
import { RadioGroup } from '../builder/components/RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Builder/Components/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria RadioGroup 컴포넌트를 래핑한 라디오 그룹 컴포넌트입니다. 여러 라디오 버튼 중 하나를 선택할 수 있도록 그룹화합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '라디오 그룹의 라벨',
    },
    description: {
      control: 'text',
      description: '라디오 그룹에 대한 추가 설명',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
    isDisabled: {
      control: 'boolean',
      description: '라디오 그룹 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '라디오 그룹 읽기 전용 여부',
    },
    isInvalid: {
      control: 'boolean',
      description: '유효성 검사 실패 상태인지 여부',
    },
    isRequired: {
      control: 'boolean',
      description: '필수 입력 필드인지 여부',
    },
    orientation: {
      control: 'radio',
      options: ['vertical', 'horizontal'],
      description: '라디오 버튼 항목의 레이아웃 방향',
    },
    value: {
      control: 'text',
      description: '제어되는 선택된 라디오 버튼의 값',
    },
    defaultValue: {
      control: 'text',
      description: '초기 선택된 라디오 버튼의 값 (비제어)',
    },
    onChange: { action: 'onChange', description: '선택된 값 변경 시 호출되는 콜백' },
  },
  args: {
    label: '좋아하는 스포츠',
    isDisabled: false,
    isReadOnly: false,
    isInvalid: false,
    isRequired: false,
    description: '',
    orientation: 'vertical',
    defaultValue: 'soccer',
  }
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const DefaultRadioGroup: Story = {
  args: {
    children: (
      <>
        <Radio value="soccer">축구</Radio>
        <Radio value="baseball">야구</Radio>
        <Radio value="basketball">농구</Radio>
      </>
    ),
  },
};

export const HorizontalRadioGroup: Story = {
  args: {
    orientation: 'horizontal',
    label: '배송 속도',
    defaultValue: 'standard',
    children: (
      <>
        <Radio value="standard">일반</Radio>
        <Radio value="express">특급</Radio>
        <Radio value="overnight">익일</Radio>
      </>
    ),
  },
};

export const RadioGroupWithValidation: Story = {
  render: (args) => (
    <Form className="flex flex-col gap-2 items-start p-4 border rounded-md shadow-sm bg-white">
      <RadioGroup {...args} />
      <Button type="submit" variant="secondary" className="mt-2">제출</Button>
    </Form>
  ),
  args: {
    label: '필수 항목 라디오 그룹',
    isRequired: true,
    children: (
      <>
        <Radio value="option1">옵션 1</Radio>
        <Radio value="option2">옵션 2</Radio>
      </>
    ),
  },
};
