import {
  FieldError,
  Label,
  RadioGroup as AriaRadioGroup,
  RadioGroupProps as AriaRadioGroupProps,
  Text,
  ValidationResult
} from 'react-aria-components';

import './styles/RadioGroup.css';

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, 'children'> {
  children?: React.ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function RadioGroup(
  {
    label,
    description,
    errorMessage,
    children,
    ...props
  }: RadioGroupProps
) {
  return (
    <AriaRadioGroup {...props} className='react-aria-RadioGroup'>
      {label && <Label>{label}</Label>}
      {children}
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}
