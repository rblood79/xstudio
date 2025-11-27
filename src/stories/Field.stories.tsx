import type { Meta, StoryObj } from '@storybook/react';
import {
  FieldGroup,
  Label,
  Input,
  Description,
  FieldError
} from '../shared/components/Field';

const meta: Meta<typeof FieldGroup> = {
  title: 'Builder/Components/Field',
  component: FieldGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria FieldGroup 컴포넌트를 래핑한 필드 그룹 컴포넌트입니다. 라벨, 입력, 설명, 오류 메시지 등 폼 요소를 구조화하는 데 사용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // FieldGroup 자체의 props보다는 children을 통해 내부 컴포넌트 조합을 보여주는 것이 더 적합합니다.
    // children prop을 통해 FieldGroup 내부의 Label, Input, Description, FieldError 등의 조합을 보여줍니다.
    children: {
      control: 'text',
      description: 'FieldGroup 내부에 렌더링될 React 노드 (예: Label, Input, Description, FieldError)',
    },
    isInvalid: {
      control: 'boolean',
      description: '필드 그룹이 유효하지 않은 상태인지 여부',
    },
  },
  args: {
    isInvalid: false,
  }
};

export default meta;

type Story = StoryObj<typeof FieldGroup>;

export const BasicField: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-2 max-w-sm">
        <Label htmlFor="field-basic">기본 라벨</Label>
        <Input id="field-basic" placeholder="무엇이든 입력하세요" />
        <Description>입력에 대한 유용한 지침입니다.</Description>
      </div>
    ),
  },
};

export const FieldWithError: Story = {
  args: {
    isInvalid: true,
    children: (
      <div className="flex flex-col gap-2 max-w-sm">
        <Label htmlFor="field-error-input">이메일</Label>
        <Input id="field-error-input" placeholder="you@example.com" value="invalid-email" />
        <FieldError>유효한 이메일 주소를 제공해주세요.</FieldError>
      </div>
    ),
  },
};

export const FieldWithPrefixAndSuffix: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-2 max-w-sm">
        <Label htmlFor="field-prefix-suffix">사용자명</Label>
        <FieldGroup className="flex items-center rounded-md border border-gray-300 focus-within:border-blue-500">
          <span className="px-2 text-gray-500">@</span>
          <Input id="field-prefix-suffix" placeholder="사용자명" className="flex-1 border-none focus:ring-0" />
          <span className="px-2 text-gray-500">.com</span>
        </FieldGroup>
      </div>
    ),
  },
};
