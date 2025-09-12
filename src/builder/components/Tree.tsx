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
import { InfoIcon, ChevronRightIcon } from 'lucide-react';
import { MyCheckbox } from './Checkbox';

import './components.css';

export function Tree<T extends object>(props: TreeProps<T>) {
  return <AriaTree {...props} className='react-aria-Tree' />;
}

export function TreeItemContent(
  props: Omit<TreeItemContentProps, 'children'> & { children?: React.ReactNode }
) {
  return (
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
            <ChevronRightIcon size={16} />
          </Button>
          {props.children}
        </>
      )}
    </AriaTreeItemContent>
  );
}

export interface TreeItemProps extends Omit<Partial<AriaTreeItemProps>, 'value'> {
  title?: string;
  value?: string;        // 표준 value 속성
  label?: string;        // 대안 라벨 (다른 컴포넌트와 일관성 유지)
  children?: React.ReactNode;
  showInfoButton?: boolean;
  onInfoClick?: () => void;
}

export function TreeItem(props: TreeItemProps) {
  const {
    title,
    value,
    label,
    children,
    showInfoButton = true,
    onInfoClick,
    ...restProps
  } = props;

  // XStudio 표준 패턴: title > label > value 우선순위
  const displayTitle = String(title || label || value || '');

  return (
    <AriaTreeItem
      textValue={displayTitle} // React Aria 접근성용 (내부 API)
      {...restProps}
      className='react-aria-TreeItem'
    >
      <TreeItemContent>
        <span className="tree-item-title">{displayTitle}</span>
        {showInfoButton && (
          <Button
            aria-label={`${displayTitle} 정보`}
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
