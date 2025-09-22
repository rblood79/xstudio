import type { Meta, StoryObj } from '@storybook/react';
import { Tab, TabList, TabPanel, Tabs } from '../builder/components/Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Builder/Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'React Aria Tabs 컴포넌트를 래핑한 탭 컴포넌트입니다. 여러 패널 사이를 탐색할 수 있는 탭 인터페이스를 제공합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'TabList와 TabPanel 컴포넌트들',
    },
    selectedKey: {
      control: 'text',
      description: '현재 선택된 탭의 키 (제어용)',
    },
    defaultSelectedKey: {
      control: 'text',
      description: '초기 선택된 탭의 키 (비제어용)',
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: '탭 목록의 방향 (가로 또는 세로)',
    },
    keyboardActivation: {
      control: 'radio',
      options: ['automatic', 'manual'],
      description: '키보드 탐색 시 탭 활성화 방식 (자동 또는 수동)',
    },
    onSelectionChange: { action: 'onSelectionChange', description: '선택된 탭이 변경될 때 호출되는 콜백' },
  },
  args: {
    selectedKey: 'overview',
    orientation: 'horizontal',
    keyboardActivation: 'automatic',
    children: (
      <>
        <TabList aria-label="프로젝트 섹션">
          <Tab id="overview">개요</Tab>
          <Tab id="details">세부 정보</Tab>
          <Tab id="activity">활동</Tab>
        </TabList>
        <TabPanel id="overview">개요 내용이 여기에 표시됩니다.</TabPanel>
        <TabPanel id="details">자세한 정보가 여기에 나타납니다.</TabPanel>
        <TabPanel id="activity">최근 활동이 여기에 표시됩니다.</TabPanel>
      </>
    ),
  }
};

export default meta;

type Story = StoryObj<typeof Tabs>;

export const BasicTabs: Story = {
  args: {
    children: (
      <Tabs className="w-[360px]" selectedKey="overview">
        <TabList aria-label="기본 탭">
          <Tab id="tab1">탭 1</Tab>
          <Tab id="tab2">탭 2</Tab>
        </TabList>
        <TabPanel id="tab1">탭 1 내용</TabPanel>
        <TabPanel id="tab2">탭 2 내용</TabPanel>
      </Tabs>
    ),
  },
};

export const TabsWithDisabledTab: Story = {
  args: {
    selectedKey: 'general',
    children: (
      <Tabs className="w-[360px]" selectedKey="general">
        <TabList aria-label="설정 탭">
          <Tab id="general">일반</Tab>
          <Tab id="security" isDisabled>보안</Tab>
          <Tab id="notifications">알림</Tab>
        </TabList>
        <TabPanel id="general">일반 설정 양식.</TabPanel>
        <TabPanel id="security">보안 옵션은 비활성화되어 있습니다.</TabPanel>
        <TabPanel id="notifications">알림 환경설정.</TabPanel>
      </Tabs>
    ),
  }
};

export const VerticalTabs: Story = {
  args: {
    orientation: 'vertical',
    selectedKey: 'messages',
    children: (
      <Tabs className="flex h-[200px] w-[400px]" orientation="vertical" selectedKey="messages">
        <TabList aria-label="수직 탭">
          <Tab id="messages">메시지</Tab>
          <Tab id="profile">프로필</Tab>
          <Tab id="settings">설정</Tab>
        </TabList>
        <TabPanel id="messages" className="flex-1 p-4 border-l border-gray-200">메시지 내용</TabPanel>
        <TabPanel id="profile" className="flex-1 p-4 border-l border-gray-200">프로필 내용</TabPanel>
        <TabPanel id="settings" className="flex-1 p-4 border-l border-gray-200">설정 내용</TabPanel>
      </Tabs>
    ),
  },
};
