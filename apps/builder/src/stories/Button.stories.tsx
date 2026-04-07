import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@composition/shared/components/Button";
import type { ButtonVariant, ComponentSize } from "@composition/shared/types";

const VARIANTS: ButtonVariant[] = [
  "accent",
  "primary",
  "secondary",
  "negative",
];

const SIZES: ComponentSize[] = ["xs", "sm", "md", "lg", "xl"];

const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: VARIANTS,
    },
    size: {
      control: "select",
      options: SIZES,
    },
    isDisabled: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    children: "Button",
    variant: "accent",
    size: "md",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default stories ---

export const Default: Story = {};

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary" },
};

export const Accent: Story = {
  args: { variant: "accent" },
};

export const Negative: Story = {
  args: { variant: "negative" },
};

export const Disabled: Story = {
  args: { variant: "primary", isDisabled: true },
};

// --- Variant × Size matrix ---

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {VARIANTS.map((variant) => (
        <div
          key={variant}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span
            style={{
              width: 80,
              fontSize: 12,
              color: "var(--fg)",
            }}
          >
            {variant}
          </span>
          {SIZES.map((size) => (
            <Button key={`${variant}-${size}`} variant={variant} size={size}>
              {size}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const AllVariantsDisabled: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {VARIANTS.map((variant) => (
        <div
          key={variant}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span
            style={{
              width: 80,
              fontSize: 12,
              color: "var(--fg)",
            }}
          >
            {variant}
          </span>
          {SIZES.map((size) => (
            <Button
              key={`${variant}-${size}`}
              variant={variant}
              size={size}
              isDisabled
            >
              {size}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {SIZES.map((size) => (
        <Button key={size} variant="primary" size={size}>
          {size.toUpperCase()}
        </Button>
      ))}
    </div>
  ),
};
