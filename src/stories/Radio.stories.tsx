import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from '../builder/components/Radio';
import { RadioGroup } from '../builder/components/RadioGroup';

const meta: Meta<typeof Radio> = {
  title: 'Builder/Components/Radio',
  component: Radio,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Radio 컴포넌트를 래핑한 라디오 버튼 컴포넌트입니다. RadioGroup 내에서 단일 선택 옵션을 제공하는 데 사용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: '라디오 버튼 옆에 표시될 라벨 텍스트 또는 React 노드',
    },
    value: {
      control: 'text',
      description: '라디오 버튼의 고유 값. RadioGroup에서 선택을 식별하는 데 사용됩니다.',
    },
    isDisabled: {
      control: 'boolean',
      description: '라디오 버튼 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '라디오 버튼 읽기 전용 여부',
    },
    // Radio 컴포넌트 자체의 상태는 주로 RadioGroup에 의해 제어됩니다.
  },
  args: {
    isDisabled: false,
    isReadOnly: false,
    children: '라디오 옵션',
    value: 'option1',
  }
};

export default meta;

type Story = StoryObj<typeof Radio>;

export const BasicRadio: Story = {
  args: {
    children: '기본 라디오 버튼',
    value: 'basic',
  },
};

export const DisabledRadio: Story = {
  args: {
    children: '비활성화된 라디오 버튼',
    value: 'disabled',
    isDisabled: true,
  },
};

// RadioGroup과 함께 사용되는 예시는 RadioGroup.stories.tsx에서 다룹니다.
// 여기서는 개별 Radio 컴포넌트의 속성만 보여줍니다.
