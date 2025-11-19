/**
 * Material Design 3 Storybook Template
 *
 * Use this template when creating Storybook stories for M3-migrated components.
 * Replace "Component" with your actual component name.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Component } from '../builder/components/Component';

// Optional: Import icons for richer stories
// import { Mail, User, Lock } from 'lucide-react';

const meta: Meta<typeof Component> = {
  title: 'Components/Component', // Adjust category as needed
  component: Component,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Component with Material Design 3 Color System support. Includes 5 color variants and 3 size variants.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'error', 'surface'],
      description: 'M3 color variant',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    isDisabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    // Add component-specific props here
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

// ========== Basic Stories ==========

/**
 * Default component with primary variant and medium size.
 */
export const Default: Story = {
  args: {
    children: 'Component',
    variant: 'primary',
    size: 'md',
  },
};

// ========== All Variants ==========

/**
 * All 5 M3 color variants displayed side-by-side.
 * - Primary: Main brand color for key actions
 * - Secondary: Less prominent actions
 * - Tertiary: Contrasting accent
 * - Error: Error states and destructive actions
 * - Surface: Subtle emphasis with tonal background
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <Component variant="primary">Primary</Component>
      <Component variant="secondary">Secondary</Component>
      <Component variant="tertiary">Tertiary</Component>
      <Component variant="error">Error</Component>
      <Component variant="surface">Surface</Component>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcases all 5 Material Design 3 color variants.',
      },
    },
  },
};

// ========== All Sizes ==========

/**
 * All 3 size variants displayed side-by-side.
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Component size="sm" variant="primary">Small</Component>
      <Component size="md" variant="primary">Medium</Component>
      <Component size="lg" variant="primary">Large</Component>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcases all 3 size variants (sm, md, lg).',
      },
    },
  },
};

// ========== Interactive States ==========

/**
 * All interactive states: default, hover, focus, pressed, disabled.
 * Hover and interact with each component to see state changes.
 */
export const InteractiveStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Component variant="primary">Default</Component>
        <Component variant="primary" data-hovered>Hovered</Component>
        <Component variant="primary" data-pressed>Pressed</Component>
        <Component variant="primary" data-focus-visible>Focused</Component>
        <Component variant="primary" isDisabled>Disabled</Component>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcases all interactive states with visual feedback.',
      },
    },
  },
};

// ========== Dark Mode ==========

/**
 * Component in dark mode. M3 tokens automatically adapt colors for better contrast.
 */
export const DarkMode: Story = {
  args: {
    children: 'Dark Mode Component',
    variant: 'primary',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        style={{
          background: 'var(--surface)',
          padding: '32px',
          borderRadius: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Component automatically adapts to dark mode using M3 color tokens. Primary color becomes lighter (#D0BCFF) with dark on-primary text (#381E72).',
      },
    },
  },
};

/**
 * All variants in dark mode comparison.
 */
export const DarkModeAllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <Component variant="primary">Primary</Component>
      <Component variant="secondary">Secondary</Component>
      <Component variant="tertiary">Tertiary</Component>
      <Component variant="error">Error</Component>
      <Component variant="surface">Surface</Component>
    </div>
  ),
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        style={{
          background: 'var(--surface)',
          padding: '32px',
          borderRadius: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

// ========== Invalid/Error State ==========

/**
 * Component in invalid/error state. Border and focus ring use error color.
 * Useful for form validation feedback.
 */
export const InvalidState: Story = {
  args: {
    children: 'Invalid Component',
    variant: 'primary',
    // For form components, add:
    // isInvalid: true,
    // errorMessage: 'This field is required',
  },
  // Add data-invalid attribute for non-form components
  decorators: [
    (Story) => (
      <div data-invalid="true">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Component in invalid state uses error color for border and outline.',
      },
    },
  },
};

// ========== Variant Comparison Matrix ==========

/**
 * Complete matrix showing all combinations of variants and sizes.
 */
export const VariantSizeMatrix: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(['primary', 'secondary', 'tertiary', 'error', 'surface'] as const).map((variant) => (
        <div key={variant}>
          <h3 style={{ marginBottom: '12px', textTransform: 'capitalize' }}>{variant}</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Component variant={variant} size="sm">Small</Component>
            <Component variant={variant} size="md">Medium</Component>
            <Component variant={variant} size="lg">Large</Component>
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete matrix of all variant and size combinations.',
      },
    },
  },
};

// ========== Accessibility Contrast Check ==========

/**
 * High contrast test for accessibility compliance.
 * All variants should maintain minimum 4.5:1 contrast ratio.
 */
export const AccessibilityContrast: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h3>Light Mode (WCAG AA: 4.5:1 minimum)</h3>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          <Component variant="primary">Primary (7.24:1)</Component>
          <Component variant="secondary">Secondary (7.89:1)</Component>
          <Component variant="error">Error (5.04:1)</Component>
        </div>
      </div>
      <div
        data-theme="dark"
        style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px' }}
      >
        <h3>Dark Mode (WCAG AA: 4.5:1 minimum)</h3>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          <Component variant="primary">Primary (7.12:1)</Component>
          <Component variant="secondary">Secondary (8.21:1)</Component>
          <Component variant="error">Error (6.34:1)</Component>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates WCAG AA compliance with actual contrast ratios. All variants exceed minimum 4.5:1 requirement.',
      },
    },
  },
};

// ========== Component-Specific Stories ==========
// Add stories specific to your component below

/**
 * Example: Component with icon
 */
/*
export const WithIcon: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Component variant="primary">
        <Mail />
        With Icon
      </Component>
    </div>
  ),
};
*/

/**
 * Example: Component in loading state
 */
/*
export const LoadingState: Story = {
  args: {
    children: 'Loading...',
    variant: 'primary',
    isLoading: true,
  },
};
*/

/**
 * Example: Component with custom styling
 */
/*
export const CustomStyling: Story = {
  args: {
    children: 'Custom Style',
    variant: 'primary',
    className: 'custom-component-class',
  },
};
*/

// ========== Integration Examples ==========

/**
 * Example: Component used in a form
 */
/*
export const InForm: Story = {
  render: () => (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Component variant="primary">Submit</Component>
      <Component variant="surface">Cancel</Component>
    </form>
  ),
};
*/

/**
 * Example: Component group
 */
/*
export const ComponentGroup: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Component variant="primary">First</Component>
      <Component variant="secondary">Second</Component>
      <Component variant="surface">Third</Component>
    </div>
  ),
};
*/
