import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
  Label,
  Text
} from 'react-aria-components';

import './components.css';

export interface MyListBoxProps<T extends object> extends ListBoxProps<T> {
  label?: string;
  description?: string;
  children: React.ReactNode;
}

export function ListBox<T extends object>(
  { label, description, children, ...props }: MyListBoxProps<T>
) {
  // 디버깅용 로그
  if (process.env.NODE_ENV === 'development') {
    console.log('ListBox 컴포넌트 props:', { label, description });
  }

  return (
    <div className="react-aria-ListBox">
      {/* label이 존재하고 비어있지 않을 때만 렌더링 */}
      {label && String(label).trim() && (
        <Label className="react-aria-Label">
          {String(label)}
        </Label>
      )}
      
      {/* description이 존재하고 비어있지 않을 때만 렌더링 */}
      {description && <Text slot="description">{description}</Text>}
      
      <AriaListBox {...props} className='react-aria-ListBox'>
        {children}
      </AriaListBox>
    </div>
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className='react-aria-ListBoxItem' />;
}
