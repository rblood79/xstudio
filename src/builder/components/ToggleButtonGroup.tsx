import React from 'react';
import { composeRenderProps, ToggleButtonGroup as RACToggleButtonGroup, ToggleButtonGroupProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'aria-toggle-button-group',
  variants: {

  }
});

export function ToggleButtonGroup(props: ToggleButtonGroupProps) {
  return (
    <RACToggleButtonGroup
      {...props}
      selectionMode={props.selectionMode || 'single'}
      className={composeRenderProps(props.className, (className) => styles({ className }))} />
  );
}
