"use client";
import {
  ColorPicker as AriaColorPicker,
  ColorPickerProps as AriaColorPickerProps,
  DialogTrigger,
  composeRenderProps
} from "react-aria-components";
import { tv } from 'tailwind-variants';
import { Button } from "./Button";
import { ColorSwatch } from "./ColorSwatch";
import { ColorSlider } from "./ColorSlider";
import { ColorArea } from "./ColorArea";
import { ColorField } from "./ColorField";
import { Popover } from "./Popover";
import type { ColorPickerVariant, ComponentSize } from '../types/componentVariants';

import "./styles/ColorPicker.css";

const colorPickerStyles = tv({
  base: 'react-aria-ColorPicker',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ColorPickerProps extends AriaColorPickerProps {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: ColorPickerVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  label?: string;
  children?: React.ReactNode;
}

/**
 * ColorPicker Component with Material Design 3 support
 *
 * M3 Features:
 * - 3 variants: primary, secondary, tertiary
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Color selection with visual picker
 * - HSB color space support
 * - Hex input field
 * - Customizable color sliders and area
 *
 * @example
 * <ColorPicker variant="primary" size="md" />
 * <ColorPicker variant="secondary">
 *   <ColorArea colorSpace="rgb" xChannel="red" yChannel="green" />
 * </ColorPicker>
 */
export function ColorPicker({
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ColorPickerProps) {
  const colorPickerClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return colorPickerStyles({ ...renderProps, variant, size, className });
    }
  );

  return (
    <AriaColorPicker {...props} className={colorPickerClassName}>
      <DialogTrigger>
        <Button className="color-picker-button">
          <ColorSwatch />
        </Button>
        <Popover placement="bottom start" className="color-picker-popover">
          {children || (
            <>
              <ColorArea
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              />
              <ColorSlider colorSpace="hsb" channel="hue" />
              <ColorField label="Hex" />
            </>
          )}
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}
