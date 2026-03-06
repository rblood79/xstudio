import { createContext, useContext, type ReactNode } from "react";
import {
  ToggleButton as RACToggleButton,
  ToggleButtonGroup as RACToggleButtonGroup,
  ToggleButtonGroupProps,
  composeRenderProps,
} from "react-aria-components";
import type {
  DataBinding,
  ColumnMapping,
  DataBindingValue,
  ComponentSizeSubset,
} from "../types";
import { useCollectionData } from "../hooks";
import "./styles/ToggleButtonGroup.css";

// ToggleButtonGroup용 Context - indicator 상태 공유
export const ToggleButtonGroupIndicatorContext = createContext(false);

// ToggleButton에서 indicator 컨텍스트 사용
export function useToggleButtonGroupIndicator() {
  return useContext(ToggleButtonGroupIndicatorContext);
}

export interface ToggleButtonGroupExtendedProps extends ToggleButtonGroupProps {
  indicator?: boolean;
  /**
   * Emphasize the toggle button group with accent color (S2)
   * @default false
   */
  isEmphasized?: boolean;
  /**
   * Quiet variant (reduced visual weight) (S2)
   * @default false
   */
  isQuiet?: boolean;
  /**
   * Size for child ToggleButton buttons
   * @default 'md'
   */
  size?: ComponentSizeSubset;
  // 데이터 바인딩
  dataBinding?: DataBinding | DataBindingValue;
  columnMapping?: ColumnMapping;
}

/**
 * S2 variant 전환: isEmphasized / isQuiet data-* 패턴
 * - data-emphasized: accent color 강조 (선택 시)
 * - data-quiet: 배경 없는 quiet 스타일
 * - data-togglebutton-size: 크기 (그룹 컨텍스트)
 */
export function ToggleButtonGroup({
  indicator = false,
  isEmphasized = false,
  isQuiet = false,
  size = "md",
  dataBinding,
  columnMapping,
  children,
  ...props
}: ToggleButtonGroupExtendedProps) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: "ToggleButtonGroup",
    fallbackData: [
      { id: 1, name: "Button 1", value: "button-1" },
      { id: 2, name: "Button 2", value: "button-2" },
    ],
  });

  // React Aria 1.13.0: SelectionIndicator로 대체 (MutationObserver 제거)

  // DataBinding이 있고 데이터가 로드되었을 때 동적 ToggleButton 생성
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

  const toggleButtonGroupClassName = composeRenderProps(
    props.className,
    (cls) =>
      cls
        ? `react-aria-ToggleButtonGroup ${cls}`
        : "react-aria-ToggleButtonGroup",
  );

  // ColumnMapping이 있으면 각 데이터 항목마다 ToggleButton 렌더링
  // ListBox와 동일한 패턴
  if (hasDataBinding && columnMapping) {
    console.log(
      "🎯 ToggleButtonGroup: columnMapping 감지 - 데이터로 ToggleButton 렌더링",
      {
        columnMapping,
        hasChildren: !!children,
        dataCount: boundData.length,
      },
    );

    // Loading 상태
    if (loading) {
      return (
        <RACToggleButtonGroup
          {...props}
          data-indicator={indicator ? "true" : "false"}
          data-togglebutton-emphasized={isEmphasized ? "true" : "false"}
          data-togglebutton-quiet={isQuiet ? "true" : "false"}
          data-togglebutton-size={size}
          className={toggleButtonGroupClassName}
          isDisabled
        >
          <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
            <RACToggleButton className="react-aria-ToggleButton button-base">
              ⏳ 로딩 중...
            </RACToggleButton>
          </ToggleButtonGroupIndicatorContext.Provider>
        </RACToggleButtonGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <RACToggleButtonGroup
          {...props}
          data-indicator={indicator ? "true" : "false"}
          data-togglebutton-emphasized={isEmphasized ? "true" : "false"}
          data-togglebutton-quiet={isQuiet ? "true" : "false"}
          data-togglebutton-size={size}
          className={toggleButtonGroupClassName}
          isDisabled
        >
          <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
            <RACToggleButton className="react-aria-ToggleButton button-base">
              ❌ 오류
            </RACToggleButton>
          </ToggleButtonGroupIndicatorContext.Provider>
        </RACToggleButtonGroup>
      );
    }

    // 데이터가 있을 때: children 템플릿 사용
    if (boundData.length > 0) {
      console.log(
        "✅ ToggleButtonGroup with columnMapping - using children template",
      );

      return (
        <RACToggleButtonGroup
          {...props}
          data-indicator={indicator ? "true" : "false"}
          data-togglebutton-emphasized={isEmphasized ? "true" : "false"}
          data-togglebutton-quiet={isQuiet ? "true" : "false"}
          data-togglebutton-size={size}
          className={toggleButtonGroupClassName}
        >
          <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
            {children as ReactNode}
          </ToggleButtonGroupIndicatorContext.Provider>
        </RACToggleButtonGroup>
      );
    }

    // 데이터 없음
    return (
      <RACToggleButtonGroup
        {...props}
        data-indicator={indicator ? "true" : "false"}
        data-emphasized={isEmphasized || undefined}
        data-quiet={isQuiet || undefined}
        data-togglebutton-size={size}
        className={toggleButtonGroupClassName}
      >
        <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
          {children as ReactNode}
        </ToggleButtonGroupIndicatorContext.Provider>
      </RACToggleButtonGroup>
    );
  }

  // Dynamic Collection: 동적으로 ToggleButton 생성 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <RACToggleButtonGroup
          {...props}
          data-indicator={indicator ? "true" : "false"}
          data-togglebutton-emphasized={isEmphasized ? "true" : "false"}
          data-togglebutton-quiet={isQuiet ? "true" : "false"}
          data-togglebutton-size={size}
          className={toggleButtonGroupClassName}
          isDisabled
        >
          <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
            <RACToggleButton className="react-aria-ToggleButton button-base">
              ⏳ 로딩 중...
            </RACToggleButton>
          </ToggleButtonGroupIndicatorContext.Provider>
        </RACToggleButtonGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <RACToggleButtonGroup
          {...props}
          data-indicator={indicator ? "true" : "false"}
          data-togglebutton-emphasized={isEmphasized ? "true" : "false"}
          data-togglebutton-quiet={isQuiet ? "true" : "false"}
          data-togglebutton-size={size}
          className={toggleButtonGroupClassName}
          isDisabled
        >
          <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
            <RACToggleButton className="react-aria-ToggleButton button-base">
              ❌ 오류
            </RACToggleButton>
          </ToggleButtonGroupIndicatorContext.Provider>
        </RACToggleButtonGroup>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const buttonItems = boundData.map((item, index) => ({
        id: String(item.id || item.value || index),
        label: String(
          item.name || item.title || item.label || `Button ${index + 1}`,
        ),
        isDisabled: Boolean(item.isDisabled),
      }));

      console.log(
        "✅ ToggleButtonGroup Dynamic Collection - items:",
        buttonItems,
      );

      return (
        <RACToggleButtonGroup
          {...props}
          data-indicator={indicator ? "true" : "false"}
          data-togglebutton-emphasized={isEmphasized ? "true" : "false"}
          data-togglebutton-quiet={isQuiet ? "true" : "false"}
          data-togglebutton-size={size}
          className={toggleButtonGroupClassName}
        >
          <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
            {buttonItems.map((item) => (
              <RACToggleButton
                key={item.id}
                id={item.id}
                isDisabled={item.isDisabled}
                className="react-aria-ToggleButton button-base"
              >
                {item.label}
              </RACToggleButton>
            ))}
          </ToggleButtonGroupIndicatorContext.Provider>
        </RACToggleButtonGroup>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <RACToggleButtonGroup
      {...props}
      data-indicator={indicator ? "true" : "false"}
      data-emphasized={isEmphasized || undefined}
      data-quiet={isQuiet || undefined}
      data-togglebutton-size={size}
      className={toggleButtonGroupClassName}
    >
      <ToggleButtonGroupIndicatorContext.Provider value={indicator}>
        {children as ReactNode}
      </ToggleButtonGroupIndicatorContext.Provider>
    </RACToggleButtonGroup>
  );
}
