/**
 * TextField Storybook - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import type { Meta, StoryObj } from '@storybook/react';
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
        component: `
Material Design 3 TextField component with 5 color variants and 3 size variants.

**M3 Variants:**
- **primary**: Main brand color (default)
- **secondary**: Supporting color
- **tertiary**: Accent color
- **error**: Error/destructive state
- **filled**: Filled style with bottom border

**Sizes:**
- **sm**: Small (compact forms)
- **md**: Medium (default)
- **lg**: Large (prominent inputs)

**Features:**
- Full M3 color role support
- All interactive states (hover, focus, disabled, invalid)
- WCAG AA compliant contrast ratios
- Dark mode automatic support
        `,
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
      options: ['text', 'password', 'email', 'search', 'tel', 'url', 'number'],
      description: '입력 필드의 유형',
    },
    value: {
      control: 'text',
      description: '제어되는 입력 필드의 값',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'error', 'filled'],
      description: 'M3 color variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
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
    onChange: { action: 'onChange' },
    onBlur: { action: 'onBlur' },
    onFocus: { action: 'onFocus' },
  },
  args: {
    label: '이름',
    placeholder: '이름을 입력하세요',
    type: 'text',
    variant: 'primary',
    size: 'md',
    isDisabled: false,
    isReadOnly: false,
    isInvalid: false,
    isRequired: false,
  }
};

export default meta;

type Story = StoryObj<typeof TextField>;

/* ========== Default Story ========== */
export const Default: Story = {
  args: {
    label: '사용자 이름',
    placeholder: '사용자 이름을 입력하세요',
  },
};

/* ========== All M3 Variants ========== */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
      <TextField
        label="Primary Variant"
        variant="primary"
        placeholder="Primary variant"
      />
      <TextField
        label="Secondary Variant"
        variant="secondary"
        placeholder="Secondary variant"
      />
      <TextField
        label="Tertiary Variant"
        variant="tertiary"
        placeholder="Tertiary variant"
      />
      <TextField
        label="Error Variant"
        variant="error"
        placeholder="Error variant"
      />
      <TextField
        label="Filled Variant"
        variant="filled"
        placeholder="Filled variant"
      />
    </div>
  ),
};

/* ========== All Sizes ========== */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
      <TextField
        label="Small Size"
        size="sm"
        placeholder="Small input"
      />
      <TextField
        label="Medium Size (Default)"
        size="md"
        placeholder="Medium input"
      />
      <TextField
        label="Large Size"
        size="lg"
        placeholder="Large input"
      />
    </div>
  ),
};

/* ========== Dark Mode - All Variants ========== */
export const DarkModeAllVariants: Story = {
  render: () => (
    <div data-theme="dark" style={{ padding: '32px', background: '#121212', minHeight: '400px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
        <TextField
          label="Primary (Dark)"
          variant="primary"
          placeholder="Primary variant"
        />
        <TextField
          label="Secondary (Dark)"
          variant="secondary"
          placeholder="Secondary variant"
        />
        <TextField
          label="Tertiary (Dark)"
          variant="tertiary"
          placeholder="Tertiary variant"
        />
        <TextField
          label="Error (Dark)"
          variant="error"
          placeholder="Error variant"
        />
        <TextField
          label="Filled (Dark)"
          variant="filled"
          placeholder="Filled variant"
        />
      </div>
    </div>
  ),
};

/* ========== Interactive States ========== */
export const InteractiveStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
      <TextField
        label="Default State"
        placeholder="Hover to see effect"
      />
      <TextField
        label="Disabled State"
        placeholder="Cannot edit"
        isDisabled
        value="Disabled value"
      />
      <TextField
        label="Read Only State"
        placeholder="Read only"
        isReadOnly
        value="Read-only value"
      />
      <TextField
        label="Required Field"
        placeholder="Required"
        isRequired
      />
    </div>
  ),
};

/* ========== Invalid State ========== */
export const InvalidState: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
      <TextField
        label="Invalid Primary"
        variant="primary"
        placeholder="Enter valid email"
        isInvalid
        errorMessage="Please enter a valid email address"
      />
      <TextField
        label="Invalid Secondary"
        variant="secondary"
        placeholder="Enter valid phone"
        isInvalid
        errorMessage="Invalid phone number format"
      />
      <TextField
        label="Invalid Filled"
        variant="filled"
        placeholder="Enter password"
        isInvalid
        errorMessage="Password must be at least 8 characters"
      />
    </div>
  ),
};

/* ========== Variant × Size Matrix ========== */
export const VariantSizeMatrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '16px' }}>
      {/* Primary */}
      <TextField variant="primary" size="sm" label="Primary SM" placeholder="Small" />
      <TextField variant="primary" size="md" label="Primary MD" placeholder="Medium" />
      <TextField variant="primary" size="lg" label="Primary LG" placeholder="Large" />

      {/* Secondary */}
      <TextField variant="secondary" size="sm" label="Secondary SM" placeholder="Small" />
      <TextField variant="secondary" size="md" label="Secondary MD" placeholder="Medium" />
      <TextField variant="secondary" size="lg" label="Secondary LG" placeholder="Large" />

      {/* Filled */}
      <TextField variant="filled" size="sm" label="Filled SM" placeholder="Small" />
      <TextField variant="filled" size="md" label="Filled MD" placeholder="Medium" />
      <TextField variant="filled" size="lg" label="Filled LG" placeholder="Large" />
    </div>
  ),
};

/* ========== Form Validation Example ========== */
export const FormValidation: Story = {
  render: () => (
    <Form className="flex flex-col gap-2 items-start p-4 border rounded-md shadow-sm bg-white">
      <TextField
        label="Email (Required)"
        type="email"
        variant="primary"
        placeholder="example@email.com"
        isRequired
      />
      <TextField
        label="Password (Required)"
        type="password"
        variant="secondary"
        placeholder="Min 8 characters"
        isRequired
      />
      <TextField
        label="Confirm Password"
        type="password"
        variant="tertiary"
        placeholder="Re-enter password"
      />
      <Button type="submit" variant="primary" className="mt-2">
        Submit
      </Button>
    </Form>
  ),
};

/* ========== Legacy Stories (Backward Compatibility) ========== */
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
    value: '비활성화된 값',
    isDisabled: true,
  },
};

/* ========== Accessibility Notes ========== */
export const AccessibilityContrast: Story = {
  render: () => (
    <div style={{ padding: '24px' }}>
      <h3>WCAG AA Compliance - Contrast Ratios</h3>
      <ul style={{ marginTop: '16px', lineHeight: '1.8' }}>
        <li>✅ <strong>Primary:</strong> Label vs. Container (4.5:1+ AA)</li>
        <li>✅ <strong>Secondary:</strong> Label vs. Container (4.5:1+ AA)</li>
        <li>✅ <strong>Error:</strong> Label vs. Container (4.5:1+ AA)</li>
        <li>✅ <strong>Filled:</strong> Input text vs. Background (7.0:1+ AAA)</li>
        <li>✅ <strong>Focus:</strong> Outline visible (2px solid)</li>
        <li>✅ <strong>Disabled:</strong> 0.38 opacity (clearly distinguishable)</li>
      </ul>

      <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <TextField variant="primary" label="Primary" placeholder="Test contrast" />
        <TextField variant="error" label="Error" placeholder="Test contrast" />
        <TextField variant="filled" label="Filled" placeholder="Test contrast" />
      </div>
    </div>
  ),
};
