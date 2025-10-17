import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ComboBox, ComboBoxItem } from '../builder/components/ComboBox';

const fruits = [
  { id: 'apple', name: 'Apple' },
  { id: 'banana', name: 'Banana' },
  { id: 'cherry', name: 'Cherry' },
  { id: 'grape', name: 'Grape' },
  { id: 'orange', name: 'Orange' }
];

function ControlledComboBox(props: { label?: string }) {
  const [inputValue, setInputValue] = useState('');

  return (
    <ComboBox
      label={props.label}
      inputValue={inputValue}
      onInputChange={setInputValue}
      items={fruits}
    >
      {(item: { id: string; name: string }) => (
        <ComboBoxItem key={item.id}>{item.name}</ComboBoxItem>
      )}
    </ComboBox>
  );
}

const meta: Meta<typeof ComboBox> = {
  title: 'Builder/Components/ComboBox',
  component: ComboBox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria ComboBox 컴포넌트를 래핑한 콤보박스 컴포넌트입니다. 텍스트 입력과 드롭다운 목록을 결합하여 선택을 용이하게 합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: '콤보박스의 라벨',
    },
    placeholder: {
      control: 'text',
      description: '입력 필드에 표시될 플레이스홀더 텍스트',
    },
    description: {
      control: 'text',
      description: '콤보박스에 대한 추가 설명',
    },
    errorMessage: {
      control: 'text',
      description: '유효성 검사 실패 시 표시될 메시지',
    },
    isDisabled: {
      control: 'boolean',
      description: '콤보박스 비활성화 여부',
    },
    isReadOnly: {
      control: 'boolean',
      description: '콤보박스 읽기 전용 여부',
    },
    isInvalid: {
      control: 'boolean',
      description: '유효성 검사 실패 상태인지 여부',
    },
    selectedKey: {
      control: 'text',
      description: '제어되는 선택된 항목의 키',
    },
    defaultSelectedKey: {
      control: 'text',
      description: '초기 선택된 항목의 키 (비제어)',
    },
    inputValue: {
      control: 'text',
      description: '제어되는 입력 필드의 값',
    },
    defaultInputValue: {
      control: 'text',
      description: '초기 입력 필드의 값 (비제어)',
    },
    defaultItems: {
      table: { disable: true }
    },
    items: {
      table: { disable: true }
    },
    onSelectionChange: { action: 'onSelectionChange', description: '항목 선택 시 호출되는 콜백' },
    onInputChange: { action: 'onInputChange', description: '입력 필드 값 변경 시 호출되는 콜백' },
  },
  args: {
    label: '과일을 선택하세요',
    placeholder: '과일을 입력하거나 선택하세요',
    isDisabled: false,
    isReadOnly: false,
    isInvalid: false,
  }
};

export default meta;

type Story = StoryObj<typeof ComboBox>;

export const Basic: Story = {
  render: (args) => (
    <ComboBox label={args.label} placeholder={args.placeholder} items={fruits}>
      {(item: { id: string; name: string }) => <ComboBoxItem key={item.id}>{item.name}</ComboBoxItem>}
    </ComboBox>
  )
};

export const WithControlledValue: Story = {
  render: (args) => <ControlledComboBox {...args} label="제어되는 콤보박스" />
};
