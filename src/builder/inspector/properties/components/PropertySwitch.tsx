import React from 'react';
import { PropertyFieldset } from './PropertyFieldset';
import { Switch } from '../../../components/list';

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
        isSelected={isSelected}
        onChange={(val) => onChange(val)}
      >
        {label}
      </Switch>
    </PropertyFieldset>
  );
}
