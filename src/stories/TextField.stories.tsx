import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Form } from 'react-aria-components';
import { Button } from '../builder/components/Button';
import { TextField } from '../builder/components/TextField';

const meta: Meta<typeof TextField> = {
  title: 'Builder/Components/TextField',
  component: TextField,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria TextField 컴포넌트를 래핑한 텍스트 입력 필드 컴포넌트입니다. 한 줄 텍스트 입력을 처리합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '텍스트 필드의 라벨',
    },
    placeholder: {
      control: 'text',
      description: '입력 필드에 표시될 플레이스홀더 텍스트',
    },
    description: {
      control: 'text',
      description: '텍스트 필드에 대한 추가 설명',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'search', 'tel', 'url'],
      description: '입력 필드의 유형',
    },
    value: {
      control: 'text',
      description: '제어되는 입력 필드의 값',
    },
    defaultValue: {
      control: 'text',
      description: '초기 입력 필드의 값 (비제어)',
    },
    isDisabled: {
      control: 'boolean',
      description: '텍스트 필드 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '텍스트 필드 읽기 전용 여부',
    },
    isInvalid: {
      control: 'boolean',
      description: '유효성 검사 실패 상태인지 여부',
    },
    isRequired: {
      control: 'boolean',
      description: '필수 입력 필드인지 여부',
    },
    onChange: { action: 'onChange', description: '입력 값 변경 시 호출되는 콜백' },
    onBlur: { action: 'onBlur', description: '입력 필드에서 포커스가 벗어날 때 호출되는 콜백' },
    onFocus: { action: 'onFocus', description: '입력 필드에 포커스가 들어올 때 호출되는 콜백' },
  },
  args: {
    label: '이름',
    placeholder: '이름을 입력하세요',
    type: 'text',
    isDisabled: false,
    isReadOnly: false,
    isInvalid: false,
    isRequired: false,
  }
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const BasicTextField: Story = {
  args: {
    label: '사용자 이름',
    placeholder: '사용자 이름을 입력하세요',
  },
};

export const PasswordField: Story = {
  args: {
    label: '비밀번호',
    type: 'password',
    placeholder: '비밀번호를 입력하세요',
  },
};

export const EmailField: Story = {
  args: {
    label: '이메일',
    type: 'email',
    placeholder: 'example@email.com',
  },
};

export const DisabledTextField: Story = {
  args: {
    label: '비활성화된 필드',
    defaultValue: '비활성화된 값',
    isDisabled: true,
  },
};

export const TextFieldWithValidation: Story = {
  render: (args) => (
    <Form className="flex flex-col gap-2 items-start p-4 border rounded-md shadow-sm bg-white">
      <TextField {...args} />
      <Button type="submit" variant="secondary" className="mt-2">제출</Button>
    </Form>
  ),
  args: {
    label: '필수 입력 필드',
    isRequired: true,
  },
};
