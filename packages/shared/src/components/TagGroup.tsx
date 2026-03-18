import React, { JSX } from "react";
import {
  Button,
  Label,
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  TagGroupProps as AriaTagGroupProps,
  TagList,
  TagListProps,
  TagProps,
  Text,
  type Key,
  type Selection,
} from "react-aria-components";
import { X } from "lucide-react";
import type { DataBinding, ColumnMapping, DataBindingValue } from "../types";

import { useCollectionData } from "../hooks";
import "./styles/TagGroup.css";

export interface TagGroupProps<T>
  extends
    Omit<AriaTagGroupProps, "children">,
    Pick<TagListProps<T>, "items" | "children" | "renderEmptyState"> {
  label?: string;
  description?: string;
  errorMessage?: string;
  allowsRemoving?: boolean;
  onRemove?: (keys: Selection) => void;
  // 선택 관련 프로퍼티 추가
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  selectedKeys?: "all" | Iterable<Key>;
  defaultSelectedKeys?: "all" | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  // 비활성화 관련 프로퍼티 추가
  isDisabled?: boolean;
  // 기타 유용한 프로퍼티들
  orientation?: "horizontal" | "vertical";
  disallowEmptySelection?: boolean;
  // 데이터 바인딩
  dataBinding?: DataBinding | DataBindingValue;
  columnMapping?: ColumnMapping;
  // 제거된 항목 추적 (columnMapping 모드에서 동적 데이터 항목 제거용)
  removedItemIds?: string[];
  // Tag 스타일 제어
  variant?: string;
  size?: "sm" | "md" | "lg";
  /**
   * React Aria 1.13.0: 커스텀 필터 함수
   * @example filter={(item) => item.status === 'active'}
   */
  filter?: (item: T) => boolean;
  /**
   * React Aria 1.13.0: 텍스트 기반 필터링
   * @example filterText="search query"
   */
  filterText?: string;
  /**
   * React Aria 1.13.0: 필터링 대상 필드 목록
   * @default ['label', 'name', 'title']
   */
  filterFields?: (keyof T)[];
}

export function TagGroup<T extends object>({
  label,
  description,
  errorMessage,
  items,
  children,
  renderEmptyState,
  allowsRemoving,
  onRemove,
  selectionMode = "none",
  selectionBehavior = "toggle",
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  disallowEmptySelection = false,
  dataBinding,
  columnMapping,
  removedItemIds = [],
  variant = "default",
  size = "md",
  filter,
  filterText,
  filterFields = ["label", "name", "title"] as (keyof T)[],
  ...props
}: TagGroupProps<T>): JSX.Element {
  // Build className with variant and size (재사용을 위해 최상위에 선언)
  const tagGroupClassName = "react-aria-TagGroup";

  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: "TagGroup",
    fallbackData: [
      { id: 1, name: "Tag 1", label: "Tag 1" },
      { id: 2, name: "Tag 2", label: "Tag 2" },
    ],
  });

  // React Aria 1.13.0: 필터링 로직
  const filteredData = React.useMemo(() => {
    let result = [...boundData];

    // 커스텀 필터 적용
    if (filter) {
      result = result.filter((item) => filter(item as unknown as T));
    }

    // 텍스트 필터 적용
    if (filterText && filterText.trim()) {
      const searchText = filterText.toLowerCase().trim();
      result = result.filter((item) =>
        filterFields.some((field) => {
          const value = item[field as string];
          return value && String(value).toLowerCase().includes(searchText);
        }),
      );
    }

    return result;
  }, [boundData, filter, filterText, filterFields]);

  // DataBinding이 있고 데이터가 로드되었을 때 동적 아이템 생성
  // PropertyDataBinding 형식 (source, name) 또는 DataBinding 형식 (type: "collection") 둘 다 지원
  const isPropertyBinding =
    dataBinding &&
    "source" in dataBinding &&
    "name" in dataBinding &&
    !("type" in dataBinding);
  const hasDataBinding =
    (!isPropertyBinding &&
      dataBinding &&
      "type" in dataBinding &&
      dataBinding.type === "collection") ||
    isPropertyBinding;

  // children이 render function인지 확인 (Field children 렌더링 모드)
  const isRenderFunction = typeof children === "function";

  // ColumnMapping이 있거나 children이 render function이면 Field 렌더링 모드 사용
  // ListBox와 동일한 패턴: Element tree의 Tag 템플릿 + Field 자식 사용
  if (hasDataBinding && (columnMapping || isRenderFunction)) {
    // Loading 상태
    if (loading) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className="react-aria-TagList">
            <AriaTag textValue="Loading">⏳ 데이터 로딩 중...</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className="react-aria-TagList">
            <AriaTag textValue="Error">❌ 오류: {error}</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (filteredData.length > 0) {
      // removedItemIds로 필터링 (map 전에 필터링)
      const tagItems = filteredData
        .filter((item, index) => {
          // 원본 데이터의 id를 문자열로 변환하여 비교
          const itemId = String(item.id ?? index);
          const isRemoved = removedItemIds.includes(itemId);
          console.log("🔍 Filter check:", {
            originalId: item.id,
            originalIdType: typeof item.id,
            itemId,
            removedItemIds: removedItemIds.slice(0, 5), // 처음 5개만 표시
            isRemoved,
          });
          if (isRemoved) {
            console.log("🚫 Filtering out removed item:", itemId);
          }
          return !isRemoved;
        })
        .map((item, index) => ({
          id: String(item.id || index),
          ...item,
        })) as T[];

      console.log("✅ TagGroup with columnMapping - items:", {
        totalItems: filteredData.length,
        removedItemIds,
        filteredItems: tagItems.length,
        tagItems: tagItems.map((item) =>
          String((item as { id: string | number }).id),
        ),
      });

      return (
        <AriaTagGroup
          {...props}
          selectionMode={selectionMode}
          selectionBehavior={selectionBehavior}
          selectedKeys={selectedKeys}
          defaultSelectedKeys={defaultSelectedKeys}
          onSelectionChange={onSelectionChange}
          disallowEmptySelection={disallowEmptySelection}
          onRemove={allowsRemoving ? onRemove : undefined}
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList
            items={tagItems}
            renderEmptyState={renderEmptyState}
            className="react-aria-TagList"
          >
            {children}
          </TagList>
          {description && <Text slot="description">{description}</Text>}
          {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
        </AriaTagGroup>
      );
    }

    // 데이터 없음
    return (
      <AriaTagGroup
        {...props}
        selectionMode={selectionMode}
        selectionBehavior={selectionBehavior}
        selectedKeys={selectedKeys}
        defaultSelectedKeys={defaultSelectedKeys}
        onSelectionChange={onSelectionChange}
        disallowEmptySelection={disallowEmptySelection}
        onRemove={allowsRemoving ? onRemove : undefined}
        className={tagGroupClassName}
        data-tag-variant={variant}
        data-tag-size={size}
      >
        {label && <Label>{label}</Label>}
        <TagList
          items={items}
          renderEmptyState={renderEmptyState}
          className="react-aria-TagList"
        >
          {children}
        </TagList>
        {description && <Text slot="description">{description}</Text>}
        {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
      </AriaTagGroup>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className="react-aria-TagList">
            <AriaTag textValue="Loading">⏳ 데이터 로딩 중...</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className="react-aria-TagList">
            <AriaTag textValue="Error">❌ 오류: {error}</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // 데이터가 로드되었을 때
    if (filteredData.length > 0) {
      const tagItems = filteredData.map((item, index) => ({
        id: String(item.id || index),
        label: String(
          item.name || item.title || item.label || `Tag ${index + 1}`,
        ),
        ...item,
      }));

      console.log("✅ TagGroup Dynamic Collection - items:", tagItems);

      return (
        <AriaTagGroup
          {...props}
          selectionMode={selectionMode}
          selectionBehavior={selectionBehavior}
          selectedKeys={selectedKeys}
          defaultSelectedKeys={defaultSelectedKeys}
          onSelectionChange={onSelectionChange}
          disallowEmptySelection={disallowEmptySelection}
          onRemove={allowsRemoving ? onRemove : undefined}
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList
            items={tagItems}
            renderEmptyState={renderEmptyState}
            className="react-aria-TagList"
          >
            {(item) => (
              <AriaTag
                key={item.id}
                id={item.id}
                textValue={item.label}
                className="react-aria-Tag"
              >
                {({ allowsRemoving: removing }) => (
                  <>
                    {item.label}
                    {removing && (
                      <Button slot="remove" className="tag-remove-btn">
                        <X size={14} />
                      </Button>
                    )}
                  </>
                )}
              </AriaTag>
            )}
          </TagList>
          {description && <Text slot="description">{description}</Text>}
          {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
        </AriaTagGroup>
      );
    }
  }

  // Static Children (기존 방식)
  // React Aria의 TagList collection은 AriaTag(react-aria-components Tag)만 인식.
  // 커스텀 Tag 래퍼는 인식 불가 → AriaTag로 변환하여 전달.
  const mappedChildren =
    typeof children === "function"
      ? children
      : React.Children.map(children as React.ReactNode, (child) => {
          if (!React.isValidElement(child)) return child;
          const { children: tagContent, ...tagProps } = child.props as TagProps;
          const textValue =
            typeof tagContent === "string" ? tagContent : undefined;
          return (
            <AriaTag
              textValue={textValue}
              {...tagProps}
              className="react-aria-Tag"
            >
              {({ allowsRemoving }) => (
                <>
                  {tagContent}
                  {allowsRemoving && (
                    <Button slot="remove" className="tag-remove-btn">
                      <X size={14} />
                    </Button>
                  )}
                </>
              )}
            </AriaTag>
          );
        });

  return (
    <AriaTagGroup
      {...props}
      selectionMode={selectionMode}
      selectionBehavior={selectionBehavior}
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange}
      disallowEmptySelection={disallowEmptySelection}
      onRemove={allowsRemoving ? onRemove : undefined}
      className={tagGroupClassName}
      data-tag-variant={variant}
      data-tag-size={size}
    >
      {label && <Label>{label}</Label>}
      <TagList
        items={items}
        renderEmptyState={renderEmptyState}
        className="react-aria-TagList"
      >
        {mappedChildren}
      </TagList>
      {description && <Text slot="description">{description}</Text>}
      {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
    </AriaTagGroup>
  );
}

export function Tag({ children, ...props }: TagProps): JSX.Element {
  const textValue = typeof children === "string" ? children : undefined;
  return (
    <AriaTag textValue={textValue} {...props} className="react-aria-Tag">
      {({ allowsRemoving }) => (
        <>
          {children}
          {allowsRemoving && (
            <Button slot="remove" className="tag-remove-btn">
              <X size={14} />
            </Button>
          )}
        </>
      )}
    </AriaTag>
  );
}
