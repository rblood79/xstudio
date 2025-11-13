/**
 * PropertyColorPicker Component
 * TailSwatch 기반 색상 선택 Property Component
 */

import { useState } from 'react';
import { parseColor, type Color } from 'react-aria-components';
import { MyColorSwatches } from '../../components/TailSwatch';
import { Paintbrush } from 'lucide-react';

export interface PropertyColorPickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

/**
 * Color Property Picker using TailSwatch
 *
 * @example
 * <PropertyColorPicker
 *   label="Background Color"
 *   value="#3b82f6"
 *   onChange={(color) => updateProp('backgroundColor', color)}
 *   icon={Paintbrush}
 * />
 */
export function PropertyColorPicker({
  label,
  value = '#3b82f6',
  onChange,
  icon: Icon = Paintbrush,
}: PropertyColorPickerProps) {
  const [color, setColor] = useState<Color>(() => {
    try {
      return parseColor(value);
    } catch {
      return parseColor('#3b82f6'); // Default blue
    }
  });

  const handleColorChange = (newColor: Color) => {
    setColor(newColor);
    // Convert color to hex string
    const hexColor = newColor.toString('hex');
    onChange(hexColor);
  };

  return (
    <div className="property-field">
      <label className="property-label">
        <Icon size={14} className="property-icon" />
        <span>{label}</span>
      </label>

      <div className="property-color-picker">
        <MyColorSwatches
          areaProps={{
            value: color,
            onChange: handleColorChange,
          }}
          sliderProps={{
            value: color,
            onChange: handleColorChange,
          }}
          swatchPickerProps={{
            value: color,
            onChange: handleColorChange,
          }}
        />
      </div>
    </div>
  );
}
