import { ReactNode } from 'react';
import { Radio as RACRadio, RadioGroup as RACRadioGroup, RadioGroupProps as RACRadioGroupProps, RadioProps, ValidationResult } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { Description, FieldError, Label } from './Field';
import { composeTailwindRenderProps, focusRing } from './utils';

interface BaseRenderProps {
  isSelected: boolean;
  isHovered: boolean;
  isPressed: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
  isRequired: boolean;
}

interface RadioRenderProps extends BaseRenderProps {
  defaultChildren: ReactNode;
}

interface ClassNameRenderProps extends BaseRenderProps {
  defaultClassName?: string;
}

interface RadioGroupComponentProps extends Omit<RACRadioGroupProps, 'children'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  children?: ReactNode;
}

export const RadioGroup = ({ label, description, errorMessage, ...props }: RadioGroupComponentProps) => {
  return (
    <RACRadioGroup {...props} className={composeTailwindRenderProps(props.className, 'aria-RadioGroup')}>
      <Label>{label}</Label>
      <div className="aria-RadioGroup">
        {props.children}
      </div>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </RACRadioGroup>
  );
}



const radio = tv({
  extend: focusRing,
  base: 'aria-Radio',
  variants: {
    isSelected: {
      false: 'border-gray-400 dark:border-zinc-400 group-pressed:border-gray-500 dark:group-pressed:border-zinc-300',
      true: 'border-[7px] border-gray-700 dark:border-slate-300 forced-colors:border-[Highlight]! group-pressed:border-gray-800 dark:group-pressed:border-slate-200'
    },
    isInvalid: {
      true: 'border-red-700 dark:border-red-600 group-pressed:border-red-800 dark:group-pressed:border-red-700 forced-colors:border-[Mark]!'
    },
    isDisabled: {
      true: 'border-gray-200 dark:border-zinc-700 forced-colors:border-[GrayText]!'
    }
  }
});

const Radio = (props: RadioProps) => {
  return (
    <RACRadio
      {...props}
      className={({ isSelected, isDisabled, isFocusVisible }: ClassNameRenderProps) =>
        radio({ isSelected, isDisabled, isFocusVisible })}
    >
      {({ isSelected, isHovered, isPressed, isFocused, isFocusVisible, isDisabled, isReadOnly, isInvalid, isRequired, defaultChildren }: RadioRenderProps) => (
        <div>
          <div className={radio({ isSelected })} />
          {typeof props.children === 'function'
            ? props.children({ isSelected, isHovered, isPressed, isFocused, isFocusVisible, isDisabled, isReadOnly, isInvalid, isRequired, defaultChildren })
            : props.children || defaultChildren}
        </div>
      )}
    </RACRadio>
  );
};

export { Radio };
