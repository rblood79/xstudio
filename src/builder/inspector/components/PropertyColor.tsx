import React from 'react';
import {
  ColorPicker as AriaColorPicker,
  ColorField as AriaColorField,
  Input,
  DialogTrigger,
  Button as AriaButton,
  type Color,
} from 'react-aria-components';
import { ColorSwatch } from '../../components/ColorSwatch';
import { ColorArea } from '../../components/ColorArea';
import { ColorSlider } from '../../components/ColorSlider';
import { Popover } from '../../components/Popover';

interface PropertyColorProps {
  label?: string;
  value: string; // Hex color string (e.g., "#FF0000")
  onChange: (value: string) => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  placeholder?: string;
  className?: string;
}

export function PropertyColor({
  label,
  value,
  onChange,
  className,
}: PropertyColorProps) {
  const handleChange = (color: Color | null) => {
    if (!color) return;
    // Convert Color object to hex string and save immediately
    const hexValue = color.toString('hex');
    onChange(hexValue);
  };

  return (
    <fieldset className={`properties-aria property-color-input ${className || ''}`}>
      {label && <legend className="fieldset-legend">{label}</legend>}
      <AriaColorPicker value={value} onChange={handleChange}>
        <div className="react-aria-control react-aria-Group">
          <DialogTrigger>
            <AriaButton className="control-label color-swatch-button">
              <ColorSwatch />
            </AriaButton>
            <Popover placement="bottom start" className="color-picker-popover">
              <div className="color-picker-content">
                <ColorArea
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                />
                <ColorSlider colorSpace="hsb" channel="hue" />
              </div>
            </Popover>
          </DialogTrigger>
          <AriaColorField
            className="react-aria-ColorField"
            aria-label={label || "Color"}
          >
            <Input className="react-aria-Input" />
          </AriaColorField>
        </div>
      </AriaColorPicker>
    </fieldset>
  );
}
