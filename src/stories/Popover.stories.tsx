import type { Meta, StoryObj } from '@storybook/react';
import { HelpCircle } from 'lucide-react';
import { DialogTrigger, Heading } from 'react-aria-components';
import { Button } from '../shared/components/Button';
import { Dialog } from '../shared/components/Dialog';
import { Popover } from '../shared/components/Popover';

const meta: Meta<typeof Popover> = {
  title: 'Builder/Components/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Popover 컴포넌트를 래핑한 팝오버 컴포넌트입니다. 다른 UI 요소 위에 정보나 추가 컨텐츠를 표시합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: '팝오버 내부에 렌더링될 React 노드 (예: Dialog, Tooltip 등)',
    },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right', 'start', 'end'],
      description: '팝오버가 트리거 요소에 대해 표시될 위치',
    },
    containerPadding: {
      control: 'number',
      description: '팝오버와 뷰포트 가장자리 사이의 최소 패딩',
    },
    crossOffset: {
      control: 'number',
      description: '주 축에 수직으로 팝오버를 이동하는 양',
    },
    offset: {
      control: 'number',
      description: '팝오버와 트리거 요소 사이의 거리',
    },
    isOpen: {
      control: 'boolean',
      description: '팝오버가 열려있는지 여부 (제어용)',
    },
    defaultOpen: {
      control: 'boolean',
      description: '팝오버의 초기 열림 상태 (비제어용)',
    },
    onOpenChange: { action: 'onOpenChange', description: '팝오버의 열림 상태가 변경될 때 호출되는 콜백' },
  },
  args: {
    placement: 'bottom',
    offset: 10,
  }
};

export default meta;

type Story = StoryObj<typeof Popover>;

export const BasicPopover: Story = {
  render: (args) => (
    <DialogTrigger>
      <Button variant="ghost" aria-label="도움말"><HelpCircle className="w-4 h-4" /></Button>
      <Popover {...args} className="max-w-[250px] p-4 bg-white shadow-lg rounded-md">
        <Dialog>
          <Heading slot="title" className="text-lg font-semibold mb-2">도움말</Heading>
          <p className="text-sm text-gray-700">계정 접근에 대한 도움말은 고객 지원팀에 문의하십시오.</p>
        </Dialog>
      </Popover>
    </DialogTrigger>
  ),
  args: {
    children: undefined, // render 함수에서 직접 정의되므로 여기서는 undefined
  },
};
