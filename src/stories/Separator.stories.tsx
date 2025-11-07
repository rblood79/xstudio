import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../builder/components/Separator';

const meta: Meta<typeof Separator> = {
  title: 'Components/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: '구분선의 방향',
    },
    variant: {
      control: 'radio',
      options: ['default', 'dashed', 'dotted'],
      description: '구분선의 시각적 변형',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: '구분선의 굵기',
    },
  },
  args: {
    orientation: 'horizontal',
    variant: 'default',
    size: 'md',
  }
};

export default meta;

type Story = StoryObj<typeof Separator>;

export const HorizontalDefault: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'default',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <div>상단 콘텐츠</div>
        <Story />
        <div>하단 콘텐츠</div>
      </div>
    ),
  ],
};

export const HorizontalDashed: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'dashed',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <div>상단 콘텐츠</div>
        <Story />
        <div>하단 콘텐츠</div>
      </div>
    ),
  ],
};

export const HorizontalDotted: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'dotted',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <div>상단 콘텐츠</div>
        <Story />
        <div>하단 콘텐츠</div>
      </div>
    ),
  ],
};

export const VerticalDefault: Story = {
  args: {
    orientation: 'vertical',
    variant: 'default',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100px', alignItems: 'center' }}>
        <div>좌측 콘텐츠</div>
        <Story />
        <div>우측 콘텐츠</div>
      </div>
    ),
  ],
};

export const VerticalDashed: Story = {
  args: {
    orientation: 'vertical',
    variant: 'dashed',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100px', alignItems: 'center' }}>
        <div>좌측 콘텐츠</div>
        <Story />
        <div>우측 콘텐츠</div>
      </div>
    ),
  ],
};

export const SmallSize: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'default',
    size: 'sm',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <div>작은 간격의 구분선</div>
        <Story />
        <div>다음 콘텐츠</div>
      </div>
    ),
  ],
};

export const LargeSize: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'default',
    size: 'lg',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <div>큰 간격의 구분선</div>
        <Story />
        <div>다음 콘텐츠</div>
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  decorators: [
    () => (
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>Default</p>
          <Separator variant="default" size="md" />
        </div>
        <div>
          <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>Dashed</p>
          <Separator variant="dashed" size="md" />
        </div>
        <div>
          <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>Dotted</p>
          <Separator variant="dotted" size="md" />
        </div>
        <div>
          <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>Small (Default)</p>
          <Separator variant="default" size="sm" />
        </div>
        <div>
          <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>Large (Default)</p>
          <Separator variant="default" size="lg" />
        </div>
      </div>
    ),
  ],
};
