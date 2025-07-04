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

import { ChevronUp, ChevronDown } from 'lucide-react';
import { iconProps } from '../constants';

import { CollectionItemData } from './types';
import { ListBoxItemRenderer } from './ListBox';

import './components.css';

export interface ComboBoxProps<T extends object>
  extends Omit<AriaComboBoxProps<T>, 'children'> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: CollectionItemData[];
  children?: React.ReactNode | ((item: T) => React.ReactNode);
}

export function ComboBox<T extends object>(
  { label, description, errorMessage, children, items, ...props }: ComboBoxProps<T>
) {
  return (
    <AriaComboBox {...props} className='react-aria-ComboBox'>
      <Label>{label}</Label>
      <div className="my-combobox-container">
        <Input />
        <Button>
          <ChevronDown aria-hidden="true" size={iconProps.size} />
        </Button>
      </div>
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
    </AriaComboBox>
  );
}

export function ComboBoxItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}

export { ComboBox as MyComboBox };
export { ComboBoxItem as MyItem };
