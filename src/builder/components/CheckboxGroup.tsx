import {
  CheckboxGroup as AriaCheckboxGroup,
  CheckboxGroupProps as AriaCheckboxGroupProps,
  FieldError,
  Label,
  Text,
  ValidationResult
} from 'react-aria-components';

import './components.css';

export interface CheckboxGroupProps
  extends Omit<AriaCheckboxGroupProps, 'children'> {
  children?: React.ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function CheckboxGroup(
  {
    label,
    description,
    errorMessage,
    children,
    orientation = 'vertical',
    ...props
  }: CheckboxGroupProps & { orientation?: 'horizontal' | 'vertical' }
) {
  return (
    <AriaCheckboxGroup
      {...props}
      className='react-aria-CheckboxGroup'
      data-orientation={orientation}
    >
      {label && <Label>{label}</Label>}
      {children}
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaCheckboxGroup>
  );
}

export { CheckboxGroup as MyCheckboxGroup };
