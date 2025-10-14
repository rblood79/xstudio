import React from 'react';

import { Switch } from '../../components/list';
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
      <Switch
        className={"react-aria-Switch"}
        isSelected={isSelected}
        onChange={(val) => onChange(val)}
      >
        {label}
      </Switch>
    </PropertyFieldset>
  );
}
