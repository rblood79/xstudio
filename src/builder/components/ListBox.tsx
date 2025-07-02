import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
  Text
} from 'react-aria-components';
import { LucideIcon, icons } from 'lucide-react';

import './components.css';

export interface ListBoxItemData {
  id: string;
  type?: 'simple' | 'complex' | 'custom';
  text?: string;
  label?: string;
  description?: string;
  subtitle?: string;
  image?: {
    src: string;
    alt?: string;
    size?: 'small' | 'medium' | 'large';
  };
  icon?: {
    name: string;
    size?: number;
    color?: string;
  };
  disabled?: boolean;
  selected?: boolean;
  style?: React.CSSProperties;
  className?: string;
  metadata?: Record<string, any>;
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    onClick?: () => void;
  }>;
}

export function ListBox<T extends object>(
  { children, items, itemLayout = 'default', ...props }: ListBoxProps<T> & {
    itemLayout?: 'default' | 'compact' | 'detailed' | 'grid';
  }
) {
  return (
    <AriaListBox
      {...props}
      className={`react-aria-ListBox react-aria-ListBox--${itemLayout}`}
      data-layout={itemLayout}
    >
      {children}
    </AriaListBox>
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className='react-aria-ListBoxItem' />;
}

// 확장된 ListBoxItem 렌더러
export function ListBoxItemRenderer({ item }: { item: ListBoxItemData }) {
  const IconComponent = item.icon ? icons[item.icon.name as keyof typeof icons] : null;

  switch (item.type) {
    case 'simple':
      return (
        <ListBoxItem id={item.id} textValue={item.text || item.label}>
          {item.text || item.label}
        </ListBoxItem>
      );

    case 'complex':
      return (
        <ListBoxItem
          id={item.id}
          textValue={item.label || item.text}
          className={item.className}
          style={item.style}
        >
          <div className="listbox-item-content">
            {item.image && (
              <img
                src={item.image.src}
                alt={item.image.alt}
                className={`listbox-item-image listbox-item-image--${item.image.size || 'medium'}`}
              />
            )}

            {IconComponent && (
              <IconComponent
                size={item.icon?.size || 16}
                color={item.icon?.color}
                className="listbox-item-icon"
              />
            )}

            <div className="listbox-item-text">
              {item.label && (
                <Text slot="label" className="listbox-item-label">
                  {item.label}
                </Text>
              )}

              {item.description && (
                <Text slot="description" className="listbox-item-description">
                  {item.description}
                </Text>
              )}

              {item.subtitle && (
                <Text className="listbox-item-subtitle">
                  {item.subtitle}
                </Text>
              )}
            </div>

            {item.actions && item.actions.length > 0 && (
              <div className="listbox-item-actions">
                {item.actions.map(action => (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick?.();
                    }}
                    className="listbox-item-action"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ListBoxItem>
      );

    case 'custom':
      return (
        <ListBoxItem id={item.id} textValue={item.label || item.text}>
          <div
            className={item.className}
            style={item.style}
            dangerouslySetInnerHTML={{ __html: item.text || '' }}
          />
        </ListBoxItem>
      );

    default:
      return (
        <ListBoxItem id={item.id} textValue={item.text || item.label}>
          {item.text || item.label}
        </ListBoxItem>
      );
  }
}
