import {
  Button,
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent as AriaTreeItemContent,
  TreeItemContentProps,
  TreeItemContentRenderProps,
  TreeItemProps as AriaTreeItemProps,
  TreeProps
} from 'react-aria-components';
import { InfoIcon } from 'lucide-react';
import { MyCheckbox } from './Checkbox';

import './components.css';

export function Tree<T extends object>(props: TreeProps<T>) {
  return <AriaTree {...props} className='react-aria-Tree' />;
}

export function TreeItemContent(
  props: Omit<TreeItemContentProps, 'children'> & { children?: React.ReactNode }
) {
  return (
    (
      <AriaTreeItemContent {...props}>
        {(
          { selectionBehavior, selectionMode }:
            TreeItemContentRenderProps
        ) => (
          <>
            {selectionBehavior === 'toggle' && selectionMode !== 'none' && (
              <MyCheckbox slot="selection" />
            )}
            <Button slot="chevron">
              <svg viewBox="0 0 24 24">
                <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Button>
            {props.children}
          </>
        )}
      </AriaTreeItemContent>
    )
  );
}

export interface TreeItemProps extends Partial<AriaTreeItemProps> {
  title: string;
  children?: React.ReactNode;
  showInfoButton?: boolean;
  onInfoClick?: () => void;
}

export function TreeItem(props: TreeItemProps) {
  const {
    title,
    children,
    showInfoButton = true,
    onInfoClick,
    ...restProps
  } = props;

  return (
    <AriaTreeItem
      textValue={title}
      {...restProps}
      className='react-aria-TreeItem'
    >
      <TreeItemContent>
        <span className="tree-item-title">{title}</span>
        {showInfoButton && (
          <Button
            aria-label={`${title} 정보`}
            onPress={onInfoClick}
            className="tree-item-info-button"
          >
            <InfoIcon size={16} />
          </Button>
        )}
      </TreeItemContent>
      {children}
    </AriaTreeItem>
  );
}
