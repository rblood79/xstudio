import {
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem as AriaColorSwatchPickerItem,
  ColorSwatchPickerItemProps,
  ColorSwatchPickerProps
} from 'react-aria-components';

import { ColorSwatch } from './ColorSwatch';

import './styles/ColorSwatchPicker.css';

export function ColorSwatchPicker(
  { children, ...props }: ColorSwatchPickerProps
) {
  return (
    <AriaColorSwatchPicker {...props}>
      {children}
    </AriaColorSwatchPicker>
  );
}

export { ColorSwatchPicker as MyColorSwatchPicker };

export function ColorSwatchPickerItem(props: ColorSwatchPickerItemProps) {
  return (
    <AriaColorSwatchPickerItem {...props}>
      <ColorSwatch />
    </AriaColorSwatchPickerItem>
  );
}

export { ColorSwatchPickerItem as MyColorSwatchPickerItem };
