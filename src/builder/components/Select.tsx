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

import { ChevronUp, ChevronDown } from 'lucide-react';
import { CollectionItemData } from './types';
import { ListBoxItemRenderer } from './ListBox';

import './components.css';
import { iconProps } from '../constants';

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, 'children'> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: CollectionItemData[];
  children?: React.ReactNode | ((item: T) => React.ReactNode);
}

export function Select<T extends object>(
  { label, description, errorMessage, children, items, ...props }: SelectProps<T>
) {
  return (
    <AriaSelect {...props} className='react-aria-Select'>
      <Label>{label}</Label>
      <Button>
        <SelectValue />
        <ChevronDown aria-hidden="true" size={iconProps.size} />
      </Button>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover>
        <ListBox items={items}>
          {items && items.length > 0
            ? items.map((item: CollectionItemData) => (
              <ListBoxItemRenderer key={item.id} item={item} />
            ))
            : children
          }
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export { Select as MySelect };

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}

export { SelectItem as MyItem };
