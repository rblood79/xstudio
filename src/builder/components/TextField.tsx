// TextField 컴포넌트에서 placeholder 올바르게 전달

import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as AriaTextField,
  TextFieldProps as AriaTextFieldProps,
  ValidationResult
} from 'react-aria-components';

import './components.css';

export interface TextFieldProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
}

export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  type = 'text',
  value,
  defaultValue,
  onChange,
  isRequired,
  isDisabled,
  isReadOnly,
  ...props
}: TextFieldProps) {
  // 개발 환경에서 placeholder 값 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('TextField placeholder:', placeholder);
  }

  return (
    <AriaTextField
      {...props}
      className='react-aria-TextField'
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      {label && <Label>{label}</Label>}
      <Input
        type={type}
        placeholder={placeholder} // placeholder를 Input에 직접 전달
      />
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
