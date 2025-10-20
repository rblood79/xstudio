import {
  ColorSwatch as AriaColorSwatch,
  ColorSwatchProps as AriaColorSwatchProps,
} from 'react-aria-components';

import './components.css';

export interface ColorSwatchProps extends AriaColorSwatchProps {}

export function ColorSwatch(props: ColorSwatchProps) {
  return <AriaColorSwatch {...props} className="react-aria-ColorSwatch" />;
}
