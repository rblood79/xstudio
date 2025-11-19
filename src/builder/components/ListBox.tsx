/**
 * ListBox Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
  composeRenderProps
} from "react-aria-components";
import { tv } from 'tailwind-variants';
import type { ListBoxVariant, ComponentSize } from '../types/componentVariants';
import type { DataBinding, ColumnMapping } from "../../types/builder/unified.types";
import { useCollectionData } from "../hooks/useCollectionData";

import "./styles/ListBox.css";

interface ExtendedListBoxProps<T extends object> extends ListBoxProps<T> {
  dataBinding?: DataBinding;
  columnMapping?: ColumnMapping;
  // M3 props
  variant?: ListBoxVariant;
  size?: ComponentSize;
}

const listBoxStyles = tv({
  base: 'react-aria-ListBox',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export function ListBox<T extends object>({
  children,
  dataBinding,
  columnMapping,
  variant = 'primary',
  size = 'md',
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

  // ListBox className generator (reused across all conditional renders)
  const getListBoxClassName = (baseClassName?: string) =>
    composeRenderProps(
      baseClassName,
      (className, renderProps) => {
        return listBoxStyles({
          ...renderProps,
          variant,
          size,
          className,
        });
      }
    );

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
        <AriaListBox {...props} className={getListBoxClassName(props.className)}>
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
        <AriaListBox {...props} className={getListBoxClassName(props.className)}>
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
        <AriaListBox {...props} className={getListBoxClassName(props.className)} items={items}>
          {children}
        </AriaListBox>
      );
    }

    // 데이터 없음
    return (
      <AriaListBox {...props} className={getListBoxClassName(props.className)}>
        {children}
      </AriaListBox>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaListBox {...props} className={getListBoxClassName(props.className)}>
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
        <AriaListBox {...props} className={getListBoxClassName(props.className)}>
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
        <AriaListBox {...props} className={getListBoxClassName(props.className)} items={items}>
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
    <AriaListBox {...props} className={getListBoxClassName(props.className)}>
      {children}
    </AriaListBox>
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className="react-aria-ListBoxItem" />;
}
