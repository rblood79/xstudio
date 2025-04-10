import { Button } from '../builder/components/Button';

export default {
  title: 'Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive']
    },
    onBlur: { action: 'onBlur' },
    onFocus: { action: 'onFocus' },
    onFocusChange: { action: 'onFocusChange' },
    onHoverChange: { action: 'onHoverChange' },
    onHoverEnd: { action: 'onHoverEnd' },
    onHoverStart: { action: 'onHoverStart' },
    onKeyDown: { action: 'onKeyDown' },
    onKeyUp: { action: 'onKeyUp' },
    onPress: { action: 'onPress' },
    onPressChange: { action: 'onPressChange' },
    onPressEnd: { action: 'onPressEnd' },
    onPressStart: { action: 'onPressStart' },
    onPressUp: { action: 'onPressUp' },
  },
  args: {
    isDisabled: false,
    children: 'Button'
  }
};

export const Primary = {
  args: {
    variant: 'primary'
  },
};

export const Secondary = {
  args: {
    variant: 'secondary'
  },
};

export const Destructive = {
  args: {
    variant: 'destructive'
  },
};
