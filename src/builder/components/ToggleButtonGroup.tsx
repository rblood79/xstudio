import React from 'react';
import { composeRenderProps, ToggleButtonGroup as RACToggleButtonGroup, ToggleButtonGroupProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
const styles = tv({
  base: 'aria-ToggleButtonGroup',
  variants: {

  }
});

export function ToggleButtonGroup(props: ToggleButtonGroupProps) {
  return (
    <RACToggleButtonGroup
      {...props}
      selectionMode={props.selectionMode || 'single'}
      onSelectionChange={props.onSelectionChange}
      className={composeRenderProps(props.className, (className) => styles({ className }))} />
  );
}
