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
  placeholder?: string;
}

export function Select<T extends object>(
  { label, description, errorMessage, children, items, placeholder, ...props }: SelectProps<T>
) {
  // 접근성을 위한 aria-label 처리
  const hasVisibleLabel = label && String(label).trim();
  const ariaLabel = hasVisibleLabel 
    ? undefined 
    : (props['aria-label'] || placeholder || 'Select an option');

  // 디버깅용 로그
  /*if (process.env.NODE_ENV === 'development') {
    console.log('Select 컴포넌트 props:', { 
      label, 
      hasVisibleLabel, 
      ariaLabel, 
      placeholder 
    });
  }*/

  return (
    <AriaSelect 
      {...props} 
      className='react-aria-Select'
      aria-label={ariaLabel}
    >
      {/* label이 존재하고 비어있지 않을 때만 렌더링 */}
      {hasVisibleLabel && (
        <Label className="react-aria-Label">
          {String(label)}
        </Label>
      )}
      
      <Button className="react-aria-Button">
        <SelectValue placeholder={placeholder || "Select an option"} />
        <span aria-hidden="true" className="select-chevron">
          <ChevronDown size={16} />
        </span>
      </Button>
      
      {/* description이 존재하고 비어있지 않을 때만 렌더링 */}
      {description && String(description).trim() && (
        <Text slot="description" className="react-aria-Description">
          {String(description)}
        </Text>
      )}
      
      {/* errorMessage가 존재할 때만 렌더링 */}
      {errorMessage && (
        <FieldError className="react-aria-FieldError">
          {typeof errorMessage === 'function' 
            ? errorMessage({ isInvalid: true } as ValidationResult) 
            : String(errorMessage)}
        </FieldError>
      )}
      
      <Popover className="react-aria-Popover">
        <ListBox items={items} className='react-aria-ListBox'>
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export { Select as MySelect };

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
