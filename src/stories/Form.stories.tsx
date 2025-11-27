import type { Meta } from '@storybook/react';
import { Button } from '../shared/components/Button';
import { DateField } from '../shared/components/DateField';
import { Form } from '../shared/components/Form';
import { TextField } from '../shared/components/TextField';
import { StoryObj } from '@storybook/react';

const meta: Meta<typeof Form> = {
  title: 'Builder/Components/Form',
  component: Form,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Form 컴포넌트를 래핑한 폼 컴포넌트입니다. 폼 요소들을 그룹화하고 유효성을 관리합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Form 자체의 props보다는 children을 통해 내부 컴포넌트 조합을 보여주는 것이 더 적합합니다.
    children: {
      control: 'text',
      description: 'Form 내부에 렌더링될 React 노드 (예: TextField, DateField, Button 등)',
    },
    onSubmit: { action: 'onSubmit', description: '폼 제출 시 호출되는 콜백' },
    onReset: { action: 'onReset', description: '폼 초기화 시 호출되는 콜백' },
  },
  args: {
    // Form 컴포넌트의 기본 args는 children에 의해 결정됩니다.
  }
};

export default meta;

type Story = StoryObj<typeof Form>;

export const BasicForm: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4 p-6 border rounded-md shadow-sm bg-white max-w-sm">
        <TextField label="이메일" name="email" type="email" isRequired />
        <DateField label="생년월일" isRequired />
        <div className="flex gap-2 justify-end mt-2">
          <Button type="reset" variant="secondary">초기화</Button>
          <Button type="submit">제출</Button>
        </div>
      </div>
    ),
  },
};
