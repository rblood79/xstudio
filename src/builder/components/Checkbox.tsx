import {
  Checkbox as AriaCheckbox,
  CheckboxProps as AriaCheckboxProps
} from 'react-aria-components';
import { CheckIcon, Minus } from 'lucide-react';
import './styles/Checkbox.css';

export interface CheckboxProps extends Omit<AriaCheckboxProps, 'children'> {
  children?: React.ReactNode;
  isTreeItemChild?: boolean; // TreeItem 내부에서 사용될 때를 위한 prop
}

export function MyCheckbox(props: CheckboxProps) {
  const { children, isTreeItemChild = false, ...restProps } = props;

  // TreeItem 내부에서 사용될 때는 slot을 설정하지 않음
  const checkboxProps = isTreeItemChild
    ? restProps
    : { slot: "selection", ...restProps };

  return (
    <AriaCheckbox {...checkboxProps} className='react-aria-Checkbox'>
      {({ isSelected, isIndeterminate }) => (
        <>
          <div className="checkbox">
            {isIndeterminate ? <Minus size={16} strokeWidth={4} /> : isSelected && <CheckIcon size={16} strokeWidth={4} />}
          </div>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}

// 기존 Checkbox export도 유지
export function Checkbox(props: CheckboxProps) {
  return <MyCheckbox {...props} />;
}
