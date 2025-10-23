import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent as AriaTreeItemContent,
  TreeItemContentProps,
  TreeItemContentRenderProps,
  TreeItemProps as AriaTreeItemProps,
  TreeProps,
  Collection,
} from "react-aria-components";
import { InfoIcon, ChevronRightIcon, Minus } from "lucide-react";
import { MyCheckbox } from "./Checkbox";
import type { DataBinding } from "../../types/unified";

import "./styles/Tree.css";

export interface MyTreeProps<T extends object> extends TreeProps<T> {
  dataBinding?: DataBinding;
}

export function Tree<T extends object>(props: MyTreeProps<T>) {
  const { dataBinding, children, ...restProps } = props;
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // dataBinding을 JSON으로 직렬화하여 안정화 (무한 루프 방지)
  const dataBindingKey = useMemo(
    () => (dataBinding ? JSON.stringify(dataBinding) : null),
    [dataBinding]
  );

  // DataBinding 처리
  useEffect(() => {
    if (dataBinding?.type === "collection" && dataBinding.source === "api") {
      const config = dataBinding.config as {
        baseUrl?: string;
        endpoint?: string;
        params?: Record<string, unknown>;
      };

      if (config.baseUrl === "MOCK_DATA") {
        setLoading(true);

        import("../../services/api")
          .then(({ apiConfig }) => {
            const mockFetch = apiConfig.MOCK_DATA;
            if (mockFetch) {
              mockFetch(config.endpoint || "/component-tree", config.params)
                .then((data: any) => {
                  console.log("🌳 Tree 데이터 로드:", data);
                  setTreeData(Array.isArray(data) ? data : []);
                  setLoading(false);
                })
                .catch((err: any) => {
                  console.error("Tree API 오류:", err);
                  setLoading(false);
                });
            } else {
              setLoading(false);
            }
          })
          .catch((err) => {
            console.error("Tree import 오류:", err);
            setLoading(false);
          });
      }
    }
    // dataBinding 대신 dataBindingKey 사용 (객체 참조 비교 대신 JSON 문자열 비교)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBindingKey]);

  // DataBinding이 있고 데이터가 로드된 경우
  if (dataBinding && treeData.length > 0) {
    const renderTreeItemsRecursively = (items: any[]): React.ReactNode => {
      return items.map((item) => {
        const itemId = String(item.id || item.name || Math.random());
        const displayTitle = String(
          item.name || item.label || item.title || itemId
        );
        const hasChildren =
          Array.isArray(item.children) && item.children.length > 0;

        return (
          <TreeItem
            key={itemId}
            id={itemId}
            title={displayTitle}
            hasChildren={hasChildren}
            showInfoButton={false}
            childItems={
              hasChildren
                ? renderTreeItemsRecursively(item.children)
                : undefined
            }
          />
        );
      });
    };

    return (
      <AriaTree {...restProps} className="react-aria-Tree">
        {loading ? (
          <TreeItem
            key="loading"
            id="loading"
            title="Loading..."
            hasChildren={false}
            showInfoButton={false}
          />
        ) : (
          renderTreeItemsRecursively(treeData)
        )}
      </AriaTree>
    );
  }

  // Static children
  return (
    <AriaTree {...restProps} className="react-aria-Tree">
      {children}
    </AriaTree>
  );
}

export function TreeItemContent(
  props: Omit<TreeItemContentProps, "children"> & {
    children?: React.ReactNode;
    hasChildren?: boolean;
  }
) {
  return (
    <AriaTreeItemContent {...props}>
      {(renderProps: TreeItemContentRenderProps) => (
        <>
          {renderProps.selectionBehavior === "toggle" &&
            renderProps.selectionMode !== "none" && (
              <MyCheckbox slot="selection" />
            )}
          <Button slot="chevron">
            {props.hasChildren ? (
              <ChevronRightIcon size={16} data-chevron="true" />
            ) : (
              <Minus size={16} data-minus="true" />
            )}
          </Button>
          {props.children}
        </>
      )}
    </AriaTreeItemContent>
  );
}

export interface TreeItemProps
  extends Omit<Partial<AriaTreeItemProps>, "value"> {
  title?: string;
  value?: string;
  label?: string;
  children?: React.ReactNode;
  showInfoButton?: boolean;
  onInfoClick?: () => void;
  hasChildren?: boolean;
  childItems?: React.ReactNode; // 하위 TreeItem들을 위한 별도 prop
}

export function TreeItem(props: TreeItemProps) {
  const {
    title,
    value,
    label,
    children,
    showInfoButton = true,
    onInfoClick,
    hasChildren,
    childItems,
    ...restProps
  } = props;

  const displayTitle = String(title || label || value || "");
  const actualHasChildren = hasChildren ?? childItems != null;

  return (
    <AriaTreeItem
      textValue={displayTitle}
      {...restProps}
      className="react-aria-TreeItem"
    >
      <TreeItemContent hasChildren={actualHasChildren}>
        <span className="tree-item-title">{displayTitle}</span>
        {children} {/* 다른 컴포넌트들 (Button, Text 등) */}
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

      {/* 하위 TreeItem들을 Collection으로 래핑 */}
      {childItems && <Collection items={[]}>{childItems}</Collection>}
    </AriaTreeItem>
  );
}
