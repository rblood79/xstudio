import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps
} from 'react-aria-components';

import './components.css';

export function ListBox<T extends object>(
  { children, ...props }: ListBoxProps<T>
) {
  return (
    (
      <AriaListBox {...props} className='react-aria-ListBox'>
        {children}
      </AriaListBox>
    )
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className='react-aria-ListBoxItem' />;
}
