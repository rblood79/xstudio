import React from 'react';

import { Switch as AriaSwitch } from 'react-aria-components';
import { PropertyFieldset } from './PropertyFieldset';

interface PropertySwitchProps {
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  className?: string;
}

export function PropertySwitch({
  label,
  isSelected,
  onChange,
  icon,
  className
}: PropertySwitchProps) {
  return (
    <PropertyFieldset legend={label} icon={icon} className={className}>
      <AriaSwitch
        className={"react-aria-Switch"}
        isSelected={isSelected}
        onChange={(val) => onChange(val)}
      >
        <div className="indicator" />
        {label}
      </AriaSwitch>
    </PropertyFieldset>
  );
}
