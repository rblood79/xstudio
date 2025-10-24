import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
} from "react-aria-components";
import type { DataBinding, ColumnMapping } from "../../types/unified";
import { useCollectionData } from "../hooks/useCollectionData";

import "./styles/ListBox.css";

interface ExtendedListBoxProps<T extends object> extends ListBoxProps<T> {
  dataBinding?: DataBinding;
  columnMapping?: ColumnMapping;
}

export function ListBox<T extends object>({
  children,
  dataBinding,
  columnMapping,
  ...props
}: ExtendedListBoxProps<T>) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding,
    componentName: "ListBox",
    fallbackData: [
      { id: 1, name: "User 1", email: "user1@example.com", role: "Admin" },
      { id: 2, name: "User 2", email: "user2@example.com", role: "User" },
    ],
  });

  // DataBinding이 있고 데이터가 로드되었을 때 동적 아이템 생성
  const hasDataBinding = dataBinding?.type === "collection";

  // ColumnMapping이 있으면 각 데이터 항목마다 ListBoxItem 렌더링
  // Table과 동일한 패턴: Element tree의 ListBoxItem 템플릿 + Field 자식 사용
  if (hasDataBinding && columnMapping) {
    console.log("🎯 ListBox: columnMapping 감지 - 데이터로 아이템 렌더링", {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaListBox {...props} className="react-aria-ListBox">
          <AriaListBoxItem
            key="loading"
            value={{}}
            isDisabled
            className="react-aria-ListBoxItem"
          >
            ⏳ 데이터 로딩 중...
          </AriaListBoxItem>
        </AriaListBox>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaListBox {...props} className="react-aria-ListBox">
          <AriaListBoxItem
            key="error"
            value={{}}
            isDisabled
            className="react-aria-ListBoxItem"
          >
            ❌오류: {error}
          </AriaListBoxItem>
        </AriaListBox>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (boundData.length > 0) {
      const items = boundData.map((item, index) => ({
        id: String(item.id || index),
        ...item,
      })) as T[];

      console.log("✅ ListBox with columnMapping - items:", items);

      return (
        <AriaListBox {...props} className="react-aria-ListBox" items={items}>
          {children}
        </AriaListBox>
      );
    }

    // 데이터 없음
    return (
      <AriaListBox {...props} className="react-aria-ListBox">
        {children}
      </AriaListBox>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaListBox {...props} className="react-aria-ListBox">
          <AriaListBoxItem
            key="loading"
            value={{}}
            isDisabled
            className="react-aria-ListBoxItem"
          >
            ⏳ 데이터 로딩 중...
          </AriaListBoxItem>
        </AriaListBox>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaListBox {...props} className="react-aria-ListBox">
          <AriaListBoxItem
            key="error"
            value={{}}
            isDisabled
            className="react-aria-ListBoxItem"
          >
            ❌오류: {error}
          </AriaListBoxItem>
        </AriaListBox>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const items = boundData.map((item, index) => ({
        id: String(item.id || index),
        label: String(
          item.name || item.title || item.label || `Item ${index + 1}`
        ),
        ...item,
      }));

      console.log("✅ ListBox Dynamic Collection - items:", items);

      return (
        <AriaListBox {...props} className="react-aria-ListBox" items={items}>
          {(item) => (
            <AriaListBoxItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="react-aria-ListBoxItem"
            >
              {item.label}
            </AriaListBoxItem>
          )}
        </AriaListBox>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <AriaListBox {...props} className="react-aria-ListBox">
      {children}
    </AriaListBox>
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
