import React, { memo } from 'react';

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

export const PropertySwitch = memo(function PropertySwitch({
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
}, (prevProps, nextProps) => {
  // ⭐ 커스텀 비교: onChange 함수 참조는 무시하고 실제 값만 비교
  // onChange는 매번 새로 생성될 수 있지만, isSelected가 같으면 리렌더링 스킵
  return (
    prevProps.label === nextProps.label &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.icon === nextProps.icon &&
    prevProps.className === nextProps.className
  );
});
