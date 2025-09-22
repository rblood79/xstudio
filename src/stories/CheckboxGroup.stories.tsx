import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../builder/components/Checkbox';
import { CheckboxGroup } from '../builder/components/CheckboxGroup';

const meta: Meta<typeof CheckboxGroup> = {
  title: 'Builder/Components/CheckboxGroup',
  component: CheckboxGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria CheckboxGroup 컴포넌트를 래핑한 체크박스 그룹 컴포넌트입니다. 여러 체크박스를 그룹화하고 관리합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '체크박스 그룹의 라벨',
    },
    description: {
      control: 'text',
      description: '체크박스 그룹에 대한 추가 설명',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
    isDisabled: {
      control: 'boolean',
      description: '체크박스 그룹 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '체크박스 그룹 읽기 전용 여부',
    },
    isInvalid: {
      control: 'boolean',
      description: '유효성 검사 실패 상태인지 여부',
    },
    orientation: {
      control: 'radio',
      options: ['vertical', 'horizontal'],
      description: '체크박스 항목의 레이아웃 방향',
    },
    value: {
      control: 'array',
      description: '제어되는 선택된 값 배열',
    },
    defaultValue: {
      control: 'array',
      description: '초기 선택된 값 배열 (비제어)',
    },
    onChange: { action: 'onChange', description: '선택된 값 변경 시 호출되는 콜백' },
  },
  args: {
    label: '뉴스레터 주제',
    description: '관심 있는 주제를 선택하세요.',
    isInvalid: false,
    isDisabled: false,
    isReadOnly: false,
    orientation: 'vertical',
    defaultValue: ['updates'],
  }
};

export default meta;

type Story = StoryObj<typeof CheckboxGroup>;

export const Basic: Story = {
  render: (args) => (
    <CheckboxGroup {...args}>
      <Checkbox value="updates">제품 업데이트</Checkbox>
      <Checkbox value="events">이벤트</Checkbox>
      <Checkbox value="offers">특별 할인</Checkbox>
    </CheckboxGroup>
  )
};

export const Horizontal: Story = {
  render: (args) => (
    <CheckboxGroup {...args} orientation="horizontal">
      <Checkbox value="coffee">커피</Checkbox>
      <Checkbox value="tea">차</Checkbox>
      <Checkbox value="juice">주스</Checkbox>
    </CheckboxGroup>
  )
};
