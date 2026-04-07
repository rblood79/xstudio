---
title: Create Stories for UI Components
impact: MEDIUM
impactDescription: 시각적 테스트, 문서화, 컴포넌트 카탈로그
tags: [testing, storybook, documentation]
---

모든 UI 컴포넌트에 대해 .stories.tsx 파일을 생성합니다.

## Incorrect

```
// ❌ 스토리 없는 컴포넌트 구조
components/
  Button/
    Button.tsx
    Button.test.tsx
    index.ts
```

## Correct

```tsx
// ✅ 스토리 포함 컴포넌트 구조
// components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  )
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button'
  }
};
```
