import {
  Button,
  ComboBox as AriaComboBox,
  ComboBoxProps as AriaComboBoxProps,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxItemProps,
  Popover,
  Text,
  ValidationResult
} from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import './styles/ComboBox.css';

export interface ComboBoxProps<T extends object>
  extends Omit<AriaComboBoxProps<T>, 'children'> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

export function ComboBox<T extends object>(
  { label, description, errorMessage, children, placeholder, inputValue, onInputChange, ...props }: ComboBoxProps<T>
) {
  return (
    <AriaComboBox
      {...props}
      inputValue={inputValue}
      onInputChange={onInputChange}
      className='react-aria-ComboBox'
    >
      <Label>{label}</Label>
      <div className="combobox-container">
        <Input placeholder={placeholder} />
        <Button>
          <ChevronDown size={16} />
        </Button>
      </div>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover>
        <ListBox className='react-aria-ListBox'>
          {children}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}

export function ComboBoxItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}
