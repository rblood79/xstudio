import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxItemProps,
  Popover,
  Select as AriaSelect,
  SelectProps as AriaSelectProps,
  SelectValue,
  Text,
  ValidationResult
} from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import './components.css';

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, 'children'> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

export function Select<T extends object>(
  { label, description, errorMessage, children, items, ...props }: SelectProps<
    T
  >
) {
  return (
    (
      <AriaSelect {...props} className='react-aria-Select'>
        {label && <Label>{label}</Label>}
        <Button>
          <SelectValue />
          <span aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </Button>
        {description && <Text slot="description">{description}</Text>}
        <FieldError>{errorMessage}</FieldError>
        <Popover>
          <ListBox items={items} className='react-aria-ListBox'>
            {children}
          </ListBox>
        </Popover>
      </AriaSelect>
    )
  );
}

export { Select as MySelect };

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}
